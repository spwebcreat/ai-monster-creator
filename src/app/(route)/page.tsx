import React from 'react'
import  Button from '@/app/components/Button'
import MonstersDisplay from '@/app/components/MonsterDisplay'
import { IconSparkles } from '@/app/components/Icons'
import { getMonsters } from '@/app/lib/getMonsters'
import { MONSTER_FIRST_PAGE_SIZE } from '@/app/constans/paging'
import { unstable_noStore as noStore } from 'next/cache';

const Home = async () => {
  noStore();
  // 見せ場の 1 体＋一覧の 12 体。続きがあれば nextOffset が数で返り、「もっと見る」が出る
  const { monsters, todayCount, nextOffset } = await getMonsters({ offset: 0, limit: MONSTER_FIRST_PAGE_SIZE });
  return (
    <>
      <div className="globalConatiner">
        {/* 見出しと一覧は MonstersDisplay の中（ブラウザ側で取り直した一覧と揃えるため） */}
        <MonstersDisplay initialMonsters={monsters} initialNextOffset={nextOffset} />

        <div className={`w-[80%] md:w-[50%] mx-auto grid gap-4`}>
          <Button
            text="モンスターを生成する"
            href="/create"
            className="buttonFull"
            iconProps={{ icon: IconSparkles, className: "size-6 text-white" }}
          />
          <p className="text-center">今日の生成回数: {todayCount}</p>
        </div>
      </div>
    </>

  )
}

export default Home
