import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { DESCRIPTION_MAX_LENGTH, GENDERS, JOBS, MONSTER_ATTRIBUTES, MONSTER_STYLES, MONSTER_TYPES } from '@/app/constans/atributes';
import { GetImgApiError, buildMonsterPrompt, fetchMonsterImg, isGetImgConfigured } from '@/app/lib/getImgApi';
import { DAILY_GENERATION_LIMIT, getGenerationCountKey } from '@/app/lib/generationLimit';
import { GenerateRequestBody } from '@/app/types';

// getimg.ai の応答待ち（getImgApi 側で 25 秒で打ち切る）に余裕を持たせる
export const maxDuration = 30;

const isOneOf = (value: unknown, list: { en: string }[]): value is string =>
  typeof value === 'string' && list.some((item) => item.en === value);

// フォームの値を許可リストで検証する。不正なら null
function parseRequestBody(body: unknown): GenerateRequestBody | null {
  if (!body || typeof body !== 'object') return null;
  const { description, job, gender, attribute, type, style } = body as Record<string, unknown>;

  if (typeof description !== 'string') return null;
  const trimmedDescription = description.trim();
  if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) return null;

  if (!isOneOf(job, JOBS)) return null;
  if (!isOneOf(gender, GENDERS)) return null;
  if (!isOneOf(attribute, MONSTER_ATTRIBUTES)) return null;
  if (!isOneOf(type, MONSTER_TYPES)) return null;
  // フォームにスタイルの選択欄が無いため空文字（=アニメ風）も許可する
  if (style !== '' && !isOneOf(style, MONSTER_STYLES)) return null;

  return { description: trimmedDescription, job, gender, attribute, type, style: style as string };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseRequestBody(body);
  if (!input) {
    return NextResponse.json(
      { error: 'invalid_input', message: '入力内容が正しくありません。' },
      { status: 400 }
    );
  }

  // 鍵が無ければ getimg.ai へは送れないので、回数を数える前に止める
  if (!isGetImgConfigured()) {
    console.error('GETIMG_API_KEY is not set');
    return NextResponse.json(
      { error: 'not_configured', message: '現在モンスターを生成できません。時間をおいてお試しください。' },
      { status: 500 }
    );
  }

  // 1日の上限は getimg.ai を呼ぶ前にサーバー側で数えて強制する
  const countKey = getGenerationCountKey();
  let todayCount: number;
  try {
    todayCount = await kv.incr(countKey);
  } catch {
    // KV が使えない時は止める（fail-closed）。
    // このAPIは誰でも直接呼べ、getimg.ai の利用料は鍵の持ち主にかかる。
    // 回数を数えられない状態で通すと上限が効かず、利用料が際限なく増えうるため
    console.error('Generation count unavailable (KV error)');
    return NextResponse.json(
      { error: 'limit_unavailable', message: '現在モンスターを生成できません。時間をおいてお試しください。' },
      { status: 503 }
    );
  }

  if (todayCount > DAILY_GENERATION_LIMIT) {
    // 上限を超えた回も数えたままにする（表示側の GET /api/monsters で上限に丸める）
    return NextResponse.json(
      {
        error: 'daily_limit_reached',
        message: '本日の生成限度に達しました。明日またお試しください。',
        limit: DAILY_GENERATION_LIMIT,
      },
      { status: 429 }
    );
  }

  try {
    const imageUrl = await fetchMonsterImg(buildMonsterPrompt(input));
    return NextResponse.json({ imageUrl, todayCount });
  } catch (error) {
    // 数え戻すのは getimg.ai が 4xx で断った時だけ（処理されておらず、課金もされていない）。
    // タイムアウト・通信断・5xx・応答の破損では、getimg.ai 側で処理・課金されている可能性があるため数えたままにする
    if (error instanceof GetImgApiError && error.status >= 400 && error.status < 500) {
      await kv.decr(countKey).catch(() => undefined);
    }
    console.error('Failed to generate image:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'generation_failed', message: 'モンスターの生成中にエラーが発生しました。' },
      { status: 502 }
    );
  }
}
