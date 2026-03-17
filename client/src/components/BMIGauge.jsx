// src/components/BMIGauge.jsx
import styles from './BMIGauge.module.css'

function BMIGauge({ bmi }) {
  // BMI scale: 10 → 40 mapped to 0° → 180°
  const clampedBMI = Math.min(Math.max(bmi, 10), 40)
  const angle = ((clampedBMI - 10) / 30) * 180 - 90  // -90° to +90°

  const getStatus = () => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#60a5fa' }
    if (bmi < 25)   return { label: 'Healthy',     color: '#22c55e' }
    if (bmi < 30)   return { label: 'Overweight',  color: '#f97316' }
    return              { label: 'Obese',          color: '#ef4444' }
  }

  const status = getStatus()

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 200 110" className={styles.svg}>
        {/* Background arc segments */}
        <path d="M 20 100 A 80 80 0 0 1 65 27" fill="none" stroke="#60a5fa" strokeWidth="12" strokeLinecap="round"/>
        <path d="M 65 27 A 80 80 0 0 1 135 27" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round"/>
        <path d="M 135 27 A 80 80 0 0 1 170 58" fill="none" stroke="#f97316" strokeWidth="12" strokeLinecap="round"/>
        <path d="M 170 58 A 80 80 0 0 1 180 100" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round"/>

        {/* Needle */}
        <line
          x1="100" y1="100"
          x2={100 + 60 * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={100 + 60 * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx="100" cy="100" r="6" fill="white" />

        {/* Labels */}
        <text x="10"  y="108" fill="#60a5fa" fontSize="8">Under</text>
        <text x="78"  y="18"  fill="#22c55e" fontSize="8">Healthy</text>
        <text x="142" y="52"  fill="#f97316" fontSize="8">Over</text>
        <text x="168" y="95"  fill="#ef4444" fontSize="8">Obese</text>
      </svg>

      <p className={styles.bmiValue} style={{ color: status.color }}>
        BMI: {bmi}
      </p>
      <p className={styles.status} style={{ color: status.color }}>
        {status.label}
      </p>
    </div>
  )
}

export default BMIGauge
