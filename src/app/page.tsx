"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { useState } from "react";
import MonsterForm from "./components/MonsterForm";
import fetchMonsterImg from "./lib/getImgApi";
import Loading from "react-loading";

export default function Home() {
  const [formData, setFormData] = useState( { description: "", attribute: "" , hiddenAttributeJp: ""} );
  const [monsterImg, setMonsterImg] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFormSubmit = async (description:string,attribute:string, hiddenAttributeJp:string) => {
    setIsLoading(true);
    setFormData({ description, attribute, hiddenAttributeJp })
    const imageUrl : string = await fetchMonsterImg({ description, attribute })
    setMonsterImg(imageUrl);
    setIsLoading(false);
  };

  const handleSnsShare = () => {
    const shareImg = encodeURIComponent(monsterImg);
    const shareText = encodeURIComponent(`モンスターを発見！属性: ${formData.hiddenAttributeJp} 特徴: ${formData.description} \n#AIモンスター画像ジェネレーター #モンスター画像生成`);
    const url = `https://x.com/intent/tweet?text=${shareText}&url=${shareImg}`;
    window.open(url, '_blank');
  }

  const LoadingSection = () => {
    return (
      <>
        <Loading
          type='spinningBubbles'
          color='#0070f3'
          height={80}
          width={80}
        />
      </>
    )
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
            <div className="flex items-center justify-center gap-4">
              <p>特徴: <span className="bg-gray-600 text-white px-2 py-1 rounded-md">{formData.description}</span></p>
              <p>属性: <span className="bg-gray-600 text-white px-2 py-1 rounded-md">{formData.hiddenAttributeJp}</span></p>
            </div>
            <button onClick={handleSnsShare} className={styles.shareButton}>Xに投稿する</button>
            </>
          }
        </div>
      </main>
    </div>
  );
}
