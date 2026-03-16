import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import userService from '../services/userService'
import weightService from '../services/weightService'
import styles from './SetupPage.module.css'

function SetupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName]             = useState('')
  const [height, setHeight]         = useState('')
  const [weight, setWeight]         = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  function getTodayDate() {
    return new Date().toISOString().split('T')[0]}

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
    // Save both at the same time
    await Promise.all([
      userService.saveProfile({
        name,
        height: parseFloat(height),
        goalWeight: parseFloat(goalWeight),
        dateOfBirth: dateOfBirth || null
      }),
      weightService.logWeight(parseFloat(weight), getTodayDate())
    ])

    navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        <h1 className={styles.title}>🔥 Welcome to CalBrave</h1>
        <p className={styles.subtitle}>
          Let's set up your profile, {user.email}
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>

          <div className={styles.field}>
            <label className={styles.label}>Your Name</label>
            <input
              type="text"
              placeholder="e.g. Senuda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Height (cm)</label>
            <input
              type="number"
              placeholder="e.g. 173"
              min="100"
              max="250"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 80"
              min="30"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={styles.input}
              required
            />
          </div>


          <div className={styles.field}>
            <label className={styles.label}>Goal Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 74"
              min="30"
              max="300"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Date of Birth (optional)</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className={styles.button}
          >
            {saving ? 'Saving...' : 'Save & Go to Dashboard →'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default SetupPage
