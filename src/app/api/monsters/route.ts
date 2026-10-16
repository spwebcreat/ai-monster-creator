import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Monster } from '@/app/types/index';
import { getGenerationCountKey } from '@/app/lib/generationLimit';

const limit:number = 12;

export async function POST(request: Request) {
  try {
    const monster: Monster = await request.json();
    const key = `monster:${monster.id}`;

    // console.log('Received monster data:', monster); //デバッグ用
    try {
      // モンスターデータを保存
      await kv.set(key, JSON.stringify(monster));
      // 最近のモンスターリストに追加
      await kv.zadd('recent_monsters', { score: Date.now(), member: key });
      // 最新の5件のみを保持
      await kv.zremrangebyrank('recent_monsters', 0, -(limit+1));
      // 今日の生成回数は /api/generate が getimg.ai を呼ぶ前に数える（ここでは数えない）
    } catch (kvError) {
      console.error('ストレージが利用制限に達しました:');//kvError これを設定するとコンソールがうるさくなるので必要な場合のみセットする
      // KVエラーの場合、クライアントにエラーステータスを返す
      return NextResponse.json(
        { error: 'Storage limit reached', monster },
        { status: 429 } // Too Many Requests
      );
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

export async function GET() {

  try {
    let monsters = [];
    let todayCount = 0;


    try {
      // 最近のモンスターリストを取得
      const limit = 12;
      const keys = await kv.zrange('recent_monsters', 0, (limit-1), { rev: true });
      // モンスターデータがnullの場合は除外
      if (keys && keys.length > 0) {
        monsters = await Promise.all(
          keys.map(async (key) => {
            const monster = await kv.get(key as string);

            return monster ? (typeof monster === 'string' ? JSON.parse(monster) : monster) : null;
          })
        );
        // モンスターデータがnullの場合は除外
        monsters = monsters.filter(monster => monster !== null);
      }
      todayCount = await kv.get(getGenerationCountKey()) || 0;
    } catch (kvError) {
      console.error('KV fetch error:利用制限中です'); //kvError これを設定するとコンソールがうるさくなるので必要な場合のみセットする
      // KVエラーの場合、空の配列とカウント0を使用
      return NextResponse.json({ monsters: [], todayCount: 0 });
    }
    return NextResponse.json({ monsters, todayCount });

  } catch (error) {
    console.error('Error fetching monsters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }

}