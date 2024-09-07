import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { Monster } from '@/app/types/index';

export async function POST(request: Request) {
  try {
    const monster: Monster = await request.json();
    const key = `monster:${monster.id}`;
    
    // モンスターデータを保存
    await kv.set(key, JSON.stringify(monster));
    
    // 最近のモンスターリストに追加
    await kv.zadd('recent_monsters', { score: Date.now(), member: key });
    
    // 最新の5件のみを保持
    await kv.zremrangebyrank('recent_monsters', 0, -6);

    return NextResponse.json({ message: 'Monster saved successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error saving monster:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const keys = await kv.zrange('recent_monsters', 0, 4, { rev: true });
    
    if (!keys || keys.length === 0) {
      return NextResponse.json([]);
    }

    const monsters = await Promise.all(
      keys.map(async (key) => {
        const monster = await kv.get(key as string);
        if (!monster) return null;
        // モンスターデータが既にオブジェクトの場合はそのまま返し、文字列の場合はパースする
        return typeof monster === 'string' ? JSON.parse(monster) : monster;
      })
    );

    const validMonsters = monsters.filter(monster => monster !== null);

    return NextResponse.json(validMonsters);
  } catch (error) {
    console.error('Error fetching monsters:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}