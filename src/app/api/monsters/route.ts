import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { Monster } from '@/app/types/index';
import { DAILY_GENERATION_LIMIT, getGenerationCountKey } from '@/app/lib/generationLimit';
import { checkStoredMonster, monsterKey, parseMonster } from '@/app/lib/monsterRecord';
import {
  ALL_MONSTERS_KEY,
  RECENT_MONSTERS_KEY,
  RECENT_MONSTERS_MAX,
  parsePaging,
  toIndexScore,
} from '@/app/lib/monsterIndex';

// ?offset=&limit= を読むため、毎回その場で応答する
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const monster = parseMonster(await request.json().catch(() => null));
    if (!monster) {
      return NextResponse.json({ error: 'Invalid monster data' }, { status: 400 });
    }
    const key = monsterKey(monster.id);

    // console.log('Received monster data:', monster); //デバッグ用
    let created = false;
    try {
      // モンスターデータを保存。同じ id が既にあれば保存しない
      // （一覧に出ている id で送り直して、他人のモンスターを書き換えたり、一覧から外したものを戻したりできないように）
      created = (await kv.set(key, JSON.stringify(monster), { nx: true })) !== null;
      if (created) {
        // 全件の索引に追加（score は作成日時）
        await kv.zadd(ALL_MONSTERS_KEY, { score: toIndexScore(monster.createdAt), member: key });
        // 最近のモンスターリストに追加
        await kv.zadd(RECENT_MONSTERS_KEY, { score: Date.now(), member: key });
        // 最新の 12 件のみを保持
        await kv.zremrangebyrank(RECENT_MONSTERS_KEY, 0, -(RECENT_MONSTERS_MAX + 1));
      }
      // 今日の生成回数は /api/generate が getimg.ai を呼ぶ前に数える（ここでは数えない）
    } catch (kvError) {
      console.error('ストレージが利用制限に達しました:');//kvError これを設定するとコンソールがうるさくなるので必要な場合のみセットする
      // KVエラーの場合、クライアントにエラーステータスを返す
      return NextResponse.json(
        { error: 'Storage limit reached', monster },
        { status: 429 } // Too Many Requests
      );
    }

    if (!created) {
      return NextResponse.json({ error: 'Monster already exists' }, { status: 409 });
    }

    return NextResponse.json(
      { message: 'Monster saved successfully', monster },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error saving monster:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {

  try {
    const { offset, limit } = parsePaging(new URL(request.url).searchParams);
    let monsters: Monster[] = [];
    let todayCount = 0;
    let nextOffset: number | null = null;


    try {
      const [allCount, recentCount, rawCount] = await Promise.all([
        kv.zcard(ALL_MONSTERS_KEY),
        kv.zcard(RECENT_MONSTERS_KEY),
        kv.get(getGenerationCountKey()),
      ]);
      // 全件の索引（all_monsters）を作る前は、今までどおり最新 12 件の索引を読む。
      // 作る前に生成された数件だけが all_monsters に入っていても一覧がその数件に減らないよう、件数で比べて決める
      const useAll = allCount > 0 && allCount >= recentCount;
      const indexKey = useAll ? ALL_MONSTERS_KEY : RECENT_MONSTERS_KEY;
      const total = useAll ? allCount : recentCount;

      const keys = offset < total
        ? await kv.zrange<string[]>(indexKey, offset, offset + limit - 1, { rev: true })
        : [];
      const values = keys.length > 0 ? await kv.mget<unknown[]>(...keys) : [];
      // 読めない・一覧に出す条件に合わないデータは飛ばす（件数が limit に満たなくても、続きの位置は索引上で決める）
      monsters = values.flatMap((value, index) => {
        const result = checkStoredMonster(String(keys[index]), value);
        return 'monster' in result ? [result.monster] : [];
      });
      nextOffset = offset + limit < total ? offset + limit : null;
      // /api/generate は上限を超えた回も数えたままにするため、表示は上限で頭打ちにする
      todayCount = Math.min(Number(rawCount) || 0, DAILY_GENERATION_LIMIT);
    } catch (kvError) {
      console.error('KV fetch error:利用制限中です'); //kvError これを設定するとコンソールがうるさくなるので必要な場合のみセットする
      // KVエラーの場合、空の配列とカウント0を使用
      return NextResponse.json({ monsters: [], todayCount: 0, nextOffset: null });
    }
    return NextResponse.json({ monsters, todayCount, nextOffset });

  } catch (error) {
    console.error('Error fetching monsters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

}
