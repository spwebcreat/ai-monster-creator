// ブラウザから一覧の続きを読む（GET /api/monsters?offset=&limit=）
import { Monster } from '@/app/types/index'

export type MonsterPage = {
  monsters: Monster[];
  // 続きを読む時の offset。続きが無ければ null（nextOffset を返さない古い API も null として扱う）
  nextOffset: number | null;
};

export async function fetchMonsterPage(offset: number, limit: number): Promise<MonsterPage> {
  const res = await fetch(`/api/monsters/?offset=${offset}&limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.monsters)) throw new Error('Invalid data format');
  const { nextOffset } = data;
  return {
    monsters: data.monsters as Monster[],
    nextOffset: Number.isInteger(nextOffset) && nextOffset >= 0 ? nextOffset : null,
  };
}
