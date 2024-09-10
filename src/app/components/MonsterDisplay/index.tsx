'use client'

import Image from 'next/image'
import { Monster } from '@/app/types/index'
import styles from './index.module.scss'

const MonstersDisplay = ({ kvMonsters }: { kvMonsters: Monster[] }) => {
  return (
    <>
      {kvMonsters.map((monster) => (
        <div className={styles.imageListItem} key={monster.id}>
          <Image src={monster.imageUrl} alt={monster.description} width={800} height={800} />
          <div className={styles.imageItemTitle}>
            <ul>
              <li>属性: {monster.attribute}</li>
              <li>タイプ: {
                monster.type === 'Humanoid' ? '人型' : 
                monster.type === 'Animal' ? '動物型' : 
                monster.type === 'Mechanical' ? '機械型' : 
                monster.type === 'Plant' ? '植物型' : ''
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