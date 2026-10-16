import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validate as isUuid } from 'uuid';
import { Monster } from '@/app/types/index';
import { DAILY_GENERATION_LIMIT, getGenerationCountKey } from '@/app/lib/generationLimit';
import { isBlobImageUrl } from '@/app/lib/allowedUrl';
import { DESCRIPTION_MAX_LENGTH, GENDERS, JOBS, MONSTER_ATTRIBUTES, MONSTER_TYPES } from '@/app/constans/atributes';

const limit:number = 12;

const isOneOf = (value: unknown, values: string[]): value is string =>
  typeof value === 'string' && values.includes(value);

// toISOString() の形の日時文字列か
const isIsoDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString() === value;
};

// 受け取ったモンスターを許可リストで検証し、許可した項目だけを詰め直す。不正なら null
function parseMonster(body: unknown): Monster | null {
  if (!body || typeof body !== 'object') return null;
  const { id, imageUrl, description, attribute, type, job, gender, createdAt } = body as Record<string, unknown>;

  if (typeof id !== 'string' || !isUuid(id)) return null;
  if (!isBlobImageUrl(imageUrl)) return null;
  if (typeof description !== 'string') return null;
  const trimmedDescription = description.trim();
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) return null;
  // attribute は表示用の日本語名（火・雷 など）で保存している
  if (!isOneOf(attribute, MONSTER_ATTRIBUTES.map((item) => item.ja))) return null;
  if (!isOneOf(type, MONSTER_TYPES.map((item) => item.en))) return null;
  if (!isOneOf(job, JOBS.map((item) => item.en))) return null;
  if (!isOneOf(gender, GENDERS.map((item) => item.en))) return null;
  if (!isIsoDateString(createdAt)) return null;

  return { id, imageUrl, description: trimmedDescription, attribute, type, job, gender, createdAt };
}

export async function POST(request: Request) {
  try {
    const monster = parseMonster(await request.json().catch(() => null));
    if (!monster) {
      return NextResponse.json({ error: 'Invalid monster data' }, { status: 400 });
    }
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
      // /api/generate は上限を超えた回も数えたままにするため、表示は上限で頭打ちにする
      const rawCount = Number(await kv.get(getGenerationCountKey())) || 0;
      todayCount = Math.min(rawCount, DAILY_GENERATION_LIMIT);
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