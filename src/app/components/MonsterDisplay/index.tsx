'use client'

import { Monster } from '@/app/types/index'
import styles from './index.module.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import Loading from '@/app/loading'
import { isBlobImageUrl } from '@/app/lib/allowedUrl'
import { fetchMonsterPage } from '@/app/lib/monsterPage'
import { MONSTER_FIRST_PAGE_SIZE, MONSTER_PAGE_SIZE } from '@/app/constans/paging'
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

// 足す分から、もう持っている id を除く（読み込みの間に新しい体が生成されると、続きの位置がずれて同じ体が返るため）
const appendNew = (current: Monster[], incoming: Monster[]) => {
  const known = new Set(current.map((monster) => monster?.id));
  return incoming.filter((monster) => monster && !known.has(monster.id));
};

type Props = {
  initialMonsters: Monster[];
  // 続きを読む時の offset。続きが無ければ null
  initialNextOffset?: number | null;
};

const MonstersDisplay = ({ initialMonsters, initialNextOffset = null }: Props) => {
  const [monsters, setMonsters] = useState(initialMonsters);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  // 画面読み上げ向けの短いお知らせ（「12体を追加しました」など）
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  // 続きを読んだ後に、足した最初のカードへフォーカスを移すための id
  const focusIdRef = useRef<string | null>(null);
  const hasLoadedMoreRef = useRef(false);
  // 詳細のモーダルで見ている 1 体と、閉じた後にフォーカスを戻す要素。最初は null（モーダルはブラウザ側で押された時だけ開く）
  const [detail, setDetail] = useState<{ monster: Monster; returnFocusTo: HTMLElement | null } | null>(null);
  const openDetail = useCallback((monster: Monster, returnFocusTo: HTMLElement | null) => setDetail({ monster, returnFocusTo }), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  // 開いた直後に最初のまとまりを取り直す（生成ページから戻った時などに最新を出すため）。
  // 利用者が先に「もっと見る」を押していたら、足した分を消さないよう取り直しの結果は使わない
  useEffect(() => {
    let cancelled = false;
    fetchMonsterPage(0, MONSTER_FIRST_PAGE_SIZE)
      .then((page) => {
        if (cancelled || hasLoadedMoreRef.current) return;
        setMonsters(page.monsters);
        setNextOffset(page.nextOffset);
      })
      .catch((error) => console.error('Failed to fetch monsters:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (nextOffset === null || isLoadingMore) return;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    setAnnouncement('');
    try {
      const page = await fetchMonsterPage(nextOffset, MONSTER_PAGE_SIZE);
      const added = appendNew(monsters, page.monsters);
      hasLoadedMoreRef.current = true;
      setHasLoadedMore(true);
      setMonsters((current) => [...current, ...appendNew(current, added)]);
      setNextOffset(page.nextOffset);
      const addedCount = added.filter(isDisplayableMonster).length;
      focusIdRef.current = added.find(isDisplayableMonster)?.id ?? null;
      setAnnouncement(addedCount > 0 ? `${addedCount}体を追加しました` : '新しく表示できるモンスターはありませんでした');
    } catch (error) {
      console.error('Failed to fetch more monsters:', error);
      setLoadMoreError('読み込めませんでした。もう一度お試しください。');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 足した最初のカードへフォーカスを移す（キーボードで続きのカードへそのまま進めるように。カードは元のボタンの位置に出る）
  useEffect(() => {
    const id = focusIdRef.current;
    if (!id) return;
    focusIdRef.current = null;
    listRef.current?.querySelector<HTMLButtonElement>(`[data-monster-id="${CSS.escape(id)}"] button`)?.focus();
  }, [monsters]);

  const displayableMonsters = Array.isArray(monsters) ? monsters.filter(isDisplayableMonster) : [];
  // 最新の 1 体は見せ場に出し、同じ絵が 2 回出ないよう一覧からは外す
  const [latestMonster, ...otherMonsters] = displayableMonsters;

  return (
    <>
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
          <div className={styles.list} ref={listRef}>
            {otherMonsters.map((monster) => (
              <MonsterCard monster={monster} key={monster.id} onOpen={openDetail} />
            ))}
          </div>

          {nextOffset !== null && (
            <div className={styles.more}>
              <button type="button" className={styles.moreButton} onClick={loadMore} disabled={isLoadingMore} aria-busy={isLoadingMore}>
                {isLoadingMore ? (
                  <>
                    <Loading />
                    <span>読み込み中</span>
                  </>
                ) : (
                  'もっと見る'
                )}
              </button>
            </div>
          )}
          {loadMoreError && <p className={styles.moreError} role="status">{loadMoreError}</p>}
          {nextOffset === null && hasLoadedMore && <p className={styles.moreEnd}>すべて表示しました</p>}
          <p className="sr-only" aria-live="polite">{announcement}</p>
        </section>
      )}

      {detail && <MonsterModal monster={detail.monster} returnFocusTo={detail.returnFocusTo} onClose={closeDetail} />}
    </>
  )
}

export default MonstersDisplay
