import { MONSTER_STAT_MAX } from '@/app/constans/atributes'
import { MonsterStat } from '@/app/lib/monsterProfile'
import styles from './index.module.scss'

const TAG_LABELS = { strong: '得意', weak: '不得意' } as const;

// 得意・不得意の棒。色は親の --ac（属性の色）を使う
const MonsterStats = ({ stats, size = 'sm' }: { stats: MonsterStat[]; size?: 'sm' | 'lg' }) => (
  <ul className={`${styles.stats} ${styles[size]}`} aria-label="得意・不得意">
    {stats.map(({ key, label, value, tag }) => (
      <li key={key} className={tag ? styles[tag] : undefined}>
        <span className={styles.label}>{label}</span>
        <span className={styles.bar} aria-hidden="true">
          {Array.from({ length: MONSTER_STAT_MAX }, (_, index) => (
            <i key={index} className={index < value ? styles.on : undefined} />
          ))}
        </span>
        <span className="sr-only">{`${MONSTER_STAT_MAX}段階中${value}`}</span>
        <span className={styles.tag}>{tag ? TAG_LABELS[tag] : ''}</span>
      </li>
    ))}
  </ul>
)

export default MonsterStats
