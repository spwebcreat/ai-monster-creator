import Image from 'next/image'
import { Monster } from '@/app/types/index'
import MonsterStats from '@/app/components/MonsterStats'
import { MONSTER_IMAGE_HEIGHT, MONSTER_IMAGE_WIDTH } from '@/app/constans/imageSize'
import { formatCreatedDate, getAttributeStyle, getJob, getMonsterStats, getTypeLabel } from '@/app/lib/monsterProfile'
import styles from './index.module.scss'

// 見せ場。最新の 1 体を生成ページと同じ魔法陣の上に浮かべ、横に職業・属性・得意不得意の表を置く（スマホは縦に積む）
// monster.imageUrl は呼び出し側で isBlobImageUrl を通したものだけを渡す
const MonsterShowcase = ({ monster }: { monster: Monster }) => {
  const job = getJob(monster.job);
  const jobName = job?.ja ?? '職業不明';
  const typeLabel = getTypeLabel(monster.type);
  const createdDate = formatCreatedDate(monster.createdAt);
  const stats = getMonsterStats(monster.job, monster.attribute);

  return (
    <div className={styles.showcase} style={getAttributeStyle(monster.attribute)}>
      <div className={styles.stage}>
        {/* 魔法陣の輪（幅はここで決まる）。モンスターは輪の中心の少し上に立たせる */}
        <div className={styles.ring}>
          <div className={styles.circle} aria-hidden="true">
            <Image src="/img/magiCircle_active.png" alt="" width={907} height={715} className={styles.glow} priority />
            <Image src="/img/magiCircle_base.png" alt="" width={800} height={600} priority />
          </div>
          {/* 画像は元の縦横比のまま見せる（縦長も以前の正方形も切らない） */}
          <div className={styles.monster}>
            <Image
              src={monster.imageUrl}
              alt={`${monster.attribute}属性の${jobName}のモンスター`}
              width={MONSTER_IMAGE_WIDTH}
              height={MONSTER_IMAGE_HEIGHT}
              sizes="(max-width: 767px) 66vw, 320px"
              priority
            />
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <span className={styles.badge}>最新</span>
        <h3 className={styles.job}>{jobName}</h3>
        {job && <p className={styles.desc}>{job.desc}</p>}
        <div className={styles.meta}>
          <dl>
            <dt>属性</dt>
            <dd><span className={styles.attribute} aria-hidden="true" />{monster.attribute}</dd>
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
        </div>
        {stats && (
          <div className={styles.stats}>
            <MonsterStats stats={stats} size="lg" />
            <p className={styles.note}>得意・不得意は職業と属性で決まる目安です</p>
          </div>
        )}
        <a download="monster.png" href={monster.imageUrl} className={styles.download}>このモンスターを保存</a>
      </div>
    </div>
  )
}

export default MonsterShowcase
