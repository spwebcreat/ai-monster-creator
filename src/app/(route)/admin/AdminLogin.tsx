'use client'

import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin, AdminLoginResult } from '@/app/lib/adminApi'
import styles from './admin.module.scss'

const MESSAGES: Record<Exclude<AdminLoginResult, 'ok'>, string> = {
  wrong: '合言葉が違います',
  tooMany: 'しばらく時間をおいてください',
  unavailable: '管理モードは使えません',
  error: 'うまくいきませんでした。時間をおいてお試しください',
};

const AdminLogin = () => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);
    const result = await adminLogin(password);
    if (result === 'ok') {
      // 成功したらトップへ戻る（トップ側は開いた時に管理モードかを確かめる）。
      // router.refresh() は今のページ（/admin）を読み直して移動を打ち消すので呼ばない
      router.push('/');
      return;
    }
    setMessage(MESSAGES[result]);
    setIsSubmitting(false);
    inputRef.current?.select();
  };

  return (
    <section className={styles.panel} aria-labelledby="admin-title">
      <h2 id="admin-title" className={styles.title}>管理モード</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="admin-password" className={styles.label}>合言葉</label>
        <input
          ref={inputRef}
          id="admin-password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          aria-describedby={message ? 'admin-message' : undefined}
          aria-invalid={message ? true : undefined}
        />
        <button type="submit" className={styles.submit} disabled={isSubmitting || !password}>
          {isSubmitting ? '確かめています' : '入る'}
        </button>
        {message && <p id="admin-message" className={styles.message} role="alert">{message}</p>}
      </form>
    </section>
  )
}

export default AdminLogin
