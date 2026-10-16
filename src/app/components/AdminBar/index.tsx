import styles from './index.module.scss'

// 管理モードの時だけ、画面の隅に小さく出す
const AdminBar = ({ onLogout }: { onLogout: () => void }) => (
  <div className={styles.bar} role="region" aria-label="管理モード">
    <span className={styles.label}>管理モード</span>
    <button type="button" className={styles.logout} onClick={onLogout}>ログアウト</button>
  </div>
)

export default AdminBar
