'use client'

import { ButtonSubmit } from '@/app/components/Button'
import React, { useCallback, useEffect, useState } from 'react'
import { MONSTER_ATTRIBUTES, MONSTER_TYPES, MONSTER_STYLES, JOBS, GENDERS, DESCRIPTION_MAX_LENGTH } from '@/app/constans/atributes'
import styles from './Create.module.scss'
import type { MonsterFormProps } from '@/app/types'
import Loading from '@/app/loading'


const MonsterFormDetail = ({ onSubmit, isLoading, isGenerated }: MonsterFormProps) => {

  const [description, setDescription] = useState("");
  const [attribute, setAttribute] = useState("");
  const [job, setjob] = useState("");
  const [gender, setGender] = useState('');
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
    // 引数の順番は MonsterFormProps.onSubmit（受け側 handleFormSubmit）に合わせる
    onSubmit(description, job, gender, attribute, hiddenAttributeJp, type, style);
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
            placeholder="日本語でも英語でも入力できます 例: 赤いマント、金色の瞳、笑顔"
            autoComplete='off'
            maxLength={DESCRIPTION_MAX_LENGTH}
          />
          
        </div>
        <span className="text-sm w-fit relative top-[-10px] ml-5">
          ※複数の特徴を入力すると、より特徴を捉えたモンスターが生成されます。
        </span>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={styles.formGroup}>
            <label htmlFor="job" className={styles.label}>職業</label>
            <select 
              id="job" 
              className={styles.select}
              onChange={(e) => setjob(e.target.value)}
              required
              value={job}
            >
              <option value="">選択してください</option>
              {JOBS.map((job) => (
                <option key={job.en} value={job.en}>
                  {job.ja}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="gender" className={styles.label}>性別</label>
            <select 
              id="gender" 
              className={styles.select}
              onChange={(e) => setGender(e.target.value)}
              required
              value={gender}
            >
              <option value="">選択してください</option>
              {GENDERS.map((gender) => (
                <option key={gender.en} value={gender.en}>
                  {gender.ja}
                </option>
              ))}
            </select>
          </div>


        </div>

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