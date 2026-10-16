// getimg.ai との通信（サーバー専用）。/api/generate からのみ使う。
// 鍵は GETIMG_API_KEY（NEXT_PUBLIC_ なし）から読むため、ブラウザ用 JS には入らない
import { JOBS } from '@/app/constans/atributes';
import { GenerateRequestBody } from '@/app/types';

const GETIMG_ENDPOINT = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
const GETIMG_TIMEOUT_MS = 25_000;

// getimg.ai が HTTP エラーを返した時の例外（/api/generate が応答コードで数え戻しを判断する）
class GetImgApiError extends Error {
  constructor(readonly status: number) {
    super(`GetImg.ai API error: ${status}`);
    this.name = 'GetImgApiError';
  }
}

// 鍵が設定されているか（未設定なら getimg.ai を呼ばず、回数も数えない）
const isGetImgConfigured = () => Boolean(process.env.GETIMG_API_KEY);

// 指示文（プロンプト）の組み立て。値は /api/generate で許可リスト検証済みのものを受け取る（description は英語）。
// FLUX.1 schnell は指示文の先頭 256 トークン（T5）しか読まず、先頭 77 トークン（CLIP）で全体の印象を決める。
// そのため重要な順に並べる: 主題 → 特徴 → 全身の指定 → … → 職業 → オーラの演出（切れても困らないものを最後に）
const buildMonsterPrompt = ({
  description,
  attribute,
  type,
  style,
  job,
  gender
}: GenerateRequestBody) => {

  const jobInfo = JOBS.find(j => j.en === job);

  let basePrompt = `Full-body portrait of a ${gender} ${type.toLowerCase()} character, entire figure visible from head to toe.`;

  // 特徴（利用者の自由入力）は主題の直後に置く
  if (description) {
    basePrompt += ` ${description}.`;
  }

  basePrompt += ' Wide shot to include full figure, feet inside the frame.';
  basePrompt += ` ${attribute}-themed. Dynamic action pose showcasing abilities.`;

  // 性別と体型の特徴を追加
  switch (gender) {
    case 'male':
      basePrompt += ' Masculine build, defined muscles.';
      break;
    case 'female':
      basePrompt += ' Feminine figure, graceful features.';
      break;
    case 'unknown':
      basePrompt += ' Androgynous appearance, balanced physique.';
      break;
  }

  // タイプに基づく特徴を追加
  if (type === 'Humanoid') {
    basePrompt += ` Realistic human proportions, detailed facial features, expressive eyes. Five fingers on each hand. Wearing ${attribute}-infused armor or clothing suitable for a ${job.toLowerCase()}.`;
  } else if (type === 'Animal') {
    basePrompt += ` Animal face with ${attribute} traits, anthropomorphic body.`;
  }

  // スタイルに基づいてプロンプトを調整（長い職業の文より前に置き、切れないようにする）
  if (style === 'Semi-realistic') {
    basePrompt += ' Semi-realistic style: Detailed textures, natural proportions, subtle lighting effects.';
  } else {
    // デフォルトはアニメ風
    basePrompt += ' Anime style: Bold lines, vibrant colors, large expressive eyes, exaggerated features while maintaining realism.';
  }

  // 職業の特徴を詳細に追加（日本語の desc は入れない。FLUX は日本語を読めない）
  if (jobInfo) {
    basePrompt += ` ${jobInfo.prompt}`;
  }

  // 属性効果を追加（特徴が長くて 256 トークンを超えた時は、末尾のここから切れる）
  basePrompt += ` Striking ${attribute} aura/effects emanating from the character and their equipment.`;

  return basePrompt;
}

// getimg.ai で画像を生成し、一時的な画像 URL を返す
const fetchMonsterImg = async (prompt: string): Promise<string> => {
  const apiKey = process.env.GETIMG_API_KEY;
  if (!apiKey) {
    throw new Error('GETIMG_API_KEY is not set');
  }

  const response = await fetch(GETIMG_ENDPOINT, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      prompt,
      steps: 3,
      response_format: 'url'
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(GETIMG_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new GetImgApiError(response.status);
  }
  if (!data || typeof data.url !== 'string') {
    throw new Error('Invalid response from GetImg.ai API');
  }
  return data.url;
}

export { GetImgApiError, buildMonsterPrompt, fetchMonsterImg, isGetImgConfigured };
