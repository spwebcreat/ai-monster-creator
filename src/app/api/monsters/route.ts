import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Monster } from '@/app/types/index';

// 今日の日付を "YYYY-MM-DD" 形式で取得する関数
function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

export async function POST(request: Request) {
  try {
    const monster: Monster = await request.json();
    const key = `monster:${monster.id}`;

    // console.log('Received monster data:', monster); //デバッグ用
    
    // モンスターデータを保存
    await kv.set(key, JSON.stringify(monster));
    
    // 最近のモンスターリストに追加
    await kv.zadd('recent_monsters', { score: Date.now(), member: key });
    
    // 最新の5件のみを保持
    await kv.zremrangebyrank('recent_monsters', 0, -6);
    

    const todayKey = getTodayKey();
    await kv.incr(`generation_count:${todayKey}`);


    return NextResponse.json(
      { message: 'Monster saved successfully' },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );

  } catch (error) {
    console.error('Error saving monster:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const keys = await kv.zrange('recent_monsters', 0, 4, { rev: true });
    // console.log('Retrieved keys:', keys); //デバッグ用
    if (!keys || keys.length === 0) {
      return NextResponse.json({ monsters: [], todayCount: 0 });
    }

    const monsters = await Promise.all(
      keys.map(async (key) => {
        const monster = await kv.get(key as string);
        if (!monster) return null;
        // モンスターデータが既にオブジェクトの場合はそのまま返し、文字列の場合はパースする
        return typeof monster === 'string' ? JSON.parse(monster) : monster;
      })
    );

    // モンスターデータがnullの場合は除外
    const validMonsters = monsters.filter(monster => monster !== null);

    // 今日の生成回数を取得
    const todayKey = getTodayKey();
    const todayCount = await kv.get(`generation_count:${todayKey}`) || 0;

    // 今日の生成回数を返す
    return NextResponse.json({ monsters: validMonsters, todayCount });

  } catch (error) {
    console.error('Error fetching monsters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}