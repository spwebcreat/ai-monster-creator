// getimg.ai との通信（サーバー専用）。/api/generate からのみ使う。
// 鍵は GETIMG_API_KEY（NEXT_PUBLIC_ なし）から読むため、ブラウザ用 JS には入らない
import { JOBS } from '@/app/constans/atributes';
import { GenerateRequestBody } from '@/app/types';

const GETIMG_ENDPOINT = 'https://api.getimg.ai/v1/flux-schnell/text-to-image';
const GETIMG_TIMEOUT_MS = 25_000;

// 指示文（プロンプト）の組み立て。値は /api/generate で許可リスト検証済みのものを受け取る
const buildMonsterPrompt = ({
  description,
  attribute,
  type,
  style,
  job,
  gender
}: GenerateRequestBody) => {

  const jobInfo = JOBS.find(j => j.en === job);

  // 重要な指示を最初に配置
  let basePrompt = `Full-body portrait of a ${gender} ${type.toLowerCase()} character, entire figure visible from head to toe. ${attribute}-themed. Dynamic action pose showcasing abilities.`;

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

  // 職業の特徴を詳細に追加
  if (jobInfo) {
    basePrompt += ` ${jobInfo.prompt} ${jobInfo.desc}`;
  }

  // スタイルに基づいてプロンプトを調整
  if (style === 'Semi-realistic') {
    basePrompt += ' Semi-realistic style: Detailed textures, natural proportions, subtle lighting effects.';
  } else {
    // デフォルトはアニメ風
    basePrompt += ' Anime style: Bold lines, vibrant colors, large expressive eyes, exaggerated features while maintaining realism.';
  }

  // 属性効果を追加
  basePrompt += ` Striking ${attribute} aura/effects emanating from the character and their equipment.`;

  // 説明を追加
  if (description) {
    basePrompt += ` ${description}.`;
  }

  // 重要な指示を最後にも追加
  basePrompt += ' Ensure the entire body is visible within the frame, from head to toe. Wide shot to include full figure.';

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
    throw new Error(`GetImg.ai API error: ${response.status}`);
  }
  if (!data || typeof data.url !== 'string') {
    throw new Error('Invalid response from GetImg.ai API');
  }
  return data.url;
}

export { buildMonsterPrompt, fetchMonsterImg };
