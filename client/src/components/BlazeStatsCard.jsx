import styles from './BlazeStatsCard.module.css'

function BlazeStatsCard({ status }) {
  if (!status) return null

  const {
    totalBP = 0,
    level = 1,
    rank = '🌱 Beginner',
    bpToNextLevel = 0,
    nextLevelBP = null,
    currentStreak = 0,
    longestStreak = 0
  } = status

  // Progress bar percentage toward next level
  const progressPercent = nextLevelBP
    ? Math.max(0, Math.min(100, ((nextLevelBP - bpToNextLevel) / nextLevelBP) * 100))
    : 100

  return (
    <div className={styles.container}>

      {/* Top row — BP, Level, Rank */}
      <div className={styles.topRow}>
        <div className={styles.blazeBlock}>
          <span className={styles.blazeIcon}>🔥</span>
          <div>
            <div className={styles.bpNumber}>{totalBP.toLocaleString()}</div>
            <div className={styles.bpLabel}>Blaze Points</div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.levelBlock}>
          <div className={styles.levelNumber}>Level {level}</div>
          <div className={styles.rankText}>{rank}</div>
        </div>
      </div>

      {/* Progress bar to next level */}
      {nextLevelBP && (
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className={styles.progressLabel}>
            {bpToNextLevel.toLocaleString()} BP to Level {level + 1}
          </div>
        </div>
      )}

      {/* Bottom row — Streak stats */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statValue}>🔥 {currentStreak}</div>
          <div className={styles.statLabel}>Day Streak</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>🏆 {longestStreak}</div>
          <div className={styles.statLabel}>Longest</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statValue}>⭐ {level}</div>
          <div className={styles.statLabel}>Level</div>
        </div>
      </div>

    </div>
  )
}

export default BlazeStatsCard
