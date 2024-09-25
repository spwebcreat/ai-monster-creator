export interface FormDataProps {
  description?: string;
  attribute: string;
  job: string;
  gender: string;
  hiddenAttributeJp: string;
  type: string;
  style?: string;
}

export interface MonsterFormProps {
  onSubmit: (
    description: string, 
    attribute: string, 
    job: string, 
    gender: string, 
    hiddenAttributeJp: string, 
    type: string, 
    style: string,
  ) => void;
  isLoading: boolean;
  isGenerated: boolean;
}

export interface Monster {
  imageData: WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; };
  id: string;
  imageUrl: string;
  description: string;
  attribute: string;
  type: string;
  job: string;
  gender: string;
  createdAt: string;
  
}