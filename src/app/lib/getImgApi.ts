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

    console.log(type);
    console.log(style);

    let basePrompt = '';
    
    // タイプに基づいた基本的な特徴を設定
    if (type === 'Humanoid') {
      basePrompt = `A humanoid creature with a clearly human-like body structure. 
      - Upright posture with two arms and two legs.
      - Human-like face with expressive features, but with subtle ${attribute}-related modifications.
      - Hands and feet resembling human ones, possibly with slight alterations related to its ${attribute}.
      - Body proportions similar to humans, but with fantastical elements integrated.
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



    // switch (type) {
    //   case 'Humanoid':
    //     prompt = `Create an anime-style humanoid monster character inspired by ${description} and embodying the ${attribute} type. 
    //     Key features:
    //     - Vibrant and expressive anime art style with bold outlines and stylized features.
    //     - Large, expressive eyes that reflect the ${attribute} power, possibly with unique pupils or iris patterns.
    //     - Exaggerated hairstyle that incorporates elements of the ${attribute}, such as flame-like for fire or flowing for water.
    //     - Human-like body proportions but with slight exaggerations to emphasize the monster aspect.
    //     - Skin color or texture that subtly hints at the ${attribute} without being overly realistic.
    //     - Clothing or armor that blends modern anime fashion with ${attribute}-themed designs.
    //     - Accessory or weapon that channels the ${attribute} power, like a magical staff or elemental gauntlets.
    //     - Dynamic pose that showcases the character's personality and power.
    //     - Incorporate small ${attribute}-related visual effects around the character, like sparks, water droplets, or glowing runes.
    //     - Background should be simple and complementary, focusing attention on the character.
    //     - Overall aesthetic should be colorful, appealing, and suitable for all ages.
    //     Ensure the design is original and avoids direct resemblance to popular anime characters while maintaining a familiar anime style.`;
    //     break;

    //   case 'Animal':
    //     prompt = `A fantastical animal-like creature inspired by the characteristics of ${description}, designed to embody the ${attribute} type. 
    //     The overall design must be distinctly non-humanoid, focusing on animal features and anatomy.
    //     Incorporate elements that reflect the ${attribute} type through colors, patterns, and anatomical features that emphasize its nature.
    //     The creature should have clear animal-like features such as fur, scales, feathers, snouts, paws, hooves, or tails, appropriate to its ${attribute} type.
    //     Its body structure, limbs, and sensory organs should be adapted to its ${attribute}, suggesting how it might use its abilities in the wild.
    //     The face and head should be entirely animal-like, without any human facial features.
    //     Include environmental elements or effects around the creature that showcase its ${attribute} powers.
    //     Ensure the creature appears whimsical, imaginative, and powerful, with a unique silhouette that stands out.
    //     The final design should be original and avoid any resemblance to humanoid characters or existing creatures from popular media.`;
    //     break;

    //   case 'Mechanical':
    //     prompt = `A sophisticated mechanical entity inspired by ${description}, seamlessly integrating ${attribute} type features into its robotic form. 
    //     The overall design should blend advanced technology with elements that reflect the ${attribute} type.
    //     Its body structure can range from humanoid to animal-like, depending on the ${attribute} and ${description}. For example, a thunder-type might have a more angular, lightning rod-like structure, while a water-type could be more streamlined and fluid in design.
    //     Incorporate visible mechanical parts such as gears, pistons, or energy conduits that relate to its ${attribute} type.
    //     The robot should have distinct features that emphasize its ${attribute}, such as specialized appendages, sensors, or weapon systems.
    //     Use colors, textures, and lighting effects that reinforce the ${attribute} theme and give the impression of advanced technology.
    //     Include small details like holographic displays, energy fields, or transforming parts that showcase its technological nature.
    //     Ensure the final design is unique, avoiding direct resemblance to famous robot characters from popular media.`;
    //     break;

    //   case 'Plant':
    //     prompt = `A mesmerizing plant-based entity inspired by the characteristics of ${description}, designed to embody the ${attribute} type. 
    //     The overall design must be distinctly botanical, without any human-like or animal-like facial features.
    //     Incorporate plant elements that reflect the ${attribute} type, with colors, textures, and structures that emphasize its nature.
    //     The entity should have clear plant-like features such as leaves, flowers, vines, bark, or fungi, appropriate to its ${attribute} type.
    //     Its form and growth pattern should be adapted to its ${attribute}, suggesting how it might use its abilities in nature.
    //     Any sensory organs or reactive parts should be plant-based, such as light-sensitive leaves, motion-detecting tendrils, or spore-releasing structures.
    //     Include environmental elements or effects around the plant creature that showcase its ${attribute} powers, such as emanating energy, changing colors, or manipulating nearby plant life.
    //     The entity can have a mix of stationary and mobile parts, possibly with the ability to root itself or move using vines, roots, or by rolling.
    //     Ensure the plant creature appears magical, ethereal, and powerful, with a unique silhouette that stands out in a fantastical forest setting.
    //     The final design should be original and avoid any resemblance to humanoid characters, faces, or existing plant-based characters from popular media.`;
    //     break;

    //   default:
    //     prompt = `A fictional creature inspired by the characteristics of ${description}, designed to resemble a ${attribute} type without directly copying any existing Pokémon.
    //     The overall design should incorporate elements that reflect the ${attribute} type, with colors and shapes that emphasize its nature.
    //     Ensure the creature appears whimsical and imaginative, with no direct resemblance to any existing Pokémon.`;
    //     break;
    // }


    const options = {
      method: 'POST',
      url: 'https://api.getimg.ai/v1/flux-schnell/text-to-image',
      headers: {accept: 'application/json', 'content-type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_GETIMG_API_KEY}`},
      data: { prompt, steps: 1, response_format: 'url'}
    };
    
    
    try {
      const response = await axios.request(options);
      return response.data.url || '';
    } catch (error) {
        console.error("画像生成に失敗しました", error);
        return '';
    }

}

export { fetchMonsterImg };
