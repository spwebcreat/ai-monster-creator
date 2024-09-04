
import React, { useEffect, useState } from 'react'
import styles from './MonsterForm.module.css'
import { MONSTER_ATTRIBUTES } from '../constans/atributes'

type MonsterFormProps = {
  onSubmit: (description: string, attributes: string, hiddenAttributeJp: string) => void;
  isLoading: boolean;
  isGenerated: boolean;
}

const MonsterForm = ({ onSubmit, isLoading, isGenerated }: MonsterFormProps) => {

  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState("");
  const [hiddenAttributeJp, setHiddenAttributeJp] = useState("");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(description, attributes, hiddenAttributeJp);
    // setDescription("");
    // setAttributes("");
    // setHiddenAttributeJp("");
  }
  useEffect(() => {
    setHiddenAttributeJp(MONSTER_ATTRIBUTES.find(attribute => attribute.en === attributes)?.ja || "");
  }, [attributes]);
  
  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      <div className={styles.formGroup}>
        <label htmlFor="description" className={styles.label}>
          モンスターの特徴
        </label>
        <input 
          id="description" 
          className={styles.input} 
          type="text" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="例: cute"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="attributes" className={styles.label}>
          モンスターの属性
        </label>
        <select 
          id="attributes" 
          className={styles.select}
          onChange={(e) => setAttributes(e.target.value)}
          required
          value={attributes}
        >
          <option value="">選択してください</option>
          {MONSTER_ATTRIBUTES.map((attribute) => (
            <option key={attribute.en} value={attribute.en}>
              {attribute.ja}
            </option>
          ))}
        </select>
        <input type="hidden" value={hiddenAttributeJp}/>
      </div>

      {isLoading ? (<p className={styles.loadingText}>生成中...</p>
      ) : (
        <button type="submit" className={styles.button}>
          {isGenerated ? "再生成する" : "モンスターを生成する"}
        </button>
      )}

    </form>
  )
}

export default MonsterForm