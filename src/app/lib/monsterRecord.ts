// 保存するモンスター（KV の monster:<id>）の検証。POST /api/monsters・一覧の読み出し・管理の窓口・
// 索引を作るスクリプト（scripts/backfill-all-monsters.mjs）で共有する。
// スクリプトは Node から直接読むため、このファイルは KV や Next の機能に依存させない
import { validate as isUuid } from 'uuid';
import type { Monster } from '@/app/types/index';
import { isBlobImageUrl } from '@/app/lib/allowedUrl';
import { DESCRIPTION_MAX_LENGTH, GENDERS, JOBS, MONSTER_ATTRIBUTES, MONSTER_TYPES } from '@/app/constans/atributes';

// 検証に合わなかった項目（スクリプトが外した理由として数える）
export type MonsterRejectReason =
  | 'not_object'
  | 'id'
  | 'imageUrl'
  | 'description'
  | 'attribute'
  | 'type'
  | 'job'
  | 'gender'
  | 'createdAt';

// KV から読んだ値を外す理由（上記に加えて、値が無い・読めない・キーと中身の id が食い違う）
export type StoredMonsterRejectReason = MonsterRejectReason | 'missing' | 'unreadable' | 'key_mismatch';

export const monsterKey = (id: string) => `monster:${id}`;

export const isMonsterId = (value: unknown): value is string => typeof value === 'string' && isUuid(value);

const isOneOf = (value: unknown, values: string[]): value is string =>
  typeof value === 'string' && values.includes(value);

// toISOString() の形の日時文字列か
const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString() === value;
};

// 受け取ったモンスターを許可リストで検証し、許可した項目だけを詰め直す。合わなければ最初に外れた項目を返す
export function checkMonster(body: unknown): { monster: Monster } | { reason: MonsterRejectReason } {
  if (!body || typeof body !== 'object') return { reason: 'not_object' };
  const { id, imageUrl, description, attribute, type, job, gender, createdAt } = body as Record<string, unknown>;

  if (!isMonsterId(id)) return { reason: 'id' };
  if (!isBlobImageUrl(imageUrl)) return { reason: 'imageUrl' };
  if (typeof description !== 'string') return { reason: 'description' };
  const trimmedDescription = description.trim();
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) return { reason: 'description' };
  // attribute は表示用の日本語名（火・雷 など）で保存している
  if (!isOneOf(attribute, MONSTER_ATTRIBUTES.map((item) => item.ja))) return { reason: 'attribute' };
  if (!isOneOf(type, MONSTER_TYPES.map((item) => item.en))) return { reason: 'type' };
  if (!isOneOf(job, JOBS.map((item) => item.en))) return { reason: 'job' };
  if (!isOneOf(gender, GENDERS.map((item) => item.en))) return { reason: 'gender' };
  if (!isIsoDateString(createdAt)) return { reason: 'createdAt' };

  return { monster: { id, imageUrl, description: trimmedDescription, attribute, type, job, gender, createdAt } };
}

// 検証に合えばモンスター、合わなければ null
export function parseMonster(body: unknown): Monster | null {
  const result = checkMonster(body);
  return 'monster' in result ? result.monster : null;
}

// KV から読んだ値（@vercel/kv が JSON から戻した値。古いデータは文字列のままのこともある）を検証する。
// 索引の要素（monster:<id>）と中身の id が食い違うものも外す（外す・戻す操作が別のモンスターに効かないように）
export function checkStoredMonster(
  key: string,
  value: unknown
): { monster: Monster } | { reason: StoredMonsterRejectReason } {
  if (value === null || value === undefined) return { reason: 'missing' };
  let body = value;
  if (typeof value === 'string') {
    try {
      body = JSON.parse(value);
    } catch {
      return { reason: 'unreadable' };
    }
  }
  const result = checkMonster(body);
  if ('reason' in result) return result;
  if (key !== monsterKey(result.monster.id)) return { reason: 'key_mismatch' };
  return result;
}
