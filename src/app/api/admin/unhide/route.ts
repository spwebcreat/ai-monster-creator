import { kv } from '@vercel/kv';
import { adminJson, guardAdminRequest } from '@/app/lib/adminAuth';
import { checkStoredMonster, isMonsterId, monsterKey } from '@/app/lib/monsterRecord';
import { ALL_MONSTERS_KEY, HIDDEN_MONSTERS_KEY, toIndexScore } from '@/app/lib/monsterIndex';

export const dynamic = 'force-dynamic';

// hidden_monsters の記録から元の score を読み、本文 { id } のモンスターを all_monsters に戻す
// （recent_monsters には戻さない）
export async function POST(request: Request) {
  const guard = guardAdminRequest(request, { sameOrigin: true, session: true });
  if ('response' in guard) return guard.response;

  const body: unknown = await request.json().catch(() => null);
  const id = body && typeof body === 'object' ? (body as Record<string, unknown>).id : undefined;
  if (!isMonsterId(id)) return adminJson({ error: 'Invalid id' }, 400);
  const key = monsterKey(id);

  try {
    const record = await kv.hget<unknown>(HIDDEN_MONSTERS_KEY, id);
    if (record === null) {
      // 外していない（既に戻した）時は、一覧にあれば何もしない
      const indexScore = await kv.zscore(ALL_MONSTERS_KEY, key);
      return indexScore === null
        ? adminJson({ error: 'Monster not found' }, 404)
        : adminJson({ id, hidden: false });
    }

    const recordScore = typeof record === 'object' ? (record as Record<string, unknown>).score : undefined;
    let score = typeof recordScore === 'number' && Number.isFinite(recordScore) ? recordScore : null;
    if (score === null) {
      // 記録が読めない時は作成日時から score を出す
      const result = checkStoredMonster(key, await kv.get(key));
      if (!('monster' in result)) return adminJson({ error: 'Monster not found' }, 404);
      score = toIndexScore(result.monster.createdAt);
    }
    // 索引に戻してから記録を消す（途中で失敗しても、もう一度戻せば揃う）
    await kv.zadd(ALL_MONSTERS_KEY, { score, member: key });
    await kv.hdel(HIDDEN_MONSTERS_KEY, id);
  } catch {
    console.error('Admin unhide failed (KV error)');
    return adminJson({ error: 'Storage unavailable' }, 503);
  }

  return adminJson({ id, hidden: false });
}
