'use client'

import styles from './Create.module.scss'
import Image from 'next/image'
import Button from '@/app/components/Button'
import Loading from "@/app/loading"
import { fetchMonsterImg } from "@/app/lib/getImgApi";
import React, { useEffect, useState } from "react";
import MonsterFormDetail from './MonsterFormDetail'



const MonsterForm = () => {

  const [formData, setFormData] = useState( { description: "", attribute: "" , hiddenAttributeJp: "" ,type :""} );
  const [monsterImg, setMonsterImg] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;


  const handleFormSubmit = async (description:string,attribute:string, hiddenAttributeJp:string,type:string) => {
    setIsLoading(true);
    setFormData({ description, attribute, hiddenAttributeJp, type });
    const imageUrl : string = await fetchMonsterImg({ description, attribute, type });
    setMonsterImg(imageUrl);
    setIsLoading(false);
  };

  const handleSnsShare = () => {
    if (typeof window !== 'undefined') {
      const shareImg = encodeURIComponent(monsterImg);
      const shareText = encodeURIComponent(`
        モンスターを発見！属性: ${formData.hiddenAttributeJp} 特徴: ${formData.description} \n#AIモンスター画像ジェネレーター #モンスター画像生成`
      );
      const url = `https://x.com/intent/tweet?text=${shareText}&url=${shareImg}`;
      window.open(url, '_blank');
    }
  }



  return (
    <>
    
    <div className={styles.magicCircle}>
        
        <div className={`${styles.monsterCard} ${isLoading && styles.isLoading} ${monsterImg && styles.createdImg}`}>
          { monsterImg && !isLoading &&
              <Image 
                src={monsterImg} 
                alt="生成されたモンスター画像" 
                width={800} 
                height={800} 
                className={styles.monsterImage}
            />

          }

        </div>

        <div className={styles.magicCircleImage}>
          {isLoading && 
            <Image src="/img/magiCircle_active.png" alt="" width={800} height={600} className={styles.magicCircleImageActive}/>
          }
          <Image src="/img/magiCircle_base.png" alt="" width={800} height={600} />
        </div>

        <div className={styles.imageContainer}>
          {
            isLoading ? <Loading/> :
            monsterImg && 
            <>
              <div className={styles.monsterMeta}>
                <p>特徴: <span className={styles.monsterText}>{formData.description}</span></p>
                <p>属性: <span className={styles.monsterText}>{formData.hiddenAttributeJp}</span></p>
                <p>タイプ: <span className={styles.monsterText}>{formData.type === 'human' ? '人型':'動物型'}</span></p>
              </div>
              <button onClick={handleSnsShare} className={styles.shareButton}>Xに投稿する</button>
            </>
          }
        </div>
        
    </div>
    
        <MonsterFormDetail 
          onSubmit={handleFormSubmit} 
          isLoading={isLoading}
          isGenerated={!!monsterImg}
        />
    
    
    </>
  )
}

export default MonsterForm