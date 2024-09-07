import React from 'react'
import styles from './page.module.scss'
import Image from 'next/image'
import  Button from '@/app/components/Button'
import { Monster } from '@/app/types/index'


async function getMonsters() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monsters`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format');
    }
    return data as Monster[];
  } catch (error) {
    console.error('Failed to fetch monsters:', error);
    return []; // エラーが発生した場合は空の配列を返す
  }
}

const Home = async () => {
  const monsters: Monster[] = await getMonsters();
  return (
    <>
      <div className="globalConatiner">

        <div className={styles.imageListWrap}>
          <div className={styles.imageListTitle}>
            <h2> 👾 最近生成されたモンスター </h2>
          </div>
          <div className={styles.imageList}>
            { monsters && monsters.map((monster) => {
              return (
                <div className={styles.imageListItem} key={monster.id}>
                  <Image src={monster.imageUrl} alt={monster.description} width={195} height={195} />
                  <div className={styles.imageItemTitle}>
                    <ul>
                      <li>属性: {monster.attribute}</li>
                      <li>タイプ: {monster.type}</li>
                      <li>スタイル: {monster.style}</li>
                    </ul>
                </div>
              </div>
              )
            })}
          </div>
        </div>

        <div className={`w-[80%] md:w-[50%] mx-auto grid gap-4`}>
          <Button text="👾モンスターを生成する" href="/create" className="buttonFull"></Button>
        </div>
      </div>
    </>

  )
}

export default Home