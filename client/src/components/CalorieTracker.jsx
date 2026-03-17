import { useState } from 'react'
import { deleteMeal } from '../services/api'
import MealLogger from './MealLogger'
import styles from './CalorieTracker.module.css'

// Still needed to group meals by type in the display list
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch',     label: 'Lunch' },
  { value: 'dinner',    label: 'Dinner' },
  { value: 'snack',     label: 'Snack' },
]

function CalorieTracker({ mealData, onUpdate }) {

  // Only showForm remains — all search/log state moved to MealLogger
  const [showForm, setShowForm] = useState(false)

  const {
    meals         = [],
    totalCalories = 0,
    calorieTarget = 1500,
    remaining     = 0,
    isDeficit     = false
  } = mealData || {}

  const progressPercent = Math.min(100, (totalCalories / calorieTarget) * 100)
  const isOver = totalCalories > calorieTarget

  async function handleDelete(mealId) {
    const today = new Date().toISOString().split('T')[0]
    try {
      await deleteMeal(today, mealId)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.log('Delete failed:', err.message)
    }
  }

  // Group meals by type for the display list
  const grouped = MEAL_TYPES.reduce((acc, type) => {
    const typeMeals = meals.filter(m => m.mealType === type.value)
    if (typeMeals.length > 0) acc[type.value] = { label: type.label, meals: typeMeals }
    return acc
  }, {})

  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <span className={styles.title}>Calories Today</span>
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
          Calorie target reached — Quest complete.
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

      {/* MealLogger replaces the old inline search form */}
      {showForm ? (
        <MealLogger onMealLogged={() => {
          setShowForm(false)
          if (onUpdate) onUpdate()
        }} />
      ) : (
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          + Log a Meal · +15 BP
        </button>
      )}

    </div>
  )
}

export default CalorieTracker