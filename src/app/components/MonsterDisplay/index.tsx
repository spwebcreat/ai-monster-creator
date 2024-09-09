'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Monster } from '@/app/types/index'
import styles from './index.module.scss'

const MonstersDisplay = ({ kvMonsters }: { kvMonsters: Monster[] }) => {
  const [displayMonsters, setDisplayMonsters] = useState<Monster[]>(kvMonsters);

  useEffect(() => {
    const localMonsters: Monster[] = JSON.parse(localStorage.getItem('localMonsters') || '[]');
    const combinedMonsters = [...localMonsters, ...kvMonsters].slice(0, 5);
    setDisplayMonsters(combinedMonsters);
  }, [kvMonsters]);

  return (
    <>
      {displayMonsters.map((monster) => (
        <div className={styles.imageListItem} key={monster.id}>
          <Image src={monster.imageUrl} alt={monster.description} width={300} height={300} />
          <div className={styles.imageItemTitle}>
            <ul>
              <li>属性: {monster.attribute}</li>
              <li>タイプ: {
                monster.type === 'Humanoid' ? '人型' : 
                monster.type === 'Animal' ? '動物型' : 
                monster.type === 'Machine' ? '機械' : ''
              }</li>
              <li>スタイル: {
                monster.style === 'Realistic' ? 'リアル' :
                monster.style === 'Anime' ? 'アニメ風' :
                monster.style === 'Semi-realistic' ? 'リアル&アニメ' : ''
              }</li>
            </ul>
          </div>
        </div>
      ))}
    </>
  )
}

export default MonstersDisplay