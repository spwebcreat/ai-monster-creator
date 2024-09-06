"use client";

import Image from "next/image";
import styles from "./page.module.scss";
import { useEffect, useState } from "react";
import MonsterForm from "@/app/components/MonsterForm";
import { fetchMonsterImg } from "@/app/lib/getImgApi";
import Loading from "@/app/loading"

export default function Home() {
  const [formData, setFormData] = useState( { description: "", attribute: "" , hiddenAttributeJp: "" ,type :""} );
  const [monsterImg, setMonsterImg] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const LoadingSection = () => (
    <Loading />
  );

  if (!isClient) {
    return null; // または適切なローディング表示
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>

        <h1 className={styles.title}>AI Monster Generator</h1>

        <MonsterForm 
          onSubmit={handleFormSubmit} 
          isLoading={isLoading}
          isGenerated={!!monsterImg}
        />
        <div className={styles.imageContainer}>
          {
            isLoading ? <LoadingSection /> :
            monsterImg && 
            <>
            <Image 
              src={monsterImg} 
              alt="生成されたモンスター画像" 
              width={256} 
              height={256} 
              className={styles.monsterImage}
              
            />
            <div className={styles.monsterMeta}>
              <p>特徴: <span className={styles.monsterText}>{formData.description}</span></p>
              <p>属性: <span className={styles.monsterText}>{formData.hiddenAttributeJp}</span></p>
              <p>タイプ: <span className={styles.monsterText}>{formData.type === 'human' ? '人型':'動物型'}</span></p>
            </div>
            <button onClick={handleSnsShare} className={styles.shareButton}>Xに投稿する</button>
            </>
          }
        </div>
      </main>
    </div>
  );
}
