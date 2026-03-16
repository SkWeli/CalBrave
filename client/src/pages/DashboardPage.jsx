import { useState, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { useNavigate } from 'react-router-dom'
import weightService from '../services/weightService'
import userService from '../services/userService'
import styles from './DashboardPage.module.css'
import WeightChart from '../components/WeightChart'
import { getGamificationStatus } from '../services/api'
import BlazeStatsCard from '../components/BlazeStatsCard'
import WaterTracker from '../components/WaterTracker'
import DailyQuests from '../components/DailyQuests'


function DashboardPage() {

  // Auth 
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // State 
  const [profile, setProfile]       = useState(null)
  const [latestWeight, setLatestWeight] = useState(null)
  const [history, setHistory]       = useState([])
  const [weight, setWeight]         = useState('')
  const [date, setDate]             = useState(getTodayDate())
  const [saving, setSaving]         = useState(false)
  const [message, setMessage]       = useState('')
  const [loading, setLoading]       = useState(true)
  const [blazeStatus, setBlazeStatus] = useState(null)
  const [questRefresh, setQuestRefresh] = useState(0)


  // Helpers 
  function getTodayDate() {
    return new Date().toISOString().split('T')[0] // "2026-03-16"
  }

  // Load data when page opens 
  useEffect(() => {
    loadDashboardData()
    loadBlazeStatus()
  }, [])

  async function loadDashboardData() {
    try {
      const [profileRes, latestRes, historyRes] = await Promise.all([
        userService.getProfile().catch(() => ({ data: { profile: null } })),
        weightService.getLatest().catch(() => ({ data: { latest: null } })),
        weightService.getHistory()
      ])

      const profileData = profileRes.data.profile

    // New user — no profile yet → send to setup
      if (!profileData) {
      navigate('/setup')
      return
    }

      setProfile(profileRes.data.profile)
      setLatestWeight(latestRes.data.latest)
      setHistory(historyRes.data.logs)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Gamification
  const loadBlazeStatus = async () => {
    try {
        const status = await getGamificationStatus()
        setBlazeStatus(status)
        setQuestRefresh(prev => prev + 1)  // ← tells DailyQuests to reload
    } catch (err) {
        console.log('Blaze status error:', err.message)
    }
    }

  // Log weight 
  async function handleLogWeight(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await weightService.logWeight(parseFloat(weight), date)
      setMessage('✅ Weight logged successfully!')
      setWeight('')
      loadDashboardData() // refresh all data
      loadBlazeStatus() 
    } catch (error) {
      setMessage('❌ ' + (error.response?.data?.error || 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  // Logout 
  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Render 
  if (loading) {
    return <div className={styles.loading}>Loading your dashboard...</div>
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.logo}>🔥 CalBrave</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </header>

      <main className={styles.main}>

        {/* Welcome */}
        <h2 className={styles.welcome}>
          Welcome back, {profile?.name || user.email}! 👋
        </h2>

        {/* Stats Cards */}
        <div className={styles.statsRow}>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Current Weight</p>
            <p className={styles.cardValue}>
              {latestWeight ? `${latestWeight.weight} kg` : 'Not logged yet'}
            </p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Goal Weight</p>
            <p className={styles.cardValue}>
              {profile?.goalWeight ? `${profile.goalWeight} kg` : 'Not set'}
            </p>
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>To Go</p>
            <p className={styles.cardValue}>
              {latestWeight && profile?.goalWeight
                ? `${(latestWeight.weight - profile.goalWeight).toFixed(1)} kg`
                : '—'}
            </p>
          </div>
        </div>

        {/* Blaze Stats */}
        <BlazeStatsCard status={blazeStatus} />

        {/* Daily Quests */}
        <DailyQuests refreshTrigger={questRefresh} />

        {/* Water Tracker */}
        <WaterTracker
        initialGlasses={blazeStatus?.today?.waterGlasses || 0}
        onUpdate={loadBlazeStatus}
        />

        {/* Weight Chart */}
        <WeightChart
        history={history}
        goalWeight={profile?.goalWeight}
        />

        {/* Log Weight Form */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Log Today's Weight</h3>
          <form onSubmit={handleLogWeight} className={styles.logForm}>
            <input
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={styles.input}
              required
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
              required
            />
            <button type="submit" disabled={saving} className={styles.saveBtn}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
          {message && <p className={styles.message}>{message}</p>}
        </div>

        {/* Weight History */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Weight History</h3>
          {history.length === 0 ? (
            <p className={styles.empty}>No entries yet. Log your first weight above!</p>
          ) : (
            <div className={styles.historyList}>
              {[...history].reverse().map((entry) => (
                <div key={entry.date} className={styles.historyItem}>
                  <span className={styles.historyDate}>{entry.date}</span>
                  <span className={styles.historyWeight}>{entry.weight} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

export default DashboardPage
