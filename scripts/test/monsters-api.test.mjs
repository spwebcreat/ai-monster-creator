// GET・POST /api/monsters と getMonsters の試験（偽の KV に向ける・本番の KV には触れない）
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { BLOB_ORIGIN, idOf, importSrc, makeMonster, useFakeKv } from './helpers.mjs';

const fake = await useFakeKv();
const { GET, POST } = await importSrc('app/api/monsters/route.ts');
const { getGenerationCountKey } = await importSrc('app/lib/generationLimit.ts');

const keyOf = (n) => `monster:${idOf(n)}`;
const seed = (n, { all = true, recent = false, monster = makeMonster(n) } = {}) => {
  fake.setString(keyOf(n), JSON.stringify(monster));
  if (all) fake.zadd('all_monsters', Date.parse(monster.createdAt), keyOf(n));
  if (recent) fake.zadd('recent_monsters', 1_700_000_000_000 + n, keyOf(n));
};
const get = async (query = '') => {
  const response = await GET(new Request(`http://localhost/api/monsters${query}`));
  assert.equal(response.status, 200);
  return response.json();
};
const post = (body) => POST(new Request('http://localhost/api/monsters', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
}));
const ids = (monsters) => monsters.map((monster) => monster.id);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

beforeEach(() => fake.clear());
after(() => fake.close());

