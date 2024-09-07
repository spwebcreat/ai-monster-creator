'use client'

import styles from './Create.module.scss'
import Image from 'next/image'
import { ButtonShare , Button } from '@/app/components/Button'
import Loading from "@/app/loading"
import { fetchMonsterImg } from "@/app/lib/getImgApi";
import React, { useEffect, useState } from "react";
import MonsterFormDetail from './MonsterFormDetail'
import { IconShare,IconDownload } from '@/app/components/Icons'

const MonsterForm = () => {

  const [formData, setFormData] = useState( { description: "", attribute: "" , hiddenAttributeJp: "" ,type :"" , style:""} );
  const [monsterImg, setMonsterImg] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;


  const handleFormSubmit = async (description:string,attribute:string, hiddenAttributeJp:string,type:string,style:string) => {
    setIsLoading(true);
    setIsGenerated(false);
    setFormData({ description, attribute, hiddenAttributeJp, type, style });
    const imageUrl : string = await fetchMonsterImg({ description, attribute, type, style });
    setMonsterImg(imageUrl);
    setTimeout(() => {
      setIsLoading(false);
      setIsGenerated(true);
    }, 2000);
  };

  const handleSnsShare = () => {
    if (typeof window !== 'undefined') {
      const shareImg = encodeURIComponent(monsterImg);
      const shareText = encodeURIComponent(`
        モンスターを作成しました！属性: ${formData.hiddenAttributeJp} 特徴: ${formData.description} \n#AIモンスター画像ジェネレーター #モンスター画像生成`
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
          {
            isLoading && <Image src="/img/magiCircle_active.png" alt="" width={800} height={600} className={`${styles.magicCircleImageActive} ${isGenerated && styles.isGenerated}`}/>
          }
          <Image src="/img/magiCircle_base.png" alt="" width={800} height={600} />
        </div>

        <div className={styles.imageContainer}>
          {
            monsterImg && !isLoading &&
            <>
              <div className={styles.monsterMeta}>
                <dl>
                  <dt>特徴</dt>
                  <dd>{formData.description}</dd>
                </dl>
                <dl>
                  <dt>属性</dt>
                  <dd>{formData.hiddenAttributeJp}</dd>
                </dl>
                <dl>
                  <dt>タイプ</dt>
                  <dd>{ 
                    (() => {
                      switch (formData.type) {
                        case 'Humanoid':
                          return '人型';
                        case 'Animal':
                          return '動物型';
                        case 'Mechanical':
                          return '機械型';
                        case 'Plant':
                          return '植物型';  
                      }
                    })()
                  }</dd>
                </dl>
                <dl>
                  <dt>スタイル</dt>
                  <dd>{ 
                    (() => {
                      switch (formData.style) {
                        case 'Anime':
                          return 'アニメ風';
                        case 'Realistic':
                          return 'リアル';
                        case 'Semi-realistic':
                          return 'リアル&アニメ風';
                      }
                    })()
                  }</dd>
                </dl>
              </div>

              <div className={styles.resultButtonGroup}>

                <ButtonShare 
                  text="Xでシェア" 
                  className="share" 
                  iconProps={{
                    icon: IconShare,
                    className: "size-6 text-white"
                  }}  
                  onClick={handleSnsShare}
                />

                <Button 
                  text="ダウンロード" 
                  className="download" 
                  iconProps={{
                    icon: IconDownload,
                    className: "size-6 text-white"
                  }} 
                  href={monsterImg} 
                  download={`a1-monster-creator-${new Date().getTime()}.png`}
                />

              </div>

            </>
          }

        </div>
        <MonsterFormDetail 
          onSubmit={handleFormSubmit} 
          isLoading={isLoading}
          isGenerated={!!monsterImg}
        />
    </div>
    

    
    
    </>
  )
}

export default MonsterForm