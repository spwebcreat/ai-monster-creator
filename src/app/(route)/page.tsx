import React from 'react'
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
        {/* 見出しと一覧は MonstersDisplay の中（ブラウザ側で取り直した一覧と揃えるため） */}
        <MonstersDisplay initialMonsters={monsters} />

        <div className={`w-[80%] md:w-[50%] mx-auto grid gap-4`}>
          <Button text="👾モンスターを生成する" href="/create" className="buttonFull"></Button>
          <p className="text-center">今日の生成回数: {todayCount}</p>
        </div>
      </div>
    </>

  )
}

export default Home
