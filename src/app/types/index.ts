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
  // 保存（POST）では必須。一覧の読み出しでは、過去のデータの性別が今の選択肢に無い時は省く
  gender?: string;
  createdAt: string;

}

// GET /api/monsters の応答（一覧の 1 ページ分）と getMonsters の戻り値
export interface MonstersPage {
  monsters: Monster[];
  todayCount: number;
  // 続きを読む時に渡す offset（索引上の位置）。続きが無ければ null
  nextOffset: number | null;
}

// 一覧から外したモンスターの記録（KV の hash hidden_monsters の値。キーはモンスターの id）
export interface HiddenMonsterRecord {
  // 外した時刻（ミリ秒）
  hiddenAt: number;
  // 外す前の all_monsters の score（戻す時に使う）
  score: number;
}