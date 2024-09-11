import axios from 'axios'

type FetchMonsterImgProps = {
  description: string;
  attribute: string;
  type?: string;
  style?: string;
}

const fetchMonsterImg = async ({
    description,
    attribute,
    type,
    style
  }: FetchMonsterImgProps): Promise<string> => {

    // console.log(type);
    // console.log(style);

    let basePrompt = '';
    
    // タイプに基づいた基本的な特徴を設定
    if (type === 'Humanoid') {
      basePrompt = `A humanoid creature with a human-like body structure. 
      - Upright posture with two arms and two legs.
      - Human-like face with expressive features, with subtle ${attribute}-related modifications.
      - Hands and feet resembling human ones, possibly with slight alterations related to its ${attribute}.
      - Body proportions similar to humans, but with fantastical elements integrated.
      - Gender: ${Math.random() < 0.5 ? 'male' : 'female'}.
      - If female:
        - Tasteful, contextually appropriate clothing.
      - Clothing or armor that enhances its ${attribute} abilities while maintaining a humanoid silhouette.`;
    } else if (type === 'Animal') {
      basePrompt = `A fantastical animal-like creature with non-humanoid features. 
      - Quadrupedal or with a unique body structure distinctly different from humans.
      - Animal-like head and face, potentially combining features from different species.
      - Fur, scales, feathers, or a unique body covering related to its ${attribute}.
      - Tail, wings, fins, or other non-human appendages that reflect its ${attribute}.
      - Natural weapons or defenses like claws, fangs, or horns, integrated with its ${attribute}.`;
    } else if (type === 'Mechanical') {
      basePrompt = `A sophisticated mechanical entity with robotic or technological features. 
      - Body composed of visible mechanical parts, gears, circuits, or energy conduits.
      - Sleek or industrial design with elements clearly showcasing its ${attribute}.
      - Robotic limbs or appendages with special functions related to its ${attribute}.
      - Emits energy or has visible power sources matching its ${attribute}.
      - Includes technological enhancements like scanners, weaponry, or tools integrated into its body.`;
    }

    // スタイルに基づいた表現方法を追加
    let stylePrompt = '';
    if (style === 'Anime') {
      stylePrompt = `Anime style: Bold outlines, vibrant colors, expressive eyes, stylized proportions.`;
    } else if (style === 'Realistic') {
      stylePrompt = `Realistic style: Accurate anatomy, complex textures, realistic lighting and shadows.`;
    } else if (style === 'Semi-realistic') {
      stylePrompt = `Semi-realistic style: Balanced realism and stylization, detailed textures, expressive features.`;
    }

    // 最終的なプロンプトを組み立てる
    const prompt = `${basePrompt} ${stylePrompt}
    Inspired by ${description}, embodying ${attribute} type.
    - Unique adaptations for ${attribute} abilities.
    - Striking colors/patterns reflecting ${attribute}.
    - Subtle environmental effects showcasing ${attribute} powers.
    - Pose and expression convey personality and ${attribute} connection.
    - Original design, unique silhouette.`;

    const options = {
      method: 'POST',
      url: 'https://api.getimg.ai/v1/flux-schnell/text-to-image',
      headers: {accept: 'application/json', 'content-type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_GETIMG_API_KEY}`},
      data: { prompt, steps: 3, response_format: 'url'}
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
