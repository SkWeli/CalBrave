import { useState } from 'react'
import { searchNutrition, logMeal, deleteMeal } from '../services/api'
import styles from './CalorieTracker.module.css'

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch',     label: '☀️ Lunch' },
  { value: 'dinner',    label: '🌙 Dinner' },
  { value: 'snack',     label: '🍎 Snack' },
]

function CalorieTracker({ mealData, onUpdate }) {

  const [showForm, setShowForm]           = useState(false)
  const [query, setQuery]                 = useState('')
  const [mealType, setMealType]           = useState('lunch')
  const [searching, setSearching]         = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [saving, setSaving]               = useState(false)
  const [message, setMessage]             = useState('')

  const {
    meals = [],
    totalCalories = 0,
    calorieTarget = 1500,
    remaining = 0,
    isDeficit = false
  } = mealData || {}

  const progressPercent = Math.min(100, (totalCalories / calorieTarget) * 100)
  const isOver = totalCalories > calorieTarget

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchResults(null)
    setMessage('')

    try {
      const data = await searchNutrition(query)
      setSearchResults(data)
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || 'Search failed'))
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setSearching(false)
    }
  }

  async function handleConfirmLog() {
    if (!searchResults) return
    setSaving(true)

    try {
      await logMeal(query.trim(), searchResults.totalCalories, mealType)
      setMessage(`✅ Logged! ${searchResults.totalCalories} cal added.`)
      setQuery('')
      setSearchResults(null)
      setShowForm(false)
      setTimeout(() => setMessage(''), 3000)
      if (onUpdate) onUpdate()
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed to log'))
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(mealId) {
    const today = new Date().toISOString().split('T')[0]
    try {
      await deleteMeal(today, mealId)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.log('Delete failed:', err.message)
    }
  }

  function handleCancel() {
    setShowForm(false)
    setQuery('')
    setSearchResults(null)
    setMessage('')
  }

  const grouped = MEAL_TYPES.reduce((acc, type) => {
    const typeMeals = meals.filter(m => m.mealType === type.value)
    if (typeMeals.length > 0) acc[type.value] = { label: type.label, meals: typeMeals }
    return acc
  }, {})

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <span className={styles.title}>🍽️ Calories Today</span>
        <span className={`${styles.remaining} ${isOver ? styles.over : ''}`}>
          {isOver ? `${Math.abs(remaining)} cal over` : `${remaining} cal left`}
        </span>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${isOver ? styles.overFill : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className={styles.progressNumbers}>
          <span className={styles.eaten}>{totalCalories} eaten</span>
          <span className={styles.target}>of {calorieTarget} cal</span>
        </div>
      </div>

      {isDeficit && totalCalories > 0 && (
        <div className={styles.questComplete}>
          🎯 Calorie target hit! Quest 3 complete!
        </div>
      )}

      {Object.keys(grouped).length > 0 && (
        <div className={styles.mealList}>
          {Object.entries(grouped).map(([type, { label, meals: typeMeals }]) => (
            <div key={type} className={styles.mealGroup}>
              <div className={styles.mealGroupLabel}>{label}</div>
              {typeMeals.map(meal => (
                <div key={meal.id} className={styles.mealItem}>
                  <span className={styles.mealName}>{meal.name}</span>
                  <div className={styles.mealRight}>
                    <span className={styles.mealCal}>{meal.calories} cal</span>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(meal.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {message && <div className={styles.message}>{message}</div>}

      {showForm ? (
        <div className={styles.form}>

          <select
            value={mealType}
            onChange={e => setMealType(e.target.value)}
            className={styles.select}
          >
            {MEAL_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <form onSubmit={handleSearch} className={styles.searchRow}>
            <input
              type="text"
              placeholder='e.g. "rice 3 cups, dahl 2 tbsp"'
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSearchResults(null)
              }}
              className={styles.input}
              required
            />
            <button type="submit" disabled={searching} className={styles.searchBtn}>
              {searching ? '...' : '🔍'}
            </button>
          </form>

          {searchResults && (
            <div className={styles.results}>
              <div className={styles.resultsTitle}>Nutrition Breakdown</div>

              {searchResults.results.map((item, i) => (
                <div key={i} className={styles.resultItem}>
                  <div className={styles.resultLeft}>
                    <span className={styles.resultName}>{item.name}</span>
                    <span className={styles.resultMacros}>
                      P: {item.protein_g}g · C: {item.carbs_g}g · F: {item.fat_g}g
                    </span>
                    <span className={styles.resultNote}>{item.note}</span>
                  </div>
                  <span className={styles.resultCal}>{item.calories} cal</span>
                </div>
              ))}

              <div className={styles.resultTotal}>
                Total: {searchResults.totalCalories} cal
              </div>

              <button
                className={styles.confirmBtn}
                onClick={handleConfirmLog}
                disabled={saving}
              >
                {saving ? 'Logging...' : `✅ Log ${searchResults.totalCalories} cal as ${mealType}`}
              </button>
            </div>
          )}

          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>

        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          + Log a Meal  (+15 BP)
        </button>
      )}

    </div>
  )
}

export default CalorieTracker
