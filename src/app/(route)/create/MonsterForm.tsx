'use client'

import styles from './Create.module.scss'
import Image from 'next/image'
import { ButtonShare , Button } from '@/app/components/Button'
import { fetchMonsterImg } from "@/app/lib/getImgApi";
import React, { useEffect, useState } from "react";
import MonsterFormDetail from './MonsterFormDetail'
import { IconShare,IconDownload } from '@/app/components/Icons'
import { v4 as uuidv4 } from 'uuid';
import { Monster } from '@/app/types/index';

const MonsterForm = () => {

  const [formData, setFormData] = useState( { description: "", attribute: "" , hiddenAttributeJp: "" ,type :"" , style:""} );
  const [monsterImg, setMonsterImg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [todayCount, setTodayCount] = useState();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const fetchTodayCount = async () => {
      const countResponse = await fetch('/api/monsters');
      const { todayCount } = await countResponse.json();
      setTodayCount(todayCount);
    };

    fetchTodayCount();
  }, []);

  if (!isClient) return null;


  const handleFormSubmit = async (description:string,attribute:string, hiddenAttributeJp:string,type:string,style:string) => {
    setErrorMessage(null);
    const countResponse = await fetch('/api/monsters');
    const { todayCount } = await countResponse.json();
    setTodayCount(todayCount);
    if (todayCount >= 100) { // 例: 1日の制限を100回に設定
      setErrorMessage('本日の生成限度に達しました。明日またお試しください。');
      return;
    }

    setIsLoading(true);
    setIsGenerated(false);
    setFormData({ description, attribute, hiddenAttributeJp, type, style });

    try {
      // GetImg.ai APIから画像URLを取得
      const tempImageUrl: string = await fetchMonsterImg({ description, attribute, type, style });

      // Vercel Blobに画像を保存
      const saveResponse = await fetch('/api/saveImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: tempImageUrl })
      });

      const { url: permanentImageUrl } = await saveResponse.json(); // ここを修正

      // 永続的なURLをモンスターデータに設定
      const newMonster: Monster = {
        id: uuidv4(),
        imageUrl: permanentImageUrl || '',
        description,
        attribute: hiddenAttributeJp,
        type,
        style,
        createdAt: new Date().toISOString()
      };

      // モンスターデータを保存
      const monsterResponse = await fetch('/api/monsters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMonster),
      });

      // モンスター画像を表示
      if(monsterResponse.ok) {
        setMonsterImg(permanentImageUrl);
      } else {
        throw new Error(`モンスター画像の保存に失敗しました: ${monsterResponse.status}`);
      }

    } catch(error) {
      console.error('モンスター画像の保存に失敗しました:', error);
      setErrorMessage('モンスター画像の保存に失敗しました。');

    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setIsGenerated(true);
      }, 2000);
    }

  };

  const handleSnsShare = () => {
    if (typeof window !== 'undefined') {
      const shareImg = encodeURIComponent(monsterImg || '');
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

        {monsterImg && monsterImg !== '' && !isLoading && (
          <Image 
            src={monsterImg} 
            alt="生成されたモンスター画像" 
            width={800} 
            height={800} 
            className={styles.monsterImage}
          />
        )}

        </div>

        <div className={styles.magicCircleImage}>
          {
            isLoading && <Image src="/img/magiCircle_active.png" alt="魔法陣アクティブ" width={800} height={600} className={`${styles.magicCircleImageActive} ${isGenerated && styles.isGenerated}`}/>
          }
          <Image src="/img/magiCircle_base.png" alt="魔法陣" width={800} height={600} />
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
        { errorMessage && <p className="text-center mt-4">{errorMessage}</p>}
        { todayCount && <p className="text-center mt-4">今日の生成回数: {todayCount}</p>}
    </div>
    

    
    
    </>
  )
}

export default MonsterForm