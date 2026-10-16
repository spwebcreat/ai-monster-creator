'use client'

import { Monster } from '@/app/types/index'
import styles from './index.module.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import Loading from '@/app/loading'
import { isBlobImageUrl } from '@/app/lib/allowedUrl'
import { fetchMonsterPage } from '@/app/lib/monsterPage'
import { adminLogout, AdminHideResult, fetchAdminSession, setMonsterHidden } from '@/app/lib/adminApi'
import { MONSTER_FIRST_PAGE_SIZE, MONSTER_PAGE_SIZE } from '@/app/constans/paging'
import MonsterCard from '@/app/components/MonsterCard'
import MonsterShowcase from '@/app/components/MonsterShowcase'
import MonsterModal from '@/app/components/MonsterModal'
import AdminBar from '@/app/components/AdminBar'
import UndoToast from '@/app/components/UndoToast'

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

// 一覧から外した直後に出すお知らせ。undo があれば「元に戻す」を出す（index は外す前の位置）
type Toast = {
  key: number;
  message: string;
  undo?: { monster: Monster; index: number };
};

// 「元に戻す」を出しておく時間と、文言だけのお知らせの時間（ミリ秒）
const UNDO_TOAST_MS = 8000;
const INFO_TOAST_MS = 3000;

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
  // 続きを読んだ後・元に戻した後に、そのカードへフォーカスを移すための id
  const focusIdRef = useRef<string | null>(null);
  const hasLoadedMoreRef = useRef(false);
  // 詳細のモーダルで見ている 1 体と、閉じた後にフォーカスを戻す要素。最初は null（モーダルはブラウザ側で押された時だけ開く）
  const [detail, setDetail] = useState<{ monster: Monster; returnFocusTo: HTMLElement | null } | null>(null);
  const openDetail = useCallback((monster: Monster, returnFocusTo: HTMLElement | null) => setDetail({ monster, returnFocusTo }), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  // 管理モードか。ブラウザ側で確かめるまでは false（サーバーの描画には管理用の要素を一切出さない）
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

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

  useEffect(() => {
    let cancelled = false;
    fetchAdminSession().then((admin) => {
      if (!cancelled) setIsAdmin(admin);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    await adminLogout();
    setIsAdmin(false);
    setToast(null);
  };

  // 一覧から外す（データは残る）。外したら画面から取り除き、モーダルを閉じて「元に戻す」を出す
  const hideMonster = async (monster: Monster): Promise<AdminHideResult> => {
    const result = await setMonsterHidden(monster.id, true);
    if (result !== 'ok') return result;
    const index = monsters.findIndex((item) => item?.id === monster.id);
    setMonsters((current) => current.filter((item) => item?.id !== monster.id));
    // 並びが 1 つ詰まるので、続きの位置も 1 つ戻す（重複は足す時に除くので、どちらの数え方の API でも欠けは出ない）
    setNextOffset((current) => (current === null ? null : Math.max(0, current - 1)));
    setDetail(null);
    setToast({ key: Date.now(), message: '一覧から外しました', undo: { monster, index } });
    return 'ok';
  };

  const undoHide = async ({ monster, index }: { monster: Monster; index: number }) => {
    const result = await setMonsterHidden(monster.id, false);
    if (result !== 'ok') {
      setToast({
        key: Date.now(),
        message: result === 'expired' ? '管理モードの期限が切れたため、元に戻せませんでした' : '元に戻せませんでした',
      });
      return;
    }
    setMonsters((current) =>
      current.some((item) => item?.id === monster.id)
        ? current
        : [...current.slice(0, Math.max(0, index)), monster, ...current.slice(Math.max(0, index))],
    );
    setNextOffset((current) => (current === null ? null : current + 1));
    // 「元に戻す」のボタンは消えるので、戻したカードへフォーカスを移す
    focusIdRef.current = monster.id;
    setToast({ key: Date.now(), message: '元に戻しました' });
  };

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
    // 見せ場（一覧の外）に戻ることもあるので、ページ全体から探す
    document.querySelector<HTMLButtonElement>(`[data-monster-id="${CSS.escape(id)}"] button`)?.focus();
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
          <div className={styles.list}>
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

      {detail && (
        <MonsterModal
          monster={detail.monster}
          returnFocusTo={detail.returnFocusTo}
          onClose={closeDetail}
          admin={isAdmin ? { onHide: hideMonster } : undefined}
        />
      )}

      {/* 管理モードでない人には、以下を一切描かない */}
      {isAdmin && <AdminBar onLogout={logout} />}
      {toast && (
        <UndoToast
          key={toast.key}
          message={toast.message}
          action={toast.undo ? { label: '元に戻す', onClick: () => toast.undo && undoHide(toast.undo) } : undefined}
          focusAction={!!toast.undo}
          duration={toast.undo ? UNDO_TOAST_MS : INFO_TOAST_MS}
          onDismiss={dismissToast}
        />
      )}
    </>
  )
}

export default MonstersDisplay
