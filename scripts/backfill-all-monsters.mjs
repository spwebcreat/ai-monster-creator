// 一回限り: KV に残る monster:* から、一覧の全件の索引 all_monsters を作る（Node 24 以降）。
//   試し実行（既定・書き込まない）: node --env-file=.env.local scripts/backfill-all-monsters.mjs
//   書き込む:                      node --env-file=.env.local scripts/backfill-all-monsters.mjs --apply
// 接続先は KV_REST_API_URL / KV_REST_API_TOKEN（アプリと同じ・値は表示しない）。
// 一覧に出す条件（GET /api/monsters と同じ）に合い、一覧から外しておらず、画像の HEAD が 200 のものだけを ZADD する。
// 書き込むのは all_monsters だけ（ほかのキーは変えない）。何度流しても同じ結果になる
import './lib/registerSrcAlias.mjs';

const args = process.argv.slice(2);
const unknownArgs = args.filter((arg) => arg !== '--apply');
if (unknownArgs.length > 0) {
  console.error(`知らない引数です: ${unknownArgs.join(' ')}（使えるのは --apply だけ）`);
  process.exit(2);
}

const secrets = [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN];
if (secrets.some((value) => !value)) {
  console.error('KV_REST_API_URL と KV_REST_API_TOKEN が読めません。--env-file=.env.local を付けて実行してください');
  process.exit(2);
}

// エラー文に接続先や鍵が混ざっても表示しない
const redact = (text) => secrets.reduce((result, secret) => result.split(secret).join('***'), String(text));

try {
  const { kv } = await import('@vercel/kv');
  const { backfillAllMonsters } = await import('./lib/backfillAllMonsters.mjs');
  await backfillAllMonsters({ kv, fetch: globalThis.fetch, apply: args.includes('--apply') });
} catch (error) {
  console.error(`失敗しました: ${redact(error instanceof Error ? error.message : error)}`);
  process.exit(1);
}
