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