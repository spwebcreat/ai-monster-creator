'use client'

import { Monster } from '@/app/types/index'
import styles from './index.module.scss'
import { useCallback, useEffect, useState } from 'react'
import Loading from '@/app/loading'
import { isBlobImageUrl } from '@/app/lib/allowedUrl'
import MonsterCard from '@/app/components/MonsterCard'
import MonsterShowcase from '@/app/components/MonsterShowcase'
import MonsterModal from '@/app/components/MonsterModal'

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
  // 詳細のモーダルで見ている 1 体と、閉じた後にフォーカスを戻す要素。最初は null（モーダルはブラウザ側で押された時だけ開く）
  const [detail, setDetail] = useState<{ monster: Monster; returnFocusTo: HTMLElement | null } | null>(null);
  const openDetail = useCallback((monster: Monster, returnFocusTo: HTMLElement | null) => setDetail({ monster, returnFocusTo }), []);
  const closeDetail = useCallback(() => setDetail(null), []);

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
  // 最新の 1 体は見せ場に出し、同じ絵が 2 回出ないよう一覧からは外す
  const [latestMonster, ...otherMonsters] = displayableMonsters;

  return (
    <>

        {/* <div className={styles.updateButtonWrap}>
          { isLoading ? <Loading /> : (
            <button onClick={fetchMonsters} disabled={isLoading } className={styles.updateButton}>データを更新</button>
          )}
        </div> */}


      <section>
        <h2 className={styles.title}>最新のモンスター</h2>
        {latestMonster ? (
          <MonsterShowcase monster={latestMonster} key={latestMonster.id} onOpen={openDetail} />
        ) : (
          <p className={styles.empty}>表示できるモンスターがいません。</p>
        )}
      </section>

      {otherMonsters.length > 0 && (
        <section>
          <h2 className={styles.title}>最近生成されたモンスター</h2>
          <div className={styles.list}>
            {otherMonsters.map((monster) => (
              <MonsterCard monster={monster} key={monster.id} onOpen={openDetail} />
            ))}
          </div>
        </section>
      )}

      {detail && <MonsterModal monster={detail.monster} returnFocusTo={detail.returnFocusTo} onClose={closeDetail} />}
    </>
  )
}

export default MonstersDisplay
