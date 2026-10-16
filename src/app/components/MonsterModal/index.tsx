'use client'

import Image from 'next/image'
import { useEffect, useId, useRef } from 'react'
import { Monster } from '@/app/types/index'
import MonsterStats from '@/app/components/MonsterStats'
import { IconClose, IconDownload } from '@/app/components/Icons'
import { MONSTER_IMAGE_HEIGHT, MONSTER_IMAGE_WIDTH } from '@/app/constans/imageSize'
import { isBlobImageUrl } from '@/app/lib/allowedUrl'
import { formatCreatedDate, getAttributeStyle, getJob, getMonsterStats, getTypeLabel } from '@/app/lib/monsterProfile'
import styles from './index.module.scss'

type Props = {
  monster: Monster;
  // 閉じた後にフォーカスを戻す要素（開いた元のボタン）
  returnFocusTo: HTMLElement | null;
  onClose: () => void;
};

// 詳細のモーダル。ネイティブの <dialog> を showModal() で開く（フォーカスの閉じ込めと Esc は標準の動き）。
// 開いている時だけ描くので、サーバーとブラウザの表示は食い違わない
const MonsterModal = ({ monster, returnFocusTo, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 押し始めが外側（dialog 自身＝暗い部分）だったか。中で押して外で離した時に閉じないようにする
  const downOnBackdropRef = useRef(false);
  const titleId = useId();

  const job = getJob(monster.job);
  const jobName = job?.ja ?? '職業不明';
  const typeLabel = getTypeLabel(monster.type);
  const createdDate = formatCreatedDate(monster.createdAt);
  const stats = getMonsterStats(monster.job, monster.attribute);
  // 特徴は利用者が入力した文字。空なら出さない（性別は出さない）
  const description = typeof monster.description === 'string' ? monster.description.trim() : '';

  useEffect(() => {
    const dialog = dialogRef.current;
    // 開発時の二重実行（StrictMode）で開いたまま呼ばれても落ちないようにする
    if (dialog && !dialog.open) dialog.showModal();
    // 開いている間は背景のスクロールを止める。html に付ける（global.scss の scrollbar-gutter と同じ要素にそろえて、
    // スクロールバーが消えて画面がずれるのを防ぐ。iPhone の Safari でも body より html の方が止まる）
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      // ここでは dialog.close() を呼ばない（close イベント → onClose で、開いた直後に閉じてしまうため）
      root.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [returnFocusTo]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      style={getAttributeStyle(monster.attribute)}
      aria-labelledby={titleId}
      onClose={onClose}
      // 外側の暗い部分（::backdrop も dialog 自身として届く）を押したら閉じる。中身は inner が覆うので閉じない。
      // 押し始めと離した所の両方が外側の時だけ閉じる（中で押して外で離すと、click は共通の親の dialog に届くため）
      onPointerDown={(event) => {
        downOnBackdropRef.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (downOnBackdropRef.current && event.target === event.currentTarget) close();
        downOnBackdropRef.current = false;
      }}
    >
      {/* 開いた時に最初にフォーカスが当たるよう先頭に置く。中身がスクロールしても見えるよう、スクロールする枠（inner）の外に置く */}
      <button type="button" className={styles.close} aria-label="閉じる" onClick={close}>
        <IconClose className="size-6" />
      </button>
      <div className={styles.inner}>
        <div className={styles.figure}>
          {/* 元の縦横比のまま見せる（縦長も以前の正方形も切らない） */}
          <Image
            src={monster.imageUrl}
            alt={`${monster.attribute}属性の${jobName}のモンスター`}
            width={MONSTER_IMAGE_WIDTH}
            height={MONSTER_IMAGE_HEIGHT}
            sizes="(max-width: 767px) 92vw, 420px"
          />
        </div>

        <div className={styles.info}>
          <div className={styles.top}>
            <span className={styles.attribute}>{monster.attribute}</span>
            {typeLabel && <span className={styles.type}>{typeLabel}</span>}
          </div>
          <h2 id={titleId} className={styles.job}>{jobName}</h2>
          {job && <p className={styles.desc}>{job.desc}</p>}
          <div className={styles.meta}>
            <dl>
              <dt>属性</dt>
              <dd>{monster.attribute}</dd>
            </dl>
            {typeLabel && (
              <dl>
                <dt>タイプ</dt>
                <dd>{typeLabel}</dd>
              </dl>
            )}
            {createdDate && (
              <dl>
                <dt>作成日</dt>
                <dd><time dateTime={monster.createdAt}>{createdDate}</time></dd>
              </dl>
            )}
            {description && (
              <dl>
                <dt>特徴</dt>
                <dd className={styles.feature}>{description}</dd>
              </dl>
            )}
          </div>
          {stats && (
            <div className={styles.stats}>
              <MonsterStats stats={stats} size="lg" />
              <p className={styles.note}>得意・不得意は職業と属性で決まる目安です</p>
            </div>
          )}
          {isBlobImageUrl(monster.imageUrl) && (
            <a download="monster.png" href={monster.imageUrl} className={styles.download}>
              <IconDownload className="size-5" />
              <span>画像を保存</span>
            </a>
          )}
        </div>
      </div>
    </dialog>
  )
}

export default MonsterModal
