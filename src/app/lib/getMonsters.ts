import type { Monster, MonstersPage } from '@/app/types/index'
import { unstable_noStore as noStore } from 'next/cache';
import { MONSTERS_PAGE_SIZE } from '@/app/lib/monsterIndex';

// 一覧の 1 ページ分を読む（サーバー側の描画用）。続きはブラウザから GET /api/monsters?offset=&limit= で読む
export async function getMonsters(
  { offset = 0, limit = MONSTERS_PAGE_SIZE }: { offset?: number; limit?: number } = {}
): Promise<MonstersPage> {
  noStore();
  try {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monsters?${params}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    // データ構造のチェックを追加
    if (!data || !Array.isArray(data.monsters)) {
      throw new Error('Invalid data format');
    }
    return {
      monsters: data.monsters as Monster[],
      todayCount: typeof data.todayCount === 'number' ? data.todayCount : 0,
      nextOffset: typeof data.nextOffset === 'number' ? data.nextOffset : null,
    };
  } catch (error) {
    console.error('Failed to fetch monsters:', error);
    return { monsters: [], todayCount: 0, nextOffset: null }; // エラーが発生した場合は空の配列を返す
  }
}
