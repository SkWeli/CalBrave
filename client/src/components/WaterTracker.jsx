import { useState } from 'react'
import { logWaterGlass } from '../services/api'
import styles from './WaterTracker.module.css'

function WaterTracker({ initialGlasses = 0, onUpdate }) {
  const [glasses, setGlasses] = useState(initialGlasses)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const GOAL = 8

  const handleAddGlass = async () => {
    if (glasses >= GOAL) return
    setLoading(true)

    try {
      const res = await logWaterGlass()
      setGlasses(res.glassesLogged)
      setMessage(res.message)

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)

      // Tell Dashboard to refresh BP stats
      if (onUpdate) onUpdate()

    } catch (err) {
      setMessage(err.message || 'Failed to log water')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>💧 Daily Water</span>
        <span className={styles.count}>{glasses}/{GOAL} glasses</span>
      </div>

      {/* Glass bubbles */}
      <div className={styles.glasses}>
        {Array.from({ length: GOAL }).map((_, i) => (
          <div
            key={i}
            className={`${styles.glass} ${i < glasses ? styles.filled : styles.empty}`}
          />
        ))}
      </div>

      {/* Feedback message */}
      {message && (
        <div className={styles.message}>{message}</div>
      )}

      {/* Button */}
      <button
        className={styles.button}
        onClick={handleAddGlass}
        disabled={loading || glasses >= GOAL}
      >
        {glasses >= GOAL
          ? '🔥 Water Goal Blazed!'
          : loading
            ? 'Logging...'
            : '+ Log a Glass  (+5 BP)'}
      </button>
    </div>
  )
}

export default WaterTracker
