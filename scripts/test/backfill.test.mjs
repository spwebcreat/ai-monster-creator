// scripts/backfill-all-monsters.mjs の試験（偽の KV に向け、画像の HEAD は差し替える・外へは出ない）
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { BLOB_ORIGIN, idOf, makeMonster, useFakeKv } from './helpers.mjs';
import { WRITE_COMMANDS } from './fakeKvServer.mjs';

const fake = await useFakeKv();
const { kv } = await import('@vercel/kv');
const { backfillAllMonsters } = await import('../lib/backfillAllMonsters.mjs');

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const keyOf = (n) => `monster:${idOf(n)}`;
const FILLERS = Array.from({ length: 600 }, (_, i) => 100 + i);
// 2024-09-07 から 30 時間おき（2026-09 まで・すべて過去の日時）に散らす
const fillerCreatedAt = (n) => new Date(Date.UTC(2024, 8, 7) + (n - 100) * 30 * 60 * 60 * 1000).toISOString();

// 本番の KV に残るデータの形を真似た下準備。戻り値は入るはずのキーと score
function seedStore() {
  const expected = new Map();
  const put = (key, monster, { include = false } = {}) => {
    fake.setString(key, JSON.stringify(monster));
    if (include) expected.set(key, Date.parse(monster.createdAt));
  };
  for (const n of FILLERS) put(keyOf(n), makeMonster(n, { createdAt: fillerCreatedAt(n) }), { include: true });
  put(keyOf(1), makeMonster(1, { createdAt: '2024-09-07T10:00:00.000Z' }), { include: true });
  // 日本時間では 2024-11 になる
  put(keyOf(2), makeMonster(2, { createdAt: '2024-10-31T20:00:00.000Z' }), { include: true });
  // POST で既に索引に入っている
  put(keyOf(3), makeMonster(3), { include: true });
  fake.zadd('all_monsters', Date.parse(makeMonster(3).createdAt), keyOf(3));
  // 検証で外す: 画像の保存先が古い／職業が無い／id が UUID でない／文字列以外の型／JSON でない／キーと id の食い違い
  put(keyOf(4), makeMonster(4, { imageUrl: 'https://api-images-getimg.example.com/old/4.png' }));
  put(keyOf(5), makeMonster(5, { job: undefined }));
  put('monster:not-a-uuid', makeMonster(6, { id: 'not-a-uuid' }));
  fake.setHash(keyOf(10), { id: idOf(10) });
  fake.setString(keyOf(11), 'garbage');
  put(keyOf(12), makeMonster(13));
  // 過去データの形: 属性が旧い名前（英名）は外す。性別が属性の英名・特徴が長い／無い・ミリ秒の無い日時は入れる
  put(keyOf(18), makeMonster(18, { attribute: 'Fire' }));
  put(keyOf(15), makeMonster(15, { gender: 'Holy' }), { include: true });
  put(keyOf(16), makeMonster(16, { description: 'あ'.repeat(335) }), { include: true });
  put(keyOf(17), makeMonster(17, { description: undefined }), { include: true });
  put(keyOf(19), makeMonster(19, { createdAt: '2024-09-07T10:00:00Z' }), { include: true });
  // 作成日時が範囲外（日付として表せる最大の値）。外し、年月の集計は「不明」に入れて止まらない
  put(keyOf(20), makeMonster(20, { createdAt: '+275760-09-13T00:00:00.000Z' }));
  // 一覧から外したもの
  put(keyOf(7), makeMonster(7));
  fake.setHash('hidden_monsters', { [idOf(7)]: JSON.stringify({ hiddenAt: 1, score: 2 }) });
  // 画像が無い（HEAD が 404）／通信できない／1 回目だけ失敗して 2 回目に届く
  put(keyOf(8), makeMonster(8, { imageUrl: `${BLOB_ORIGIN}/monsters/8-missing.png` }));
  put(keyOf(9), makeMonster(9, { imageUrl: `${BLOB_ORIGIN}/monsters/9-unreachable.png` }));
  put(keyOf(14), makeMonster(14, { imageUrl: `${BLOB_ORIGIN}/monsters/14-flaky.png` }), { include: true });
  // 触ってはいけないほかのキー
  fake.zadd('recent_monsters', 1_700_000_000_000, keyOf(3));
  fake.setString('generation_count:2026-10-16', '42');
  return expected;
}

