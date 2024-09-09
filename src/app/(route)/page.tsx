import React from 'react'
import styles from './page.module.scss'
import Image from 'next/image'
import  Button from '@/app/components/Button'
import { Monster } from '@/app/types/index'
import MonstersDisplay from '@/app/components/MonsterDisplay'


const Home = async () => {
  const { monsters, todayCount } = await getMonsters();

  async function getMonsters() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monsters`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // データ構造のチェックを追加
      if (!data || !Array.isArray(data.monsters)) {
        throw new Error('Invalid data format');
      }
      return { monsters: data.monsters as Monster[], todayCount: data.todayCount as number };
    } catch (error) {
      console.error('Failed to fetch monsters:', error);
      return { monsters: [], todayCount: 0 }; // エラーが発生した場合は空の配列を返す
    }
  }
  return (
    <>
      <div className="globalConatiner">
        <div className={styles.imageListTitle}>
          <h2> 👾 最近生成されたモンスター </h2>
        </div>
        <div className={styles.imageListWrap}>
          
          <div className={styles.imageList}>
            <MonstersDisplay kvMonsters={monsters} />
          </div>
        </div>

        <div className={`w-[80%] md:w-[50%] mx-auto grid gap-4`}>
          <Button text="👾モンスターを生成する" href="/create" className="buttonFull"></Button>
          <p className="text-center">今日の生成回数: {todayCount}</p>
        </div>
      </div>
    </>

  )
}

export default Home