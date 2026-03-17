// src/components/MealLogger.jsx
import { useState } from 'react'
import api from '../services/api'
import styles from './MealLogger.module.css'

// One food row
function FoodRow({ row, index, onUpdate, onRemove }) {
  const [query, setQuery]         = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (value) => {
    setQuery(value)
    onUpdate(index, 'foodName', value)
    if (value.length < 2) return setSuggestions([])

    setSearching(true)
    try {
      const res = await api.get(`/meals/suggest?q=${encodeURIComponent(value)}`)
      setSuggestions(res.data.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = (food) => {
    setQuery(food.name)
    setSuggestions([])
    onUpdate(index, 'foodName', food.name)
    onUpdate(index, 'foodData', food)
  }

  return (
    <div className={styles.row}>
      
      {/* Food search input */}
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Search food (e.g. rice, chicken...)"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.foodInput}
        />
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((s, i) => (
              <li key={i} onClick={() => handleSelect(s)} className={styles.suggestion}>
                <span className={styles.foodName}>{s.name}</span>
                <span className={styles.foodMeta}>{s.calories_per_100g} kcal/100g · {s.category}</span>
              </li>
            ))}
          </ul>
        )}
        {searching && <p className={styles.searching}>Searching...</p>}
      </div>

      {/* Quantity input */}
      <input
        type="number"
        placeholder="g"
        value={row.grams}
        onChange={(e) => onUpdate(index, 'grams', e.target.value)}
        className={styles.gramsInput}
        min="1"
      />

      {/* Remove row button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className={styles.removeBtn}
      >✕</button>
    </div>
  )
}

// Main logger
function MealLogger({ onMealLogged }) {
  const [rows, setRows]       = useState([{ foodName: '', grams: '', foodData: null }])
  const [logging, setLogging] = useState(false)
  const [mealType, setMealType] = useState('lunch')

  const addRow = () =>
    setRows([...rows, { foodName: '', grams: '', foodData: null }])

  const removeRow = (i) =>
    setRows(rows.filter((_, idx) => idx !== i))

  const updateRow = (i, field, value) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [field]: value }
    setRows(updated)
  }

  const handleLog = async () => {
  const valid = rows.filter(r => r.foodName && r.grams)
  if (valid.length === 0) return

  setLogging(true)
    try {
      // Step 1: build query string and hit /search to get name + calories
      const query = valid
        .map(r => `${r.foodName} ${r.grams}g`)
        .join(', ')

      const searchRes = await api.get(`/meals/search?q=${encodeURIComponent(query)}`)
      const { results, totalCalories } = searchRes.data

      // Step 2: send resolved name + calories to /log as the backend expects
      const name = results.map(r => r.name).join(', ')
      await api.post('/meals/log', { name, calories: totalCalories, mealType })

      onMealLogged?.()
      setRows([{ foodName: '', grams: '', foodData: null }])
    } catch (err) {
      console.error(err)
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className={styles.container}>

      <select value={mealType} onChange={e => setMealType(e.target.value)} className={styles.select}>
        <option value="breakfast">Breakfast</option>
        <option value="lunch">Lunch</option>
        <option value="dinner">Dinner</option>
        <option value="snack">Snack</option>
      </select>

      <h3 className={styles.title}>🍽️ Log Meal</h3>

      {rows.map((row, i) => (
        <FoodRow
          key={i}
          row={row}
          index={i}
          onUpdate={updateRow}
          onRemove={removeRow}
        />
      ))}

      <button type="button" onClick={addRow} className={styles.addBtn}>
        + Add another food
      </button>

      <button
        type="button"
        onClick={handleLog}
        disabled={logging}
        className={styles.logBtn}
      >
        {logging ? 'Logging...' : '🔥 Log Meal'}
      </button>
    </div>
  )
}

export default MealLogger
