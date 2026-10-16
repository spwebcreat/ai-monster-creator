// /api/generate が受け取るフォームの値（サーバー側で許可リスト検証してから指示文を組み立てる）
export interface GenerateRequestBody {
  description: string;
  job: string;
  gender: string;
  attribute: string;
  type: string;
  style: string;
}

export interface MonsterFormProps {
  onSubmit: (
    description: string,
    job: string,
    gender: string,
    attribute: string,
    hiddenAttributeJp: string,
    type: string, 
    style: string,
  ) => void;
  isLoading: boolean;
  isGenerated: boolean;
}

export interface Monster {
  id: string;
  imageUrl: string;
  description: string;
  attribute: string;
  type: string;
  job: string;
  gender: string;
  createdAt: string;
  
}