// 画像の HEAD の差し替え。呼ばれた内容を記録する
function stubFetch() {
  const calls = [];
  const flakyAttempts = new Map();
  const fetchStub = async (url, init) => {
    calls.push({ url, method: init?.method });
    if (url.includes('unreachable')) throw new TypeError('fetch failed');
    if (url.includes('flaky')) {
      const count = (flakyAttempts.get(url) ?? 0) + 1;
      flakyAttempts.set(url, count);
      if (count === 1) throw new TypeError('fetch failed');
    }
    return new Response(null, { status: url.includes('missing') ? 404 : 200 });
  };
  return { calls, fetchStub };
}

const writes = () => fake.commands.filter(([name]) => WRITE_COMMANDS.has(name));
const snapshotWithout = (key) => JSON.stringify(JSON.parse(fake.snapshot()).filter(([name]) => name !== key));

beforeEach(() => fake.clear());
after(() => fake.close());

describe('backfillAllMonsters', () => {
  test('試し実行は何も書かず、件数・年月ごとの内訳・外す理由の例を出す', async () => {
    seedStore();
    const before = fake.snapshot();
    const lines = [];
    const { calls, fetchStub } = stubFetch();
    const summary = await backfillAllMonsters({ kv, fetch: fetchStub, log: (line) => lines.push(line) });

    assert.deepEqual(writes(), []);
    assert.equal(fake.snapshot(), before);
    assert.equal(summary.total, 619);
    assert.equal(summary.add, 608);
    assert.equal(summary.alreadyIndexed, 1);
    assert.equal(summary.invalid, 8);
    assert.equal(summary.hidden, 1);
    assert.equal(summary.image, 2);
    assert.deepEqual(
      Object.fromEntries(['imageUrl', 'job', 'attribute', 'createdAt', 'id', 'missing', 'unreadable', 'key_mismatch', 'hidden', 'image_status', 'image_unreachable']
        .map((reason) => [reason, summary.excluded.filter((item) => item.reason === reason).map((item) => item.key)])),
      {
        imageUrl: [keyOf(4)],
        job: [keyOf(5)],
        attribute: [keyOf(18)],
        createdAt: [keyOf(20)],
        id: ['monster:not-a-uuid'],
        missing: [keyOf(10)],
        unreadable: [keyOf(11)],
        key_mismatch: [keyOf(12)],
        hidden: [keyOf(7)],
        image_status: [keyOf(8)],
        image_unreachable: [keyOf(9)],
      }
    );
    assert.equal(summary.months['2024-11'].add >= 1, true);
    assert.deepEqual(summary.months['不明'], { total: 3, add: 0 });
    assert.equal(Object.values(summary.months).reduce((sum, row) => sum + row.total, 0), 619);
    assert.equal(Object.values(summary.months).reduce((sum, row) => sum + row.add, 0), 608);

    const output = lines.join('\n');
    assert.match(output, /全件（monster:\*）: 619/);
    assert.match(output, /入れる: 608（うち既に索引にある: 1）/);
    assert.match(output, /条件に合わず外す: 8/);
    assert.match(output, /画像が無くて外す: 2/);
    assert.match(output, /host=api-images-getimg\.example\.com/);
    assert.match(output, /status=404/);
    assert.match(output, /試し実行のため書き込んでいない/);
    // 利用者が書いた特徴の本文・接続先・鍵は出さない
    assert.ok(!output.includes('テスト'));
    assert.ok(!output.includes(fake.url) && !output.includes(fake.token));

    // HEAD だけを、画像の保存先にだけ送る（通信できない時は 1 回だけ試し直す）
    assert.ok(calls.every((call) => call.method === 'HEAD' && call.url.startsWith(`${BLOB_ORIGIN}/monsters/`)));
    assert.equal(calls.length, 610 + 2);
  });

  test('--apply は all_monsters にだけ ZADD し（score は作成日時）、2 回流しても同じ結果', async () => {
    const expected = seedStore();
    const othersBefore = snapshotWithout('all_monsters');
    const { fetchStub } = stubFetch();
    const summary = await backfillAllMonsters({ kv, fetch: fetchStub, apply: true, log: () => {} });

    assert.equal(summary.indexCount, 608);
    assert.deepEqual(new Set(fake.zmembers('all_monsters')), new Set(expected.keys()));
    for (const [key, score] of expected) assert.equal(fake.zscore('all_monsters', key), score, key);
    assert.equal(snapshotWithout('all_monsters'), othersBefore);
    assert.ok(writes().every(([name, key]) => name === 'zadd' && key === 'all_monsters'));
    // 一覧から外したもの・検証に合わないもの・画像が無いものは入らない
    for (const n of [4, 5, 7, 8, 9, 10, 11, 12, 18, 20]) assert.equal(fake.zscore('all_monsters', keyOf(n)), null, `monster ${n}`);

    const afterFirst = fake.snapshot();
    await backfillAllMonsters({ kv, fetch: stubFetch().fetchStub, apply: true, log: () => {} });
    assert.equal(fake.snapshot(), afterFirst);
  });
});

