// src/components/LoadingScreen.jsx
import styles from './LoadingScreen.module.css'

function LoadingScreen() {
  return (
    <div className={styles.container}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>🔥 Loading CalBrave...</p>
    </div>
  )
}

export default LoadingScreen