'use client'

import Image from 'next/image'
import { Monster } from '@/app/types/index'
import styles from './index.module.scss'
import { useEffect, useState } from 'react'
import Loading from '@/app/loading'
import { isBlobImageUrl } from '@/app/lib/allowedUrl'

// 描画してよいデータか（KV に残る過去のデータへの備え）。
// 画像は https の Vercel Blob の URL のみ。文字として描く項目は文字列のみ（オブジェクトだと一覧ごと描画に失敗するため）
const isDisplayableMonster = (monster: Monster | null | undefined): monster is Monster =>
  !!monster &&
  typeof monster.id === 'string' &&
  typeof monster.attribute === 'string' &&
  isBlobImageUrl(monster.imageUrl);

const MonstersDisplay = ({ initialMonsters }: { initialMonsters: Monster[] }) => {
  const [monsters, setMonsters] = useState(initialMonsters);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMonsters = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/monsters');
      const data = await res.json();
      setMonsters(data.monsters);
    } catch (error) {
      console.error('Failed to fetch monsters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonsters();
  }, []);


  const displayableMonsters = Array.isArray(monsters) ? monsters.filter(isDisplayableMonster) : [];

  return (
    <>
      
        {/* <div className={styles.updateButtonWrap}>
          { isLoading ? <Loading /> : (
            <button onClick={fetchMonsters} disabled={isLoading } className={styles.updateButton}>データを更新</button>
          )}
        </div> */}
      

      <div className={styles.imageList}>
        {displayableMonsters.map((monster) => (
          <div className={styles.imageListItem} key={monster.id}>
            <Image src={monster.imageUrl} alt={typeof monster.description === 'string' && monster.description ? monster.description : '生成されたモンスター'} width={800} height={800} />
            <div className={styles.imageItemTitle}>
              <ul className="monsterMeatList">
                <li>属性: {monster.attribute}</li>
                <li>タイプ: {
                  monster.type === 'Humanoid' ? '人型' : 
                  monster.type === 'Animal' ? '動物型' : 
                  monster.type === 'Mechanical' ? '機械型' : 
                  monster.type === 'Plant' ? '植物型' : ''
                }</li>
              </ul>
              <a download="monster.png" href={monster.imageUrl} className={styles.downloadButton}>ダウンロード</a>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default MonstersDisplay