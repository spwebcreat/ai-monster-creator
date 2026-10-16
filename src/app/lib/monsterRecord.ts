// 保存するモンスター（KV の monster:<id>）の検証。条件は 2 種類ある:
// - 保存の検証（checkMonster）: POST /api/monsters が使う。すべての項目を今の許可リストで確かめる（作成日時はサーバーで付ける）
// - 一覧に出す条件（checkListedMonster）: 一覧の読み出し・管理の窓口・索引を作るスクリプト（scripts/backfill-all-monsters.mjs）が使う。
//   過去のデータも出せるよう保存の検証より緩く、性別と特徴は条件にせず整えてから返す
// スクリプトは Node から直接読むため、このファイルは KV や Next の機能に依存させない
import { validate as isUuid } from 'uuid';
import type { Monster } from '@/app/types/index';
import { isBlobImageUrl } from '@/app/lib/allowedUrl';
import { DESCRIPTION_MAX_LENGTH, GENDERS, JOBS, MONSTER_ATTRIBUTES, MONSTER_TYPES } from '@/app/constans/atributes';

// 保存の検証に合わなかった項目
export type MonsterRejectReason =
  | 'not_object'
  | 'id'
  | 'imageUrl'
  | 'description'
  | 'attribute'
  | 'type'
  | 'job'
  | 'gender';

// 一覧に出す条件に合わなかった項目（スクリプトが外した理由として数える）
export type ListedMonsterRejectReason = 'not_object' | 'id' | 'imageUrl' | 'createdAt' | 'job' | 'attribute' | 'type';

// KV から読んだ値を外す理由（上記に加えて、値が無い・読めない・キーと中身の id が食い違う）
export type StoredMonsterRejectReason = ListedMonsterRejectReason | 'missing' | 'unreadable' | 'key_mismatch';

export const monsterKey = (id: string) => `monster:${id}`;

export const isMonsterId = (value: unknown): value is string => typeof value === 'string' && isUuid(value);

const isOneOf = (value: unknown, values: string[]): value is string =>
  typeof value === 'string' && values.includes(value);

// attribute は表示用の日本語名（火・雷 など）で保存している
const ATTRIBUTE_NAMES = MONSTER_ATTRIBUTES.map((item) => item.ja);
const TYPE_VALUES = MONSTER_TYPES.map((item) => item.en);
const JOB_VALUES = JOBS.map((item) => item.en);
const GENDER_VALUES = GENDERS.map((item) => item.en);

// 一覧に出す作成日時の範囲（サービスを始める前・今＋1 日より先の日時は、利用者が書き換えた値として扱う）
const LISTED_CREATED_AT_MIN = Date.UTC(2024, 0, 1);
const LISTED_CREATED_AT_MAX_AHEAD_MS = 24 * 60 * 60 * 1000;

// 文字数（絵文字などを途中で割らないよう、コードポイントで数える）が上限を超えれば切る
const truncate = (text: string, maxLength: number) => {
  const chars = Array.from(text);
  return chars.length > maxLength ? chars.slice(0, maxLength).join('') : text;
};

// 受け取ったモンスターを許可リストで検証し、許可した項目だけを詰め直す。合わなければ最初に外れた項目を返す。
// 作成日時は受け取った値を使わず、サーバーの時刻を付ける（並び順や表示の日付を利用者が決められないように）
export function checkMonster(body: unknown, now = Date.now()): { monster: Monster } | { reason: MonsterRejectReason } {
  if (!body || typeof body !== 'object') return { reason: 'not_object' };
  const { id, imageUrl, description, attribute, type, job, gender } = body as Record<string, unknown>;

  if (!isMonsterId(id)) return { reason: 'id' };
  if (!isBlobImageUrl(imageUrl)) return { reason: 'imageUrl' };
  if (typeof description !== 'string') return { reason: 'description' };
  const trimmedDescription = description.trim();
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) return { reason: 'description' };
  if (!isOneOf(attribute, ATTRIBUTE_NAMES)) return { reason: 'attribute' };
  if (!isOneOf(type, TYPE_VALUES)) return { reason: 'type' };
  if (!isOneOf(job, JOB_VALUES)) return { reason: 'job' };
  if (!isOneOf(gender, GENDER_VALUES)) return { reason: 'gender' };

  const createdAt = new Date(now).toISOString();
  return { monster: { id, imageUrl, description: trimmedDescription, attribute, type, job, gender, createdAt } };
}

// 検証に合えばモンスター、合わなければ null
export function parseMonster(body: unknown): Monster | null {
  const result = checkMonster(body);
  return 'monster' in result ? result.monster : null;
}

// 一覧に出してよいか（表示用の条件）。id・画像の URL・作成日時（日時として読め、2024-01-01 以降・今＋1 日まで）・
// 職業・属性（今の日本語名）・タイプを確かめる。
// 性別と特徴は条件にせず、返す前に整える: 性別は今の選択肢に無ければ項目ごと省き、特徴は文字列でなければ空文字・上限の字数で切る。
// 作成日時は toISOString() の形に揃える。許可した項目だけを詰め直す
export function checkListedMonster(
  body: unknown,
  now = Date.now()
): { monster: Monster } | { reason: ListedMonsterRejectReason } {
  if (!body || typeof body !== 'object') return { reason: 'not_object' };
  const { id, imageUrl, description, attribute, type, job, gender, createdAt } = body as Record<string, unknown>;

  if (!isMonsterId(id)) return { reason: 'id' };
  if (!isBlobImageUrl(imageUrl)) return { reason: 'imageUrl' };
  const time = typeof createdAt === 'string' ? Date.parse(createdAt) : NaN;
  if (Number.isNaN(time) || time < LISTED_CREATED_AT_MIN || time > now + LISTED_CREATED_AT_MAX_AHEAD_MS) {
    return { reason: 'createdAt' };
  }
  if (!isOneOf(job, JOB_VALUES)) return { reason: 'job' };
  if (!isOneOf(attribute, ATTRIBUTE_NAMES)) return { reason: 'attribute' };
  if (!isOneOf(type, TYPE_VALUES)) return { reason: 'type' };

  return {
    monster: {
      id,
      imageUrl,
      description: typeof description === 'string' ? truncate(description.trim(), DESCRIPTION_MAX_LENGTH) : '',
      attribute,
      type,
      job,
      ...(isOneOf(gender, GENDER_VALUES) ? { gender } : {}),
      createdAt: new Date(time).toISOString(),
    },
  };
}

// KV から読んだ値（@vercel/kv が JSON から戻した値。古いデータは文字列のままのこともある）を、一覧に出す条件で確かめる。
// 索引の要素（monster:<id>）と中身の id が食い違うものも外す（外す・戻す操作が別のモンスターに効かないように）
export function checkStoredMonster(
  key: string,
  value: unknown,
  now = Date.now()
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
  const result = checkListedMonster(body, now);
  if ('reason' in result) return result;
  if (key !== monsterKey(result.monster.id)) return { reason: 'key_mismatch' };
  return result;
}
