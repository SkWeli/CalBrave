import { useEffect, useState } from 'react'
import { getDailyQuests } from '../services/api'
import styles from './DailyQuests.module.css'

function DailyQuests({ refreshTrigger }) {
  const [quests, setQuests] = useState([])
  const [allCompleted, setAllCompleted] = useState(false)
  const [bonusAwarded, setBonusAwarded] = useState(false)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuests()
  }, [refreshTrigger])  // re-fetches whenever Dashboard tells it to

  async function loadQuests() {
    try {
      const data = await getDailyQuests()
      setQuests(data.quests)
      setAllCompleted(data.allCompleted)
      setBonusAwarded(data.bonusAwarded)
      setCompletedCount(data.completedCount)
    } catch (err) {
      console.log('Quest load error:', err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>🎯 Daily Quests</span>
        <span className={styles.progress}>
          {completedCount}/{quests.length} done
        </span>
      </div>

      {/* Quest List */}
      <div className={styles.questList}>
        {quests.map(quest => (
          <div
            key={quest.id}
            className={`${styles.questItem} ${quest.completed ? styles.completed : ''}`}
          >
            <div className={styles.questLeft}>
              <span className={styles.questEmoji}>{quest.emoji}</span>
              <div>
                <div className={styles.questTitle}>{quest.title}</div>
                <div className={styles.questDesc}>{quest.description}</div>
              </div>
            </div>
            <div className={styles.questRight}>
              {quest.completed
                ? <span className={styles.tick}>✅</span>
                : <span className={styles.bpBadge}>+{quest.bp} BP</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* All Quests Completed Banner */}
      {allCompleted && (
        <div className={styles.bonusBanner}>
          🎉 All quests blazed!
          {bonusAwarded
            ? ' +100 BP bonus awarded!'
            : ' Bonus incoming...'}
        </div>
      )}

      {/* Bonus BP hint */}
      {!allCompleted && (
        <div className={styles.hint}>
          Complete all 3 for a 🔥 <strong>+100 BP</strong> bonus!
        </div>
      )}

    </div>
  )
}

export default DailyQuests
