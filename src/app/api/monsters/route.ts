import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Monster } from '@/app/types/index';
import fs from 'fs'; // ファイル操作用モジュールを追加
import path from 'path'; // パス操作用モジュールを追加

// 今日の日付を "YYYY-MM-DD" 形式で取得する関数
function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

const limit:number = 12;

export async function POST(request: Request) {
  try {
    const monster: Monster = await request.json();
    const key = `monster:${monster.id}`;
    const todayKey = getTodayKey();

    // console.log('Received monster data:', monster); //デバッグ用
    try {
      // モンスターデータを保存
      await kv.set(key, JSON.stringify(monster));
      // 最近のモンスターリストに追加
      await kv.zadd('recent_monsters', { score: Date.now(), member: key });
      // 最新の5件のみを保持
      await kv.zremrangebyrank('recent_monsters', 0, -(limit+1));
      // 今日の生成回数を増やす
      await kv.incr(`generation_count:${todayKey}`);

      // /public/monsters/ に画像を保存
      if (monster.imageUrl) {
        const imageUrl = monster.imageUrl;
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            // 'buffer' プロパティは 'Response' 型に存在しないため、'arrayBuffer' を使用して修正
            throw new Error(`画像の取得に失敗しました: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          // 画像保存先のパスを設定
          const monstersDir = path.join(process.cwd(), 'public', 'monsters');
          // ディレクトリが存在しない場合は作成
          if (!fs.existsSync(monstersDir)) {
            fs.mkdirSync(monstersDir, { recursive: true });
          }
          // 画像ファイル名を設定 (例: monster_{id}.jpg)
          const fileExtension = path.extname(imageUrl).split('?')[0] || '.jpg'; // 拡張子を取得
          const fileName = `monster_${monster.id}${fileExtension}`;
          const filePath = path.join(monstersDir, fileName);

          // 画像ファイルを保存
          fs.writeFileSync(filePath, buffer);

          // モンスターの imageUrl を更新
          monster.imageUrl = `/monsters/${fileName}`;
          // 更新された monster オブジェクトを KV に保存
          await kv.set(key, JSON.stringify(monster));

        } catch (fetchError) {
          console.error('画像の取得に失敗しました:', fetchError);
          return NextResponse.json({ error: `Failed to fetch image: ${fetchError}`, monster }, { status: 400 });
        }
        
      }


    } catch (kvError) {
      console.error('ストレージが利用制限に達しました:', kvError); // kvErrorを追加して詳細なエラーメッセージを表示
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
    const todayKey = getTodayKey();


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
      todayCount = await kv.get(`generation_count:${todayKey}`) || 0;
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