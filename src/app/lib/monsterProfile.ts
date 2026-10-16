// トップの図鑑カード・見せ場で、保存データ（Monster）から表示用の値を作る
import type { CSSProperties } from 'react';
import {
  ATTRIBUTE_COLORS,
  ATTRIBUTE_STAT_MODIFIERS,
  JOB_BASE_STATS,
  JOBS,
  MONSTER_STAT_MAX,
  MONSTER_STATS,
  MonsterStatKey,
} from '@/app/constans/atributes';

// 表に無い属性（KV に残る過去のデータ）の色
const FALLBACK_ATTRIBUTE_COLOR = { color: '#9CA3AF', text: '#151515' };

const TYPE_LABELS: Record<string, string> = {
  Humanoid: '人型',
  Animal: '動物型',
  Mechanical: '機械型',
  Plant: '植物型',
};

export const getJob = (job: unknown) =>
  typeof job === 'string' ? JOBS.find((item) => item.en === job) : undefined;

export const getTypeLabel = (type: unknown) =>
  typeof type === 'string' ? TYPE_LABELS[type] ?? '' : '';

// 枠・印・光に使う CSS 変数（--ac: 色 / --acr: rgba 用の「r,g,b」/ --af: 印の文字色）
export const getAttributeStyle = (attribute: string) => {
  const { color, text } = ATTRIBUTE_COLORS.find((item) => item.ja === attribute) ?? FALLBACK_ATTRIBUTE_COLOR;
  const rgb = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)).join(',');
  return { '--ac': color, '--acr': rgb, '--af': text } as CSSProperties;
};

// 作成日（2026.10.16 の形）。サーバー（UTC）とブラウザで日付がずれないよう日本時間で固定する
export const formatCreatedDate = (createdAt: unknown) => {
  if (typeof createdAt !== 'string') return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .replaceAll('/', '.');
};

export type MonsterStat = {
  key: MonsterStatKey;
  label: string;
  value: number;
  // strong = 一番高く、かつ高い方（得意）/ weak = 一番低く、かつ低い方（不得意）。真ん中の値には付けない
  tag: 'strong' | 'weak' | null;
};

// 得意・不得意の印を付ける境目（5 段階なら 4 以上が得意、2 以下が不得意）
const STRONG_MIN = MONSTER_STAT_MAX - 1;
const WEAK_MAX = 2;

// 得意・不得意の値。職業の基本値＋属性の補正（1〜MONSTER_STAT_MAX）。同じ職業・属性なら必ず同じ値。表に無い職業は null
export const getMonsterStats = (job: unknown, attribute: unknown): MonsterStat[] | null => {
  const base = typeof job === 'string' ? JOB_BASE_STATS[job] : undefined;
  if (!base) return null;
  const modifier = typeof attribute === 'string' ? ATTRIBUTE_STAT_MODIFIERS[attribute] : undefined;

  const values = MONSTER_STATS.map(({ key }) => {
    const value = base[key] + (modifier?.up === key ? 1 : 0) - (modifier?.down === key ? 1 : 0);
    return Math.min(MONSTER_STAT_MAX, Math.max(1, value));
  });
  const max = Math.max(...values);
  const min = Math.min(...values);

  return MONSTER_STATS.map(({ key, ja }, index) => {
    const value = values[index];
    const tag = value === max && value >= STRONG_MIN ? 'strong' : value === min && value <= WEAK_MAX ? 'weak' : null;
    return { key, label: ja, value, tag };
  });
};
