import { Navigate } from "react-router-dom";
import useAuth from "../context/useAuth";
import styles from "./LoginPage.module.css";

function LoginPage() {
  const { isAuthenticated, loading, error, login } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  // Asgardeo is still initialising — show spinner
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner}></div>
          <p>Loading CalBrave…</p>
        </div>
      </div>
    );
  }

  // Already signed in — hand off to callback logic
  if (isAuthenticated) {
    return <Navigate to="/auth/callback" replace />;
  }

  return (
    <div className={styles.page}>
      {/* ── Left hero panel ──────────────────────────────── */}
      <section className={styles.leftPanel}>
        <div className={styles.brandBlock}>
          <p className={styles.logoText}>CalBrave<span>🔥</span></p>

          <h1 className={styles.heroTitle}>
            Your personal health journey tracker
          </h1>

          <p className={styles.heroSub}>
            {/*Weight, meals, water, streaks, and Blaze Points - all in one place.*/}
          </p>

          <ul className={styles.featureList}>
            <li><span className={styles.featureIcon}>📊</span> Weight &amp; BMI tracking</li>
            <li><span className={styles.featureIcon}>🍽️</span> Calorie &amp; meal logging</li>
            <li><span className={styles.featureIcon}>💧</span> Daily water intake</li>
            <li><span className={styles.featureIcon}>🏆</span> Gamified daily quests</li>
          </ul>
        </div>
      </section>

      {/* ── Right auth card ───────────────────────────────── */}
      <section className={styles.rightPanel}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <h2 className={styles.cardTitle}>Sign in to CalBrave</h2>
            <p className={styles.cardSub}>
              We use <strong>Asgardeo</strong> for secure, passwordless&nbsp;authentication.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            className={styles.primaryBtn}
          >
            <span className={styles.lockIcon}>🔒</span>
            Continue to Secure Login
          </button>

          <p className={styles.helperText}>
            You'll be redirected to the Asgardeo login page. Your credentials
            are never stored by CalBrave.
          </p>

          <div className={styles.divider}>
            <span />
            <span className={styles.dividerLabel}>New to CalBrave?</span>
            <span />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            className={styles.secondaryBtn}
          >
            Create a Free Account
          </button>

          

          {error && (
            <p className={styles.error}>
              {error.message || "Something went wrong. Please try again."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default LoginPage;