import { useState, useEffect } from "react";
import useAuth from "../context/useAuth";
import { useNavigate } from "react-router-dom";

import weightService from "../services/weightService";
import userService from "../services/userService";
import { getGamificationStatus, getTodayMeals } from "../services/api";

import styles from "./DashboardPage.module.css";

import WeightChart from "../components/WeightChart";
import BlazeStatsCard from "../components/BlazeStatsCard";
import WaterTracker from "../components/WaterTracker";
import DailyQuests from "../components/DailyQuests";
import CalorieTracker from "../components/CalorieTracker";
import BMIGauge from "../components/BMIGauge";
import LoadingScreen from "../components/LoadingScreen";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("calbrave-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("calbrave-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  // ── Data ──────────────────────────────────────────────────────────────────
  const [profile, setProfile]         = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [history, setHistory]         = useState([]);
  const [weight, setWeight]           = useState("");
  const [date, setDate]               = useState(getTodayDate());
  const [saving, setSaving]           = useState(false);
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(true);
  const [blazeStatus, setBlazeStatus] = useState(null);
  const [questRefresh, setQuestRefresh] = useState(0);
  const [mealData, setMealData]       = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchProfile(),
          fetchLatestWeight(),
          fetchWeightHistory(),
          fetchBlazeStatus(),
          fetchTodayMeals(),
        ]);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  async function fetchProfile() {
    try {
      const res = await userService.getProfile();
      const profileData = res.data.profile;
      if (!profileData) { navigate("/setup"); return; }
      setProfile(profileData);
    } catch (err) {
      if (err.response?.status === 404) { navigate("/setup"); return; }
      console.error("fetchProfile error:", err);
    }
  }

  async function fetchLatestWeight() {
    try {
      const res = await weightService.getLatest();
      setLatestWeight(res.data.latest);
    } catch (err) {
      console.error("fetchLatestWeight error:", err);
    }
  }

  async function fetchWeightHistory() {
    try {
      const res = await weightService.getHistory();
      setHistory(res.data.logs || []);
    } catch (err) {
      console.error("fetchWeightHistory error:", err);
    }
  }

  async function fetchBlazeStatus() {
    try {
      const status = await getGamificationStatus();
      setBlazeStatus(status);
      setQuestRefresh(prev => prev + 1);
    } catch (err) {
      console.log("Blaze status error:", err.message);
    }
  }

  async function fetchTodayMeals() {
    try {
      const data = await getTodayMeals();
      setMealData(data);
    } catch (err) {
      console.log("Meal data error:", err.message);
    }
  }

  function refreshAll() {
    fetchBlazeStatus();
    fetchTodayMeals();
  }

  async function handleLogWeight(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await weightService.logWeight(parseFloat(weight), date);
      setMessage("Weight logged successfully.");
      setWeight("");
      fetchLatestWeight();
      fetchWeightHistory();
      fetchBlazeStatus();
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <h1 className={styles.logo}>CalBrave</h1>

        <div className={styles.headerRight}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={styles.themeBtn}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              /* Sun icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              /* Moon icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {/* Welcome */}
        <div className={styles.welcomeRow}>
          <div>
            <p className={styles.welcomeLabel}>Good day</p>
            <h2 className={styles.welcome}>
              {profile?.name || user?.email || user?.username || "User"}
            </h2>
          </div>
          <p className={styles.welcomeDate}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Stats cards */}
        <div className={styles.statsRow}>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Current Weight</p>
            <p className={styles.cardValue}>{latestWeight ? latestWeight.weight : "—"}</p>
            {latestWeight && <p className={styles.cardUnit}>kg</p>}
          </div>

          <div className={styles.card}>
            <p className={styles.cardLabel}>Goal Weight</p>
            <p className={styles.cardValue}>{profile?.goalWeight ?? "—"}</p>
            {profile?.goalWeight && <p className={styles.cardUnit}>kg</p>}
          </div>

          <div className={styles.card}>
            <p className={styles.cardLabel}>Remaining</p>
            <p className={styles.cardValue}>
              {latestWeight && profile?.goalWeight
                ? Math.abs(latestWeight.weight - profile.goalWeight).toFixed(1)
                : "—"}
            </p>
            {latestWeight && profile?.goalWeight && (
              <p className={styles.cardUnit}>kg to go</p>
            )}
          </div>
        </div>

        {/* BMI */}
        {profile?.bmi && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>BMI Overview</h3>
            <BMIGauge bmi={profile.bmi} />
          </div>
        )}

        <BlazeStatsCard status={blazeStatus} />
        <DailyQuests refreshTrigger={questRefresh} />
        <CalorieTracker mealData={mealData} onUpdate={refreshAll} />
        <WaterTracker
          initialGlasses={blazeStatus?.today?.waterGlasses || 0}
          onUpdate={fetchBlazeStatus}
        />
        <WeightChart history={history} goalWeight={profile?.goalWeight} />

        {/* Log weight */}
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
              onChange={e => setWeight(e.target.value)}
              className={styles.input}
              required
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={styles.input}
              required
            />
            <button type="submit" disabled={saving} className={styles.saveBtn}>
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </form>
          {message && (
            <p className={`${styles.message} ${
              message.includes("successfully") ? styles.messageSuccess : styles.messageError
            }`}>
              {message}
            </p>
          )}
        </div>

        {/* Weight history */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Weight History</h3>
          {history.length === 0 ? (
            <p className={styles.empty}>No entries yet. Log your first weight above.</p>
          ) : (
            <div className={styles.historyList}>
              {[...history].reverse().map(entry => (
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
  );
}

export default DashboardPage;