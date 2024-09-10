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
      basePrompt = `A humanoid creature with a clearly human-like body structure. 
      - Upright posture with two arms and two legs.
      - Human-like face with expressive features, but with subtle ${attribute}-related modifications.
      - Hands and feet resembling human ones, possibly with slight alterations related to its ${attribute}.
      - Body proportions similar to humans, but with fantastical elements integrated.
      - If described as female (woman or girl):
        - Ensure the clothing is tasteful and not overly revealing.
        - Consider cultural and contextual appropriateness in the clothing design.
      - Clothing or armor that enhances its ${attribute} abilities while maintaining a humanoid silhouette.`;
    } else if (type === 'Animal') {
      basePrompt = `A fantastical animal-like creature with non-humanoid features. 
      - Quadrupedal or with a unique body structure distinctly different from humans.
      - Animal-like head and face, potentially combining features from different species.
      - Fur, scales, feathers, or a unique body covering related to its ${attribute}.
      - Tail, wings, fins, or other non-human appendages that reflect its ${attribute}.
      - Natural weapons or defenses like claws, fangs, or horns, integrated with its ${attribute}.`;
    } else if (type === 'Plant') {
      basePrompt = `A mesmerizing plant-based entity with distinct botanical features. 
      - Main body composed of plant-like structures such as stems, leaves, or flower-like elements.
      - No distinct face, but with sensory organs resembling plant parts (e.g., eye-like flowers, root-like tentacles).
      - Ability to change shape or bloom, reflecting its ${attribute} nature.
      - Incorporates elements like vines, petals, or bark, all themed around its ${attribute}.
      - Emits spores, pollen, or has a unique method of movement fitting its plant nature.`;
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
      stylePrompt = `Drawn in a vibrant anime style with:
      - Bold outlines and vibrant colors.
      - Large, expressive eyes and exaggerated facial features.
      - Stylized proportions typical of anime characters.
      - Dynamic poses and exaggerated expressions.
      - Simplified but impactful background elements.`;
    } else if (style === 'Realistic') {
      stylePrompt = `Rendered in a highly detailed, photorealistic style with:
      - Accurate anatomy and proportions.
      - Complex textures and surfaces.
      - Realistic lighting and shadows.
      - Subtle details in skin, fur, or material composition.
      - Naturalistic background elements.`;
    } else if (style === 'Semi-realistic') {
      stylePrompt = `Illustrated in a style that balances realistic details with stylized elements:
      - Slightly exaggerated proportions while maintaining believable anatomy.
      - Detailed textures with some stylized patterns.
      - A mix of realistic shading and more graphic color use.
      - Expressive features with a touch of realism.
      - Balanced background with both realistic and stylized elements.`;
    }

    // 最終的なプロンプトを組み立てる
    const prompt = `${basePrompt} ${stylePrompt}
    This creature is inspired by the characteristics of ${description} and embodies the ${attribute} type.
    Additional key features:
    - The creature's body structure, limbs, and sensory organs are uniquely adapted to its ${attribute}, suggesting special abilities.
    - Incorporate striking colors, patterns, or textures that reflect the ${attribute} type.
    - Include subtle environmental effects or accessories that showcase its ${attribute} powers.
    - The creature's pose and expression should convey its personality and connection to its ${attribute} power.
    - Ensure the overall design is original, avoiding direct resemblance to existing characters from popular media.
    - Create a unique and memorable silhouette that stands out.`;

    const options = {
      method: 'POST',
      url: 'https://api.getimg.ai/v1/flux-schnell/text-to-image',
      headers: {accept: 'application/json', 'content-type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_GETIMG_API_KEY}`},
      data: { prompt, steps: 1, response_format: 'url'}
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
