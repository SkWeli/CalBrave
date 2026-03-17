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
import CalorieTracker from '../components/CalorieTracker'
import { getTodayMeals } from '../services/api'
import BMIGauge from '../components/BMIGauge'
import MealLogger from '../components/MealLogger'
import LoadingScreen from '../components/LoadingScreen'


function DashboardPage() {

  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]           = useState(null)
  const [latestWeight, setLatestWeight] = useState(null)
  const [history, setHistory]           = useState([])
  const [weight, setWeight]             = useState('')
  const [date, setDate]                 = useState(getTodayDate())
  const [saving, setSaving]             = useState(false)
  const [message, setMessage]           = useState('')
  const [loading, setLoading]           = useState(true)
  const [blazeStatus, setBlazeStatus]   = useState(null)
  const [questRefresh, setQuestRefresh] = useState(0)
  const [mealData, setMealData]         = useState(null)


  function getTodayDate() {
    return new Date().toISOString().split('T')[0]
  }


  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchProfile(),
          fetchLatestWeight(),
          fetchWeightHistory(),
          fetchBlazeStatus(),
          fetchTodayMeals(),
        ])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])


  async function fetchProfile() {
    try {
      const res = await userService.getProfile()
      const profileData = res.data.profile
      if (!profileData) {
        navigate('/setup')
        return
      }
      setProfile(profileData)
    } catch (err) {
      // 404 means new user with no profile yet — send to setup
      if (err.response?.status === 404) {
        navigate('/setup')
        return
      }
      console.error('fetchProfile error:', err)
    }
  }

  async function fetchLatestWeight() {
    try {
      const res = await weightService.getLatest()
      setLatestWeight(res.data.latest)
    } catch (err) {
      console.error('fetchLatestWeight error:', err)
    }
  }

  async function fetchWeightHistory() {
    try {
      const res = await weightService.getHistory()
      setHistory(res.data.logs || [])
    } catch (err) {
      console.error('fetchWeightHistory error:', err)
    }
  }

  async function fetchBlazeStatus() {
    try {
      const status = await getGamificationStatus()
      setBlazeStatus(status)
      setQuestRefresh(prev => prev + 1)
    } catch (err) {
      console.log('Blaze status error:', err.message)
    }
  }

  async function fetchTodayMeals() {
    try {
      const data = await getTodayMeals()
      setMealData(data)
    } catch (err) {
      console.log('Meal data error:', err.message)
    }
  }

  function refreshAll() {
    fetchBlazeStatus()
    fetchTodayMeals()
  }

  async function handleLogWeight(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await weightService.logWeight(parseFloat(weight), date)
      setMessage('Weight logged successfully.')
      setWeight('')
      fetchLatestWeight()
      fetchWeightHistory()
      fetchBlazeStatus()
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }


  if (loading) return <LoadingScreen />


  return (
    <div className={styles.page}>

      <header className={styles.header}>
        <h1 className={styles.logo}>CalBrave</h1>
        <button onClick={handleLogout} className={styles.logoutBtn}>Sign out</button>
      </header>

      <main className={styles.main}>

        <div className={styles.welcomeRow}>
          <div>
            <p className={styles.welcomeLabel}>Good day</p>
            <h2 className={styles.welcome}>
              {profile?.name || user.email}
            </h2>
          </div>
          <p className={styles.welcomeDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsRow}>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Current Weight</p>
            <p className={styles.cardValue}>
              {latestWeight ? `${latestWeight.weight}` : '—'}
            </p>
            {latestWeight && <p className={styles.cardUnit}>kg</p>}
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Goal Weight</p>
            <p className={styles.cardValue}>
              {profile?.goalWeight ? `${profile.goalWeight}` : '—'}
            </p>
            {profile?.goalWeight && <p className={styles.cardUnit}>kg</p>}
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Remaining</p>
            <p className={styles.cardValue}>
              {latestWeight && profile?.goalWeight
                ? `${Math.abs(latestWeight.weight - profile.goalWeight).toFixed(1)}`
                : '—'}
            </p>
            {latestWeight && profile?.goalWeight && <p className={styles.cardUnit}>kg to go</p>}
          </div>
        </div>

        {/* BMI Gauge */}
        {profile?.bmi && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>BMI Overview</h3>
            <BMIGauge bmi={profile.bmi} />
          </div>
        )}

        {/* Blaze Stats */}
        <BlazeStatsCard status={blazeStatus} />

        {/* Daily Quests */}
        <DailyQuests refreshTrigger={questRefresh} />

        {/* Calorie Tracker */}
        <CalorieTracker mealData={mealData} onUpdate={refreshAll} />

        {/* Water Tracker */}
        <WaterTracker
          initialGlasses={blazeStatus?.today?.waterGlasses || 0}
          onUpdate={fetchBlazeStatus}
        />

        {/* Weight Chart */}
        <WeightChart history={history} goalWeight={profile?.goalWeight} />

        {/* Log Weight */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Log Weight</h3>
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
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </form>
          {message && (
            <p className={`${styles.message} ${message.includes('successfully') ? styles.messageSuccess : styles.messageError}`}>
              {message}
            </p>
          )}
        </div>

        {/* Weight History */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Weight History</h3>
          {history.length === 0 ? (
            <p className={styles.empty}>No entries yet. Log your first weight above.</p>
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
