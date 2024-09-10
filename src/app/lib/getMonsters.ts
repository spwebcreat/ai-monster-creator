import { Monster } from '@/app/types/index'

export async function getMonsters() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monsters`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    // データ構造のチェックを追加
    if (!data || !Array.isArray(data.monsters)) {
      throw new Error('Invalid data format');
    }
    return { monsters: data.monsters as Monster[], todayCount: data.todayCount as number };
  } catch (error) {
    console.error('Failed to fetch monsters:', error);
    return { monsters: [], todayCount: 0 }; // エラーが発生した場合は空の配列を返す
  }
}