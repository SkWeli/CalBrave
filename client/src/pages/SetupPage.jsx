import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import userService from '../services/userService'
import weightService from '../services/weightService'
import styles from './SetupPage.module.css'

function calculateBMITargetWeight(heightCm, currentWeight) {
  const heightM = heightCm / 100
  const bmi = currentWeight / (heightM * heightM)

  const minHealthy = 18.5 * (heightM * heightM)
  const maxHealthy = 24.9 * (heightM * heightM)

  let targetWeight
  let bmiStatus

  if (bmi < 18.5) {
    bmiStatus = 'underweight'
    targetWeight = Math.round(minHealthy * 10) / 10
  } else if (bmi > 24.9) {
    bmiStatus = 'overweight'
    targetWeight = Math.round(maxHealthy * 10) / 10
  } else {
    bmiStatus = 'healthy'
    targetWeight = Math.round(currentWeight * 10) / 10
  }

  return { bmi: Math.round(bmi * 10) / 10, bmiStatus, targetWeight }
}

function SetupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName]               = useState('')
  const [height, setHeight]           = useState('')
  const [weight, setWeight]           = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [gender, setGender]           = useState('male')

  function getTodayDate() {
    return new Date().toISOString().split('T')[0]
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // ✅ Calculate BMI inside handleSubmit using current state values
      const { bmi, bmiStatus, targetWeight } = calculateBMITargetWeight(
        parseFloat(height),
        parseFloat(weight)
      )

      await Promise.all([
        userService.saveProfile({
          name,
          height: parseFloat(height),
          gender,
          goalWeight: targetWeight,   // ← auto calculated
          bmi,
          bmiStatus,
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
            <label className={styles.label}>Gender</label>
            <div className={styles.genderToggle}>
              <button
                type="button"
                className={`${styles.genderBtn} ${gender === 'male' ? styles.active : ''}`}
                onClick={() => setGender('male')}
              >
                👨 Male
              </button>
              <button
                type="button"
                className={`${styles.genderBtn} ${gender === 'female' ? styles.active : ''}`}
                onClick={() => setGender('female')}
              >
                👩 Female
              </button>
            </div>
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
