import Image from 'next/image'
import { Monster } from '@/app/types/index'
import MonsterStats from '@/app/components/MonsterStats'
import { MONSTER_IMAGE_HEIGHT, MONSTER_IMAGE_WIDTH } from '@/app/constans/imageSize'
import { formatCreatedDate, getAttributeStyle, getJob, getMonsterStats, getTypeLabel } from '@/app/lib/monsterProfile'
import styles from './index.module.scss'

// 図鑑カード。属性の色の枠と印、職業名を一番大きく、職業の説明文・得意不得意の棒・作成日を添える（性別と特徴は出さない）
// monster.imageUrl は呼び出し側で isBlobImageUrl を通したものだけを渡す
const MonsterCard = ({ monster }: { monster: Monster }) => {
  const job = getJob(monster.job);
  const jobName = job?.ja ?? '職業不明';
  const typeLabel = getTypeLabel(monster.type);
  const createdDate = formatCreatedDate(monster.createdAt);
  const stats = getMonsterStats(monster.job, monster.attribute);

  return (
    <article className={styles.card} style={getAttributeStyle(monster.attribute)}>
      <div className={styles.top}>
        <span className={styles.attribute} title={`${monster.attribute}属性`}>{monster.attribute}</span>
        {typeLabel && <span className={styles.type}>{typeLabel}</span>}
      </div>
      {/* 枠は生成画像と同じ縦長。以前の正方形の画像は左右を切り、中央を見せる */}
      <div className={styles.frame} style={{ aspectRatio: `${MONSTER_IMAGE_WIDTH} / ${MONSTER_IMAGE_HEIGHT}` }}>
        <Image
          src={monster.imageUrl}
          alt={`${monster.attribute}属性の${jobName}のモンスター`}
          fill
          sizes="(max-width: 767px) 50vw, 240px"
        />
      </div>
      <h3 className={styles.job}>{jobName}</h3>
      {job && <p className={styles.desc}>{job.desc}</p>}
      {stats && <MonsterStats stats={stats} />}
      <div className={styles.foot}>
        {createdDate && <time dateTime={monster.createdAt}>{createdDate}</time>}
        <a download="monster.png" href={monster.imageUrl} className={styles.download} aria-label={`${jobName}の画像を保存`}>保存</a>
      </div>
    </article>
  )
}

export default MonsterCard
