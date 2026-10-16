// 一覧の索引（KV の sorted set）と、一覧から外したものの記録の決まりごと。
// /api/monsters・管理の窓口・索引を作るスクリプトで共有する（スクリプトが Node から直接読むため KV には依存させない）

// 全件の索引。要素は monster:<id>、score は作成日時のミリ秒（新しい順に読む）
export const ALL_MONSTERS_KEY = 'all_monsters';

// 最新 12 件の索引（score は保存した時刻）。all_monsters を作る前の一覧の読み出し先として残す
export const RECENT_MONSTERS_KEY = 'recent_monsters';
export const RECENT_MONSTERS_MAX = 12;

// 一覧から外したもの（hash: id → { hiddenAt, score }）。monster:<id> と画像は消さない
export const HIDDEN_MONSTERS_KEY = 'hidden_monsters';

// GET /api/monsters の 1 回に返す件数の既定と上限
export const MONSTERS_PAGE_SIZE = 13;
export const MONSTERS_PAGE_SIZE_MAX = 24;

// all_monsters の score。作成日時は利用者側で付く値のため、未来の日時で先頭に居座れないよう今の時刻で頭打ちにする
export function toIndexScore(createdAt: string, now = Date.now()): number {
  return Math.min(Date.parse(createdAt), now);
}

// 0 以上の整数（9 桁まで）だけを数として読む。それ以外は既定の値に戻す
const readNonNegativeInt = (value: string | null, fallback: number) =>
  value !== null && /^\d{1,9}$/.test(value) ? Number(value) : fallback;

// ?offset=&limit= を読む。数でない・負の値は既定に戻し、limit は 1〜上限に収める
export function parsePaging(searchParams: URLSearchParams): { offset: number; limit: number } {
  const offset = readNonNegativeInt(searchParams.get('offset'), 0);
  const limit = readNonNegativeInt(searchParams.get('limit'), MONSTERS_PAGE_SIZE);
  return { offset, limit: Math.min(Math.max(limit, 1), MONSTERS_PAGE_SIZE_MAX) };
}