describe('scripts/backfill-all-monsters.mjs（入口）', () => {
  const run = promisify(execFile);
  const node = process.execPath;
  const script = path.join(ROOT, 'scripts/backfill-all-monsters.mjs');
  const stub = path.join(ROOT, 'scripts/test/stubImageHead.mjs');
  const runScript = async (args, env = {}) => {
    try {
      const { stdout, stderr } = await run(node, args, { cwd: ROOT, env: { PATH: process.env.PATH, ...env } });
      return { code: 0, stdout, stderr };
    } catch (error) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr };
    }
  };

  test('--env-file の値で偽の KV に向き、試し実行 → --apply の順に動く。値は表示しない', async () => {
    seedStore();
    const dir = await mkdtemp(path.join(tmpdir(), 'amc-backfill-'));
    const envFile = path.join(dir, '.env.local');
    await writeFile(envFile, `KV_REST_API_URL="${fake.url}"\nKV_REST_API_TOKEN="${fake.token}"\n`);
    try {
      const dryRun = await runScript([`--env-file=${envFile}`, '--import', stub, script]);
      assert.equal(dryRun.code, 0, dryRun.stderr);
      // 差し替えの HEAD は URL に missing を含むものだけ 404（unreachable・flaky は 200 になる）
      assert.match(dryRun.stdout, /入れる: 609（うち既に索引にある: 1）/);
      assert.deepEqual(writes(), []);
      const applied = await runScript([`--env-file=${envFile}`, '--import', stub, script, '--apply']);
      assert.equal(applied.code, 0, applied.stderr);
      assert.match(applied.stdout, /書き込み完了: 609 件を all_monsters へ ZADD（索引の件数: 609）/);
      for (const output of [dryRun.stdout + dryRun.stderr, applied.stdout + applied.stderr]) {
        assert.ok(!output.includes(fake.url) && !output.includes(fake.token));
        assert.ok(!output.includes('MODULE_TYPELESS_PACKAGE_JSON'));
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('環境変数が無い・知らない引数は書き込まずに止まる。KV の失敗は 1 で終わり、値は表示しない', async () => {
    const missing = await runScript([script]);
    assert.equal(missing.code, 2);
    assert.match(missing.stderr, /KV_REST_API_URL と KV_REST_API_TOKEN が読めません/);
    const env = { KV_REST_API_URL: fake.url, KV_REST_API_TOKEN: fake.token };
    const unknown = await runScript([script, '--aply'], env);
    assert.equal(unknown.code, 2);
    assert.match(unknown.stderr, /知らない引数です: --aply/);
    fake.setFailing(true);
    try {
      const failed = await runScript(['--import', stub, script], env);
      assert.equal(failed.code, 1);
      assert.match(failed.stderr, /失敗しました/);
      assert.ok(!(failed.stdout + failed.stderr).includes(fake.token));
      assert.ok(!(failed.stdout + failed.stderr).includes(fake.url));
    } finally {
      fake.setFailing(false);
    }
    assert.deepEqual(writes(), []);
  });
});
