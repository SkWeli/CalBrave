// src/components/BMIGauge.jsx
import styles from './BMIGauge.module.css'

const MIN_BMI = 10
const MAX_BMI = 40
const CX = 130
const CY = 116
const R = 86
const NEEDLE_LENGTH = 68

const ZONES = [
  { label: 'Underweight', shortLabel: 'Under', min: 10, max: 18.5, colorVar: '--bmi-under' },
  { label: 'Healthy', shortLabel: 'Healthy', min: 18.5, max: 25, colorVar: '--bmi-healthy' },
  { label: 'Overweight', shortLabel: 'Over', min: 25, max: 30, colorVar: '--bmi-over' },
  { label: 'Obese', shortLabel: 'Obese', min: 30, max: 40, colorVar: '--bmi-obese' },
]

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max)
}

function bmiToAngle(value) {
  // 10 BMI = 180° left edge, 40 BMI = 0° right edge
  const progress = (clamp(value, MIN_BMI, MAX_BMI) - MIN_BMI) / (MAX_BMI - MIN_BMI)
  return 180 - progress * 180
}

function polarToCartesian(angle, radius = R) {
  const radians = (angle * Math.PI) / 180

  return {
    x: CX + radius * Math.cos(radians),
    y: CY - radius * Math.sin(radians),
  }
}

function describeArc(startBMI, endBMI, radius = R) {
  const startAngle = bmiToAngle(startBMI)
  const endAngle = bmiToAngle(endBMI)
  const start = polarToCartesian(startAngle, radius)
  const end = polarToCartesian(endAngle, radius)
  const largeArcFlag = Math.abs(startAngle - endAngle) > 180 ? 1 : 0

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

function getStatus(bmi) {
  if (bmi < 18.5) return ZONES[0]
  if (bmi < 25) return ZONES[1]
  if (bmi < 30) return ZONES[2]
  return ZONES[3]
}

function BMIGauge({ bmi = 0 }) {
  const safeBMI = Number(bmi) || 0
  const clampedBMI = clamp(safeBMI, MIN_BMI, MAX_BMI)
  const status = getStatus(safeBMI)
  const needleAngle = bmiToAngle(clampedBMI)
  const needleTip = polarToCartesian(needleAngle, NEEDLE_LENGTH)
  const hasProgress = clampedBMI > MIN_BMI

  return (
    <div className={styles.container} aria-label={`BMI ${safeBMI}, ${status.label}`}>
      <svg viewBox="0 0 260 160" className={styles.svg} role="img">
        <defs>
          <filter id="bmi-active-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Wider background track creates a clean inset/border around the zone arcs. */}
        <path
          d={describeArc(MIN_BMI, MAX_BMI)}
          className={styles.track}
          pathLength="100"
        />

        {/* BMI zone arcs sit centered on the wider track. */}
        {ZONES.map((zone) => (
          <path
            key={zone.label}
            d={describeArc(zone.min, zone.max)}
            className={styles.zone}
            style={{ stroke: `var(${zone.colorVar})` }}
            pathLength="100"
          />
        ))}

        {/* Subtle active progress glow from the minimum BMI to the current BMI. */}
        {hasProgress && (
          <path
            d={describeArc(MIN_BMI, clampedBMI)}
            className={styles.activeGlow}
            style={{ stroke: `var(${status.colorVar})` }}
            pathLength="100"
          />
        )}

        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          className={styles.needle}
        />

        {/* Clean pivot base: outer ring, dot, and inner cutout. */}
        <circle cx={CX} cy={CY} r="10" className={styles.pivotOuter} />
        <circle cx={CX} cy={CY} r="6.5" className={styles.pivotMiddle} />
        <circle cx={CX} cy={CY} r="2.5" className={styles.pivotInner} />
      </svg>

      <div className={styles.readout} style={{ color: `var(${status.colorVar})` }}>
        <div className={styles.bmiValue}>BMI: {safeBMI.toFixed(1)}</div>
        <div className={styles.status}>{status.label}</div>
      </div>

      <div className={styles.legend} aria-label="BMI categories">
        {ZONES.map((zone) => (
          <div key={zone.label} className={styles.legendItem}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: `var(${zone.colorVar})` }}
              aria-hidden="true"
            />
            <span>{zone.shortLabel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BMIGauge
