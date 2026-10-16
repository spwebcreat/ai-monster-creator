// all_monsters（一覧の全件の索引）を、KV に残る monster:* から作る本体。
// 入口は scripts/backfill-all-monsters.mjs。試験（scripts/test/）からは KV と fetch を差し替えて直接呼ぶ。
// 入れる条件は一覧の読み出し（GET /api/monsters）と同じ「一覧に出す条件」（src/app/lib/monsterRecord.ts の checkListedMonster）。
// 保存（POST）の検証より緩く、性別と特徴は問わない。
// 書き込むのは apply の時の all_monsters への ZADD だけ（ほかのキーは変えない・何度流しても同じ結果）。
// 読み込むには先に ./registerSrcAlias.mjs を import しておく
import { checkStoredMonster } from '@/app/lib/monsterRecord';
import { ALL_MONSTERS_KEY, HIDDEN_MONSTERS_KEY, toIndexScore } from '@/app/lib/monsterIndex';

const SCAN_COUNT = 500;
const MGET_BATCH = 100;
const ZADD_BATCH = 100;
const HEAD_CONCURRENCY = 8;
const HEAD_TIMEOUT_MS = 10_000;
const EXAMPLES_PER_REASON = 3;

// 外す理由の表示名と、どの区分で数えるか
const REASONS = {
  missing: { group: 'invalid', label: '値が無い（文字列以外の型を含む）' },
  unreadable: { group: 'invalid', label: '値が JSON として読めない' },
  not_object: { group: 'invalid', label: '値がオブジェクトでない' },
  id: { group: 'invalid', label: 'id が UUID でない' },
  imageUrl: { group: 'invalid', label: '画像の URL が今の保存先の形でない' },
  createdAt: { group: 'invalid', label: '作成日時が読めない・範囲外（2024-01-01〜今＋1 日）' },
  job: { group: 'invalid', label: '職業が今の一覧に無い（項目が無いものを含む）' },
  attribute: { group: 'invalid', label: '属性が今の属性名（日本語）に無い' },
  type: { group: 'invalid', label: 'タイプが今の一覧に無い' },
  key_mismatch: { group: 'invalid', label: 'キーと中身の id が食い違う' },
  hidden: { group: 'hidden', label: '一覧から外したもの（hidden_monsters）' },
  image_status: { group: 'image', label: '画像の HEAD が 200 以外' },
  image_unreachable: { group: 'image', label: '画像に通信できない（2 回試して失敗）' },
};

const short = (value, max = 40) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

const toObject = (value) => {
  if (typeof value !== 'string') return value && typeof value === 'object' ? value : null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

// 外す理由の例に添える一言（利用者が書いた特徴の本文は出さない）
function describeReason(reason, body, extra) {
  switch (reason) {
    case 'imageUrl': {
      const url = body?.imageUrl;
      try {
        const parsed = new URL(url);
        return `host=${parsed.hostname} path=${short(parsed.pathname, 24)}`;
      } catch {
        return `imageUrl=${short(url)}`;
      }
    }
    case 'id':
    case 'attribute':
    case 'type':
    case 'job':
    case 'createdAt':
      return `${reason}=${short(body?.[reason])}`;
    case 'key_mismatch':
      return `id=${short(body?.id)}`;
    case 'image_status':
      return `status=${extra}`;
    case 'image_unreachable':
      return `error=${extra}`;
    default:
      return '';
  }
}

// 作成日時の年月（日本時間）。読めない・日付として表せない値は「不明」（範囲外の値でも集計を止めない）
function toMonth(body) {
  const time = typeof body?.createdAt === 'string' ? Date.parse(body.createdAt) : NaN;
  const date = new Date(time + 9 * 60 * 60 * 1000);
  return Number.isNaN(date.getTime()) ? '不明' : date.toISOString().slice(0, 7);
}

// SCAN でキーを全部集める（@vercel/kv の scanIterator は戻るカーソルが文字列だと終わらないため自前で回す）
async function scanKeys(kv, match) {
  const keys = new Set();
  let cursor = '0';
  do {
    const [nextCursor, batch] = await kv.scan(cursor, { match, count: SCAN_COUNT });
    for (const key of batch) keys.add(String(key));
    cursor = String(nextCursor);
  } while (cursor !== '0');
  return [...keys].sort();
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

// 画像の URL に HEAD を送る。通信できない時は 1 回だけ試し直す。転送には付いて行かない（200 以外として扱う）
async function headImage(fetchFn, url) {
  let lastError = 'Error';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchFn(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
      });
      return { status: response.status };
    } catch (error) {
      lastError = error?.name ?? 'Error';
    }
  }
  return { error: lastError };
}

