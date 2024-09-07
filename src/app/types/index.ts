export interface FormDataProps {
  description: string;
  attribute: string;
  hiddenAttributeJp: string;
  type: string;
  style: string;
}

export interface MonsterFormProps {
  onSubmit: (description: string, attribute: string, hiddenAttributeJp: string, type: string, style: string) => void;
  isLoading: boolean;
  isGenerated: boolean;
}



export interface Monster {
  id: string;
  imageUrl: string;
  description: string;
  attribute: string;
  type: string;
  style: string;
  createdAt: string;
}