describe('GET /api/monsters', () => {
  test('all_monsters を新しい順に、既定 13 件ずつ読み、nextOffset は索引上の位置を返す', async () => {
    for (const n of range(1, 30)) seed(n, { recent: n > 18 });
    const first = await get();
    assert.deepEqual(ids(first.monsters), range(18, 30).reverse().map(idOf));
    assert.equal(first.nextOffset, 13);
    const second = await get('?offset=13&limit=13');
    assert.deepEqual(ids(second.monsters), range(5, 17).reverse().map(idOf));
    assert.equal(second.nextOffset, 26);
    const last = await get('?offset=26&limit=13');
    assert.deepEqual(ids(last.monsters), range(1, 4).reverse().map(idOf));
    assert.equal(last.nextOffset, null);
    const beyond = await get('?offset=40');
    assert.deepEqual(beyond.monsters, []);
    assert.equal(beyond.nextOffset, null);
  });

  test('limit は上限 24・下限 1 に収め、数でない・負の値は既定に戻す', async () => {
    for (const n of range(1, 30)) seed(n);
    assert.equal((await get('?limit=100')).monsters.length, 24);
    assert.equal((await get('?limit=100')).nextOffset, 24);
    assert.equal((await get('?limit=0')).monsters.length, 1);
    assert.equal((await get('?limit=abc')).monsters.length, 13);
    const negative = await get('?offset=-5&limit=2.5');
    assert.deepEqual(ids(negative.monsters), range(18, 30).reverse().map(idOf));
    assert.equal((await get('?offset=1e3')).nextOffset, 13);
  });

  test('読めない・検証に合わないデータは飛ばし、nextOffset は索引上の位置のまま', async () => {
    for (const n of range(1, 5)) seed(n);
    // 2: 値が無い／3: 画像が今の保存先でない／4: キーと中身の id が食い違う
    fake.setString(keyOf(2), 'not json');
    fake.setString(keyOf(3), JSON.stringify(makeMonster(3, { imageUrl: 'https://example.com/monsters/3.png' })));
    fake.setString(keyOf(4), JSON.stringify(makeMonster(9)));
    fake.zadd('all_monsters', Date.parse(makeMonster(6).createdAt), keyOf(6)); // 本体が無い
    const page = await get('?limit=4');
    assert.deepEqual(ids(page.monsters), [idOf(5)]);
    assert.equal(page.nextOffset, 4);
    const rest = await get('?offset=4&limit=4');
    assert.deepEqual(ids(rest.monsters), [idOf(1)]);
    assert.equal(rest.nextOffset, null);
  });

  test('過去データの形も一覧に出す条件で読み、性別と特徴は整えて返す', async () => {
    const legacy = [
      [61, { gender: 'Holy' }], // 性別が属性の英名 → 性別を省いて出す
      [62, { description: 'あ'.repeat(335) }], // 長い特徴 → 200 字で切る
      [63, { description: undefined, gender: undefined }], // 特徴・性別が無い
      [64, { createdAt: '2024-09-07T10:00:00Z' }], // ミリ秒の無い日時 → toISOString の形に揃える
      [65, { job: undefined }], // 職業が無い → 出さない
      [66, { attribute: 'Fire' }], // 旧い属性名 → 出さない
      [67, { type: 'Mechanical' }], // 今の一覧に無いタイプ → 出さない
      [68, { createdAt: 'yesterday' }], // 日時として読めない → 出さない
      [69, { extra: '<script>' }], // 余分な項目は返さない
    ];
    for (const [n, overrides] of legacy) {
      fake.setString(keyOf(n), JSON.stringify(makeMonster(n, overrides)));
      fake.zadd('all_monsters', 1_000 + n, keyOf(n));
    }
    const { monsters } = await get('?limit=24');
    assert.deepEqual(ids(monsters), [69, 64, 63, 62, 61].map(idOf));
    const byId = Object.fromEntries(monsters.map((monster) => [monster.id, monster]));
    assert.ok(!('gender' in byId[idOf(61)]));
    assert.equal(byId[idOf(61)].job, 'Warrior');
    assert.equal(Array.from(byId[idOf(62)].description).length, 200);
    assert.equal(byId[idOf(63)].description, '');
    assert.ok(!('gender' in byId[idOf(63)]));
    assert.equal(byId[idOf(64)].createdAt, '2024-09-07T10:00:00.000Z');
    assert.ok(!('extra' in byId[idOf(69)]));
    assert.equal(byId[idOf(69)].gender, 'male');
  });

  test('all_monsters が空なら recent_monsters を読む', async () => {
    for (const n of range(1, 3)) seed(n, { all: false, recent: true });
    const page = await get();
    assert.deepEqual(ids(page.monsters), [idOf(3), idOf(2), idOf(1)]);
    assert.equal(page.nextOffset, null);
  });

  test('all_monsters が recent_monsters より少ない間（索引を作る前）は recent_monsters を読む', async () => {
    for (const n of range(1, 12)) seed(n, { all: false, recent: true });
    seed(13, { all: true, recent: true });
    const page = await get();
    assert.equal(page.monsters.length, 13);
    assert.equal(page.monsters[0].id, idOf(13));
    assert.equal(page.nextOffset, null);
  });

  test('todayCount は上限で頭打ちにする', async () => {
    fake.setString(getGenerationCountKey(), '150');
    assert.equal((await get()).todayCount, 100);
    fake.setString(getGenerationCountKey(), '7');
    assert.equal((await get()).todayCount, 7);
  });

  test('KV が使えない時は空の一覧と nextOffset: null を返す', async () => {
    seed(1);
    fake.setFailing(true);
    try {
      assert.deepEqual(await get(), { monsters: [], todayCount: 0, nextOffset: null });
    } finally {
      fake.setFailing(false);
    }
  });
});

