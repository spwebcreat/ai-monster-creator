import React from 'react'
import styles from './page.module.scss'
import  Button from '@/app/components/Button'
import MonstersDisplay from '@/app/components/MonsterDisplay'
import { getMonsters } from '@/app/lib/getMonsters'
import { unstable_noStore as noStore } from 'next/cache';

const Home = async () => {
  noStore();
  const { monsters, todayCount } = await getMonsters();
  return (
    <>
      <div className="globalConatiner">
        <div className={styles.imageListTitle}>
          <h2> 👾 最近生成されたモンスター </h2>
        </div>
        <div className={styles.imageListWrap}>
          <MonstersDisplay initialMonsters={monsters} />
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