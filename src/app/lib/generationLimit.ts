// 1日の生成上限・英訳上限と、その日の回数カウンタのキー（/api/generate・/api/monsters・フォーム・英訳で共有）

export const DAILY_GENERATION_LIMIT = 100;

// 今日の日付を "YYYY-MM-DD" 形式で取得する（既存のカウンタと同じキーを読むため UTC のまま）
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export function getGenerationCountKey() {
  return `generation_count:${getTodayKey()}`;
}

// 1日の英訳（Claude Haiku・特徴の英訳）の上限。生成の回数は getimg.ai が 4xx の時に数え戻すため、
// 英訳はそれとは別のカウンタで数え、どんな失敗でも数え戻さない（英訳の費用が生成の上限に縛られなくなるのを防ぐ）
export const DAILY_TRANSLATION_LIMIT = 150;

export function getTranslationCountKey() {
  return `translate_count:${getTodayKey()}`;
}
