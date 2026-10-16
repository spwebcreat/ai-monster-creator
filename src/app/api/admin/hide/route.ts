import { kv } from '@vercel/kv';
import type { HiddenMonsterRecord } from '@/app/types/index';
import { adminJson, guardAdminRequest } from '@/app/lib/adminAuth';
import { checkStoredMonster, isMonsterId, monsterKey } from '@/app/lib/monsterRecord';
import { ALL_MONSTERS_KEY, HIDDEN_MONSTERS_KEY, RECENT_MONSTERS_KEY, toIndexScore } from '@/app/lib/monsterIndex';

export const dynamic = 'force-dynamic';
// KV への問い合わせ（@vercel/kv）の応答を Next に保存させない（GET だけの窓口では既定で保存され、古い値を返すため）
export const fetchCache = 'force-no-store';

// 本文 { id } のモンスターを一覧（all_monsters・recent_monsters）から外す。monster:<id> と画像は消さない。
// 戻せるよう、外した時刻と元の score を hidden_monsters に残す
export async function POST(request: Request) {
  const guard = await guardAdminRequest(request, { sameOrigin: true, session: true });
  if ('response' in guard) return guard.response;

  const body: unknown = await request.json().catch(() => null);
  const id = body && typeof body === 'object' ? (body as Record<string, unknown>).id : undefined;
  if (!isMonsterId(id)) return adminJson({ error: 'Invalid id' }, 400);
  const key = monsterKey(id);

  try {
    const [indexScore, hidden] = await Promise.all([
      kv.zscore(ALL_MONSTERS_KEY, key),
      kv.hget<unknown>(HIDDEN_MONSTERS_KEY, id),
    ]);
    // 既に外してある時は最初の記録（元の score）を残す
    if (hidden === null) {
      let score = indexScore;
      if (score === null) {
        // 全件の索引に無い（索引を作る前で最新 12 件の索引にだけある等）なら、作成日時から score を出す
        const result = checkStoredMonster(key, await kv.get(key));
        if (!('monster' in result)) return adminJson({ error: 'Monster not found' }, 404);
        score = toIndexScore(result.monster.createdAt);
      }
      const record: HiddenMonsterRecord = { hiddenAt: Date.now(), score };
      await kv.hset(HIDDEN_MONSTERS_KEY, { [id]: record });
    }
    // 記録を残してから索引から外す（途中で失敗しても、もう一度外せば揃う）
    await Promise.all([kv.zrem(ALL_MONSTERS_KEY, key), kv.zrem(RECENT_MONSTERS_KEY, key)]);
  } catch {
    console.error('Admin hide failed (KV error)');
    return adminJson({ error: 'Storage unavailable' }, 503);
  }

  return adminJson({ id, hidden: true });
}
