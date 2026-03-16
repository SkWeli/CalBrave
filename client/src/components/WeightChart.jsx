import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer} from 'recharts'
import styles from './WeightChart.module.css'

function WeightChart({ history, goalWeight }) {

  // Need at least 2 data points to draw a line
  if (!history || history.length < 2) {
    return (
      <div className={styles.empty}>
        Log at least 2 weight entries to see your progress chart 📈
      </div>
    )
  }

  // Format data for Recharts
  const data = history.map((entry) => ({
    date: formatDate(entry.date),    // "Mar 10"
    weight: entry.weight,            // 79.4
    goal: goalWeight                 // 74 (flat reference line)
  }))

  // Find Y axis range 
  const weights = history.map(e => e.weight)
  const minWeight = Math.min(...weights, goalWeight || Infinity)
  const maxWeight = Math.max(...weights)
  const yMin = Math.floor(minWeight - 2)
  const yMax = Math.ceil(maxWeight + 2)

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Weight Progress</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#999' }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 12, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            unit=" kg"
          />

          <Tooltip
            formatter={(value) => [`${value} kg`, 'Weight']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #eee' }}
          />

          {goalWeight && (
            <ReferenceLine
              y={goalWeight}
              stroke="#ff6b35"
              strokeDasharray="6 3"
              label={{ value: `Goal: ${goalWeight}kg`, position: 'right', fontSize: 11, fill: '#ff6b35' }}
            />
          )}

          <Line
            type="monotone"
            dataKey="weight"
            stroke="#333"
            strokeWidth={2.5}
            dot={{ fill: '#333', r: 4 }}
            activeDot={{ r: 6, fill: '#ff6b35' }}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default WeightChart
