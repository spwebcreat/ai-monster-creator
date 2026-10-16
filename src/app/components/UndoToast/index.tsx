'use client'

import { useEffect, useRef } from 'react'
import styles from './index.module.scss'

type Props = {
  message: string;
  // 「元に戻す」などのボタン。無ければ文言だけ
  action?: { label: string; onClick: () => void };
  // 出た時にボタンへフォーカスを移す（一覧から外した直後。外したカードのボタンは消えているため）
  focusAction?: boolean;
  // 表示する時間（ミリ秒）
  duration: number;
  onDismiss: () => void;
};

// 画面の下に短い時間だけ出すお知らせ。フォーカスやマウスが中にある間は消さない
const UndoToast = ({ message, action, focusAction = false, duration, onDismiss }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    if (focusAction) actionRef.current?.focus();
  }, [focusAction]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const isFocused = !!rootRef.current?.contains(document.activeElement);
      // 使っている最中に消すとフォーカスが行き場を失うので、離れるまで待つ
      if (isFocused || isHoveredRef.current) timer = setTimeout(check, 1000);
      else onDismiss();
    };
    timer = setTimeout(check, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      ref={rootRef}
      className={styles.toast}
      role="status"
      onMouseEnter={() => { isHoveredRef.current = true; }}
      onMouseLeave={() => { isHoveredRef.current = false; }}
    >
      <span>{message}</span>
      {action && (
        <button type="button" ref={actionRef} className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export default UndoToast