describe('POST /api/monsters', () => {
  test('monster:<id> を保存し、all_monsters（score=作成日時）と recent_monsters の両方に入れる', async () => {
    for (const n of range(1, 12)) seed(n, { recent: true });
    const monster = makeMonster(50);
    const before = Date.now();
    const response = await post(monster);
    assert.equal(response.status, 201);
    assert.deepEqual(JSON.parse(fake.getString(keyOf(50))), monster);
    assert.equal(fake.zscore('all_monsters', keyOf(50)), Date.parse(monster.createdAt));
    assert.ok(fake.zscore('recent_monsters', keyOf(50)) >= before);
    // recent_monsters は最新 12 件に切り詰める（all_monsters は切り詰めない）
    assert.equal(fake.zmembers('recent_monsters').length, 12);
    assert.equal(fake.zmembers('recent_monsters')[0], keyOf(50));
    assert.equal(fake.zmembers('all_monsters').length, 13);
    // 一覧の先頭に出る
    assert.equal((await get()).monsters[0].id, idOf(50));
  });

  test('未来の作成日時は今の時刻で頭打ちにして索引に入れる', async () => {
    const monster = makeMonster(51, { createdAt: '2099-01-01T00:00:00.000Z' });
    const response = await post(monster);
    assert.equal(response.status, 201);
    assert.ok(fake.zscore('all_monsters', keyOf(51)) <= Date.now());
  });

  test('同じ id が既にあれば 409 で、中身も索引も変えない', async () => {
    seed(53, { recent: true });
    const before = fake.snapshot();
    const response = await post(makeMonster(53, { description: '書き換え', createdAt: new Date().toISOString() }));
    assert.equal(response.status, 409);
    assert.equal(fake.snapshot(), before);
  });

  test('一覧から外したモンスターを同じ id で送り直しても一覧に戻らない', async () => {
    seed(54);
    fake.setHash('hidden_monsters', { [idOf(54)]: JSON.stringify({ hiddenAt: 1, score: 2 }) });
    // 外した状態（索引には無く、本体は残っている）
    const removed = JSON.parse(fake.snapshot()).filter(([key]) => key !== 'all_monsters');
    fake.clear();
    for (const [key, type, value] of removed) {
      if (type === 'string') fake.setString(key, value);
      if (type === 'hash') fake.setHash(key, Object.fromEntries(value));
    }
    assert.equal((await post(makeMonster(54))).status, 409);
    assert.equal(fake.zscore('all_monsters', keyOf(54)), null);
    assert.equal(fake.zscore('recent_monsters', keyOf(54)), null);
  });

  test('保存の検証は厳しいまま（過去データの形は 400 で、何も書かない）', async () => {
    const legacyShapes = [
      { gender: 'Holy' },
      { description: 'あ'.repeat(335) },
      { description: undefined },
      { job: undefined },
      { attribute: 'Fire' },
      { createdAt: '2024-09-07T10:00:00Z' },
    ];
    for (const overrides of legacyShapes) {
      assert.equal((await post(makeMonster(70, overrides))).status, 400, JSON.stringify(overrides));
    }
    assert.deepEqual(fake.keys(), []);
  });

  test('検証に合わないものは 400 で、何も書かない', async () => {
    const response = await post(makeMonster(52, { imageUrl: `${BLOB_ORIGIN}/other/52.png` }));
    assert.equal(response.status, 400);
    assert.deepEqual(fake.keys(), []);
  });
});

describe('getMonsters', () => {
  let server;
  let lastUrl;
  before(async () => {
    server = http.createServer(async (req, res) => {
      lastUrl = req.url;
      const response = await GET(new Request(`http://127.0.0.1${req.url}`));
      res.writeHead(response.status, { 'content-type': 'application/json' });
      res.end(await response.text());
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));

  test('既定は offset 0・limit 13 で読み、{ monsters, todayCount, nextOffset } を返す', async () => {
    const { getMonsters } = await importSrc('app/lib/getMonsters.ts');
    for (const n of range(1, 20)) seed(n);
    const first = await getMonsters();
    assert.equal(lastUrl, '/api/monsters?offset=0&limit=13');
    assert.equal(first.monsters.length, 13);
    assert.equal(first.nextOffset, 13);
    assert.equal(first.todayCount, 0);
    const second = await getMonsters({ offset: 13, limit: 24 });
    assert.equal(lastUrl, '/api/monsters?offset=13&limit=24');
    assert.deepEqual(ids(second.monsters), range(1, 7).reverse().map(idOf));
    assert.equal(second.nextOffset, null);
  });

  test('読めない時は空の一覧と nextOffset: null を返す', async () => {
    const { getMonsters } = await importSrc('app/lib/getMonsters.ts');
    const saved = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:9';
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.deepEqual(await getMonsters(), { monsters: [], todayCount: 0, nextOffset: null });
    } finally {
      console.error = originalError;
      process.env.NEXT_PUBLIC_API_URL = saved;
    }
  });
});
