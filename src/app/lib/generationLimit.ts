// 1日の生成上限と、その日の生成回数カウンタのキー（/api/generate・/api/monsters・フォームで共有）

export const DAILY_GENERATION_LIMIT = 100;

// 今日の日付を "YYYY-MM-DD" 形式で取得する（既存のカウンタと同じキーを読むため UTC のまま）
export function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export function getGenerationCountKey() {
  return `generation_count:${getTodayKey()}`;
}