export async function backfillAllMonsters({ kv, fetch: fetchFn, apply = false, log = console.log, now = Date.now() }) {
  log(`all_monsters の索引づくり（${apply ? '書き込みあり' : '試し実行・書き込みはしない'}）`);

  const hiddenIds = new Set((await kv.hkeys(HIDDEN_MONSTERS_KEY)).map(String));
  const alreadyIndexed = new Set((await kv.zrange(ALL_MONSTERS_KEY, 0, -1)).map(String));
  const keys = await scanKeys(kv, 'monster:*');
  log(`monster:* を読み込み中: ${keys.length} 件`);

  const excluded = [];
  const candidates = [];
  const months = new Map();
  const countMonth = (month, field) => {
    const row = months.get(month) ?? { total: 0, add: 0 };
    row[field] += 1;
    months.set(month, row);
  };

  for (let start = 0; start < keys.length; start += MGET_BATCH) {
    const batch = keys.slice(start, start + MGET_BATCH);
    const values = await kv.mget(...batch);
    batch.forEach((key, index) => {
      const body = toObject(values[index]);
      const month = toMonth(body);
      countMonth(month, 'total');
      const result = checkStoredMonster(key, values[index], now);
      if ('reason' in result) {
        excluded.push({ key, reason: result.reason, detail: describeReason(result.reason, body) });
      } else if (hiddenIds.has(result.monster.id)) {
        excluded.push({ key, reason: 'hidden', detail: '' });
      } else {
        candidates.push({ key, monster: result.monster, month });
      }
    });
  }

  log(`画像の有無を確かめ中（HEAD・同時 ${HEAD_CONCURRENCY} 本）: ${candidates.length} 件`);
  const heads = await mapWithConcurrency(candidates, HEAD_CONCURRENCY, async (candidate, index) => {
    const result = await headImage(fetchFn, candidate.monster.imageUrl);
    if ((index + 1) % 100 === 0) log(`  ${index + 1} / ${candidates.length}`);
    return result;
  });

  const toAdd = [];
  candidates.forEach((candidate, index) => {
    const head = heads[index];
    if (head.status === 200) {
      toAdd.push({ score: toIndexScore(candidate.monster.createdAt, now), member: candidate.key });
      countMonth(candidate.month, 'add');
    } else if (head.error) {
      excluded.push({ key: candidate.key, reason: 'image_unreachable', detail: describeReason('image_unreachable', null, head.error) });
    } else {
      excluded.push({ key: candidate.key, reason: 'image_status', detail: describeReason('image_status', null, head.status) });
    }
  });

  const countGroup = (group) => excluded.filter((item) => REASONS[item.reason].group === group).length;
  const summary = {
    total: keys.length,
    add: toAdd.length,
    alreadyIndexed: toAdd.filter((item) => alreadyIndexed.has(item.member)).length,
    invalid: countGroup('invalid'),
    hidden: countGroup('hidden'),
    image: countGroup('image'),
    toAdd,
    excluded,
    months: Object.fromEntries([...months].sort(([a], [b]) => a.localeCompare(b))),
  };

  log('');
  log(`全件（monster:*）: ${summary.total}`);
  log(`  入れる: ${summary.add}（うち既に索引にある: ${summary.alreadyIndexed}）`);
  log(`  条件に合わず外す: ${summary.invalid}`);
  log(`  画像が無くて外す: ${summary.image}`);
  log(`  一覧から外したもの: ${summary.hidden}`);

  log('');
  log('年月ごとの内訳（作成日時・日本時間）: 年月 / 全件 / 入れる / 外す');
  for (const [month, row] of Object.entries(summary.months)) {
    log(`  ${month}  ${row.total} / ${row.add} / ${row.total - row.add}`);
  }

  if (excluded.length > 0) {
    log('');
    log(`外す理由（理由ごとに ${EXAMPLES_PER_REASON} 件まで例を出す）`);
    for (const [reason, { label }] of Object.entries(REASONS)) {
      const items = excluded.filter((item) => item.reason === reason);
      if (items.length === 0) continue;
      log(`  ${reason}（${label}）: ${items.length} 件`);
      for (const item of items.slice(0, EXAMPLES_PER_REASON)) {
        log(`    ${item.key}${item.detail ? `  ${item.detail}` : ''}`);
      }
    }
  }

  log('');
  if (!apply) {
    log('試し実行のため書き込んでいない。書き込む時は --apply を付けて流す');
    return summary;
  }

  for (let start = 0; start < toAdd.length; start += ZADD_BATCH) {
    const [first, ...rest] = toAdd.slice(start, start + ZADD_BATCH);
    await kv.zadd(ALL_MONSTERS_KEY, first, ...rest);
  }
  summary.indexCount = await kv.zcard(ALL_MONSTERS_KEY);
  log(`書き込み完了: ${toAdd.length} 件を all_monsters へ ZADD（索引の件数: ${summary.indexCount}）`);
  return summary;
}
