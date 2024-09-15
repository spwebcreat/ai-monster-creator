'use client'

import { ButtonSubmit } from '@/app/components/Button'
import React, { useCallback, useEffect, useState } from 'react'
import { MONSTER_ATTRIBUTES, MONSTER_TYPES, MONSTER_STYLES } from '@/app/constans/atributes'
import styles from './Create.module.scss'
import type { MonsterFormProps } from '@/app/types'
import Loading from '@/app/loading'


const MonsterFormDetail = ({ onSubmit, isLoading, isGenerated }: MonsterFormProps) => {

  const [description, setDescription] = useState("");
  const [attribute, setAttribute] = useState("");
  const [type, setType] = useState("");
  const [style, setStyle] = useState("");
  const [hiddenAttributeJp, setHiddenAttributeJp] = useState("");
  const [shouldScroll, setShouldScroll] = useState(false);
  
  const scrollToTop = useCallback(() => {
    const headerHeight = document.querySelector('header')?.offsetHeight || 0;
    window.scrollTo({
      top: headerHeight,
      behavior: 'smooth'
    });
  }, []);

  useEffect(() => {
    if (shouldScroll) {
      const timer = setTimeout(() => {
        scrollToTop();
        setShouldScroll(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldScroll, scrollToTop]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(description, attribute, hiddenAttributeJp,type,style);
    setShouldScroll(true);

  }

  useEffect(() => {
    setHiddenAttributeJp(MONSTER_ATTRIBUTES.find(attr => attr.en === attribute)?.ja || "");
  }, [attribute]);

  return (
    <>
    { isLoading && <div className={styles.loadingText}><Loading />生成中...</div> }
    <form className={styles.form} onSubmit={handleSubmit}>

      <div className={styles.formInner}>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            特徴
          </label>
          <input 
            id="description" 
            className={styles.input} 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="英語入力推奨 例: cute woman angry etc..."
            required
            autoComplete='off'
          />
          
        </div>
        <span className="text-sm w-fit relative top-[-10px] ml-5">
          ※複数の特徴を入力すると、より特徴を捉えたモンスターが生成されます。
        </span>

        <div className="grid gap-4 md:grid-cols-2">

          <div className={styles.formGroup}>
            <label htmlFor="attributes" className={styles.label}>属性</label>
            <select 
              id="attributes" 
              className={styles.select}
              onChange={(e) => setAttribute(e.target.value)}
              required
              value={attribute}
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

          <div className={styles.formGroup}>
            <label htmlFor="type" className={styles.label}>タイプ</label>
            <select 
              id="type" 
              className={styles.select}
              onChange={(e) => setType(e.target.value)}
              required
              value={type}
            >
              <option value="">選択してください</option>
              {MONSTER_TYPES.map((type) => (
                <option key={type.en} value={type.en}>
                  {type.ja}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
            <label htmlFor="style" className={styles.label}>スタイル</label>
            <select 
              id="style" 
              className={styles.select}
              onChange={(e) => setStyle(e.target.value)}
              required
              value={style}
            >
              <option value="">選択してください</option>
              {MONSTER_STYLES.map((style) => (
                <option key={style.en} value={style.en}>
                  {style.ja}
                </option>
              ))}
            </select>
        </div>
      </div>
      {!isLoading &&
        <>
          <div className={styles.submitButtonWrap}>
            <ButtonSubmit text={isGenerated ? "👾 再生成する" : "👾 モンスターを生成する"} className="buttonFull" />
          </div>
        </>
      }
    
    
    </form>
    </>
  )
}

export default MonsterFormDetail