import axios from 'axios'

type FetchMonsterImgProps = {
  description: string;
  attribute: string;
  type?: string;
}

const fetchMonsterImg = async ({
    description,
    attribute,
    type
  }: FetchMonsterImgProps): Promise<string> => {

    let prompt = '';
    console.log(type);
    if(type ==='human') {
      
      prompt = `A distinctly humanoid creature with clear human body structure, inspired by ${description}. 
      It has ${attribute} type features seamlessly integrated into its human form. 
      The creature has a human-like face, two arms, two legs, and stands upright. 
      Its body proportions are primarily human, but with fantastical elements that reflect its ${attribute} nature. 
      The humanoid is wearing clothing or armor that complements its ${attribute} type, such as robes, armor pieces, or stylized garments that incorporate ${attribute}-related motifs or materials.
      Accessories or decorations that emphasize its ${attribute} nature may be included, like jewelry, headgear, or handheld items.
      The design emphasizes human characteristics while incorporating unique, monstrous traits related to its ${attribute} type. 
      Use colors and shapes in both its body and clothing that blend human anatomy with ${attribute} elements. 
      Ensure the final design is original and doesn't resemble existing characters from games, anime, or other media.`

    } else if (type ==='animal') {
      prompt = `A fictional creature inspired by the characteristics of ${description}, designed to resemble a ${attribute} type without directly copying any existing Pokémon. The overall design should incorporate elements that reflect the ${attribute} type, with colors and shapes that emphasize its nature. Ensure the creature appears whimsical and imaginative, with no direct resemblance to any existing Pokémon.`;
    }

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
