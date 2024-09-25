import axios from 'axios'
import { JOBS, JobTypes } from '@/app/constans/atributes';
import { FormDataProps } from '@/app/types';


const fetchMonsterImg = async ({
  description,
  attribute,
  type,
  style,
  job,
  gender
}: FormDataProps) => {

  const jobInfo = JOBS.find(j => j.en === job) as JobTypes;

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
    basePrompt += ` Realistic human proportions, detailed facial features, expressive eyes. Five fingers on each hand. Wearing ${attribute}-infused armor or clothing suitable for a ${jobInfo.en.toLowerCase()}.`;
  } else if (type === 'Animal') {
    basePrompt += ` Animal face with ${attribute} traits, anthropomorphic body.`;
  }

  // 職業の特徴を詳細に追加
  if (jobInfo) {
    basePrompt += ` ${jobInfo.prompt} ${jobInfo.desc}`;
  }

  // スタイルに基づいてプロンプトを調整
  if (style === 'Anime' || style === 'アニメ風') {
    basePrompt += ' Anime style: Bold lines, vibrant colors, large expressive eyes, exaggerated features while maintaining realism.';
  } else if (style === 'Semi-realistic' || style === 'リアル') {
    basePrompt += ' Semi-realistic style: Detailed textures, natural proportions, subtle lighting effects.';
  } else {
    // デフォルトはアニメ風
    basePrompt += ' Anime style: Bold lines, vibrant colors, large expressive eyes, exaggerated features while maintaining realism.';
  }

  // 属性効果を追加
  basePrompt += ` Striking ${attribute} aura/effects emanating from the character and their equipment.`;

  // 説明を追加
  basePrompt += ` ${description}.`;

  // 重要な指示を最後にも追加
  basePrompt += ' Ensure the entire body is visible within the frame, from head to toe. Wide shot to include full figure.';

  // console.log(basePrompt);

  const options = {
    method: 'POST',
    url: 'https://api.getimg.ai/v1/flux-schnell/text-to-image',
    headers: { 
      accept: 'application/json', 
      'content-type': 'application/json', 
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_GETIMG_API_KEY}` 
    },
    data: { 
      prompt: basePrompt, 
      steps: 3, 
      response_format: 'url' 
    }
  };

  try {
    const response = await axios.request(options);
    if (response.data && response.data.url) {
      return response.data.url;
    } else {
      console.error('Invalid response from GetImg.ai API:', response.data);
      throw new Error('Invalid response from GetImg.ai API');
    }
  } catch (error) {
    console.error("画像生成に失敗しました", error);
    throw error;
  }
}
export { fetchMonsterImg };
