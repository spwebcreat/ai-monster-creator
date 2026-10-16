import Image from 'next/image'
import type { CSSProperties } from 'react'
import { Monster } from '@/app/types/index'
import MonsterStats from '@/app/components/MonsterStats'
import { MONSTER_IMAGE_HEIGHT, MONSTER_IMAGE_WIDTH } from '@/app/constans/imageSize'
import { formatCreatedDate, getAttributeStyle, getJob, getMonsterStats, getTypeLabel } from '@/app/lib/monsterProfile'
import styles from './index.module.scss'

// 0 以上 1 未満のばらつき。描画のたびに Math.random を使うとサーバーとブラウザで値が食い違うので、
// 無理数の倍数の小数部（決まった計算）で作る
const spread = (index: number, ratio: number) => (index * ratio) % 1;
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

type Range = [number, number];
// x は横の位置の範囲（%）。複数あれば粒子ごとに順番に振り分ける
type ParticleRange = { count: number; x: Range[]; size: Range; duration: Range; rise: Range; alpha: Range };

// 魔法陣から立ち上る粒子の大きさ・横の位置・速さ・開始の遅れ・昇る高さ（モンスターの高さに対する割合）
const makeParticles = ({ count, x, size, duration, rise, alpha }: ParticleRange) =>
  Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const between = ([min, max]: Range, ratio: number) => min + spread(n, ratio) * (max - min);
    const seconds = round(between(duration, 0.5698402910));
    return {
      '--x': `${round(between(x[index % x.length], 0.6180339887), 1)}%`,
      '--size': `${round(between(size, 0.7548776662), 1)}px`,
      '--duration': `${seconds}s`,
      // 遅れを負にして、開いた時から途中まで昇った粒子が見えるようにする
      '--delay': `${-round(spread(n, 0.4142135624) * seconds)}s`,
      '--drift': `${round((spread(n, 0.3247179572) - 0.5) * 40, 1)}px`,
      '--rise': round(between(rise, 0.2763932023)),
      '--alpha': round(between(alpha, 0.8392867552)),
    } as CSSProperties;
  });

// 後ろの粒子: 画像の左右（輪の両端寄り）から交互に生まれ、モンスターの頭の上まで昇る（画像の真後ろでは生まない＝隠れて無駄にしない）
const BACK_PARTICLES = makeParticles({ count: 22, x: [[4, 34], [66, 96]], size: [5, 12], duration: [3.2, 5.8], rise: [0.85, 1.2], alpha: [0.7, 1] });
// 手前の粒子: 足元の近くだけを低く昇り、顔の高さに届く前に消える
const FRONT_PARTICLES = makeParticles({ count: 8, x: [[28, 72]], size: [4, 7], duration: [2.6, 4], rise: [0.22, 0.38], alpha: [0.5, 0.8] });

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
          <div className={styles.particles} aria-hidden="true">
            {BACK_PARTICLES.map((style, index) => <i key={index} style={style} />)}
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
          <div className={`${styles.particles} ${styles.front}`} aria-hidden="true">
            {FRONT_PARTICLES.map((style, index) => <i key={index} style={style} />)}
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
