'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { Monster } from '@/app/types/index'
import MonsterStats from '@/app/components/MonsterStats'
import { IconClose, IconDownload } from '@/app/components/Icons'
import { MONSTER_IMAGE_HEIGHT, MONSTER_IMAGE_WIDTH } from '@/app/constans/imageSize'
import { isBlobImageUrl } from '@/app/lib/allowedUrl'
import { AdminHideResult } from '@/app/lib/adminApi'
import { formatCreatedDate, getAttributeStyle, getJob, getMonsterStats, getTypeLabel } from '@/app/lib/monsterProfile'
import styles from './index.module.scss'

type Props = {
  monster: Monster;
  // 閉じた後にフォーカスを戻す要素（開いた元のボタン）
  returnFocusTo: HTMLElement | null;
  onClose: () => void;
  // 管理モードの時だけ渡す。無ければ「一覧から外す」は描かない
  admin?: { onHide: (monster: Monster) => Promise<AdminHideResult> };
};

const HIDE_ERRORS: Record<Exclude<AdminHideResult, 'ok'>, string> = {
  expired: '管理モードの期限が切れました。もう一度入ってください',
  error: '外せませんでした。時間をおいてお試しください',
};

// 詳細のモーダル。ネイティブの <dialog> を showModal() で開く（フォーカスの閉じ込めと Esc は標準の動き）。
// 開いている時だけ描くので、サーバーとブラウザの表示は食い違わない
const MonsterModal = ({ monster, returnFocusTo, onClose, admin }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 管理モード: 「一覧から外す」→ モーダルの中で確認 →「外す」
  const [isConfirming, setIsConfirming] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [hideError, setHideError] = useState<string | null>(null);
  const hideButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmId = useId();
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
      // 開いた元へフォーカスを戻す。画面は動かさない（スマホで見せ場の画像から開いた時に「詳しく見る」まで、
      // Safari で足したカードから開いた時にそのカードの職業名まで、閉じた途端に画面が動かないように）
      returnFocusTo?.focus({ preventScroll: true });
    };
  }, [returnFocusTo]);

  const close = () => dialogRef.current?.close();

  // 確認を出したら「やめる」へ、引っ込めたら「一覧から外す」へフォーカスを置く（誤って外さないよう、既定はやめる側）。
  // 値が変わった時だけ動かす（開いた時は「閉じる」に置いたままにする）
  const wasConfirmingRef = useRef(false);
  useEffect(() => {
    if (wasConfirmingRef.current === isConfirming) return;
    wasConfirmingRef.current = isConfirming;
    (isConfirming ? cancelButtonRef : hideButtonRef).current?.focus();
  }, [isConfirming]);

  const cancelConfirm = () => {
    setIsConfirming(false);
    setHideError(null);
  };

  const hide = async () => {
    if (!admin || isHiding) return;
    setIsHiding(true);
    setHideError(null);
    const result = await admin.onHide(monster);
    // 成功したら呼び出し側がこのモーダルを閉じる（このあと状態は更新しない）
    if (result === 'ok') return;
    setHideError(HIDE_ERRORS[result]);
    setIsHiding(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      style={getAttributeStyle(monster.attribute)}
      aria-labelledby={titleId}
      onClose={onClose}
      // 確認が出ている時の Esc は、モーダルではなく確認だけを閉じる
      // （Chrome は、間に操作が無いまま 2 回続けて Esc を押すと、こちらの指定に関係なくモーダルを閉じる）
      onCancel={(event) => {
        if (isConfirming && !isHiding) {
          event.preventDefault();
          cancelConfirm();
        }
      }}
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
          {admin && (
            <div className={styles.admin}>
              {isConfirming ? (
                <div className={styles.confirm} role="group" aria-labelledby={confirmId}>
                  <p id={confirmId}>一覧から外しますか。データは残り、元に戻せます</p>
                  <div className={styles.confirmButtons}>
                    <button type="button" className={styles.confirmHide} onClick={hide} disabled={isHiding}>
                      {isHiding ? '外しています' : '外す'}
                    </button>
                    <button type="button" ref={cancelButtonRef} className={styles.confirmCancel} onClick={cancelConfirm} disabled={isHiding}>
                      やめる
                    </button>
                  </div>
                  {hideError && <p className={styles.hideError} role="alert">{hideError}</p>}
                </div>
              ) : (
                <button type="button" ref={hideButtonRef} className={styles.hide} onClick={() => setIsConfirming(true)}>
                  一覧から外す
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}

export default MonsterModal
