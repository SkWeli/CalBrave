import express from 'express'
import { db, admin } from '../firebase-admin.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

// GET /api/meals/search
router.get('/search', verifyToken, async (req, res) => {
  try {
    const query = req.query.q

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a food description' })
    }

    const response = await fetch(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`,
      {
        headers: { 'X-Api-Key': process.env.CALORIE_NINJAS_API_KEY }
      }
    )

    if (!response.ok) {
      return res.status(500).json({ error: 'Nutrition API failed' })
    }

    const items = await response.json()

    if (!items || items.length === 0) {
      return res.status(404).json({ error: 'No nutrition data found. Try being more specific.' })
    }

    console.log('CalorieNinjas raw response:', JSON.stringify(items[0], null, 2))

    const results = items.map(item => ({
      name: item.name,
      calories: Math.round(item.calories),
      protein_g: Math.round(item.protein_g * 10) / 10,
      carbs_g: Math.round(item.carbohydrates_total_g * 10) / 10,
      fat_g: Math.round(item.fat_total_g * 10) / 10,
      serving_size_g: Math.round(item.serving_size_g)
    }))

    const totalCalories = results.reduce((sum, item) => sum + item.calories, 0)

    res.json({ results, totalCalories })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// POST /api/meals/log 

router.post('/log', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const { name, calories, mealType, date } = req.body
    const logDate = date || getTodayDate()

    if (!name || !calories) {
      return res.status(400).json({ error: 'name and calories are required' })
    }
    if (typeof calories !== 'number' || calories <= 0 || calories > 5000) {
      return res.status(400).json({ error: 'calories must be a number between 1 and 5000' })
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
    const type = validMealTypes.includes(mealType) ? mealType : 'snack'

    const mealRef = db
      .collection('users').doc(uid)
      .collection('mealLogs').doc(logDate)
      .collection('meals').doc()

    const mealData = {
      id: mealRef.id,
      name: name.trim(),
      calories: Math.round(calories),
      mealType: type,
      date: logDate,
      loggedAt: new Date().toISOString()
    }

    await mealRef.set(mealData)

    // Recalculate daily totals
    const summary = await recalculateDailySummary(uid, logDate)

    // Increment total meal logs counter
    await db.collection('users').doc(uid).update({
      totalMealLogs: admin.firestore.FieldValue.increment(1)
    })

    // Award BP — only for today's logs
    let bpResult = null
    const today = getTodayDate()
    if (logDate === today) {
      try {
        const response = await fetch(`http://localhost:5000/api/gamification/log-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({ action: 'MEAL_LOGGED' })
        })
        bpResult = await response.json()
      } catch (err) {
        console.log('BP award failed silently:', err.message)
      }
    }

    res.status(201).json({
      message: `${name} (${Math.round(calories)} cal) logged!`,
      meal: mealData,
      summary,
      blazePoints: bpResult
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// GET /api/meals/today 

router.get('/today', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const today = getTodayDate()

    const [mealsSnap, userSnap] = await Promise.all([
      db.collection('users').doc(uid)
        .collection('mealLogs').doc(today)
        .collection('meals')
        .orderBy('loggedAt', 'asc')
        .get(),
      db.collection('users').doc(uid).get()
    ])

    const meals = mealsSnap.docs.map(doc => doc.data())
    const calorieTarget = userSnap.data().calorieTarget || 1500
    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)
    const remaining = calorieTarget - totalCalories

    res.json({
      meals,
      totalCalories,
      calorieTarget,
      remaining,
      isDeficit: totalCalories > 0 && totalCalories <= calorieTarget,
      deficit: Math.max(0, calorieTarget - totalCalories),
      surplus: Math.max(0, totalCalories - calorieTarget)
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// DELETE /api/meals/:date/:mealId 

router.delete('/:date/:mealId', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const { date, mealId } = req.params

    await db
      .collection('users').doc(uid)
      .collection('mealLogs').doc(date)
      .collection('meals').doc(mealId)
      .delete()

    const summary = await recalculateDailySummary(uid, date)

    res.json({ message: 'Meal deleted', summary })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


export default router


// Helper 
async function recalculateDailySummary(uid, date) {
  const [mealsSnap, userSnap] = await Promise.all([
    db.collection('users').doc(uid)
      .collection('mealLogs').doc(date)
      .collection('meals').get(),
    db.collection('users').doc(uid).get()
  ])

  const meals = mealsSnap.docs.map(doc => doc.data())
  const calorieTarget = userSnap.data().calorieTarget || 1500
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  const isDeficit = totalCalories > 0 && totalCalories <= calorieTarget

  await db
    .collection('users').doc(uid)
    .collection('dailyLogs').doc(date)
    .set({ totalCalories, calorieTarget, calorieTargetHit: isDeficit }, { merge: true })

  return {
    totalCalories,
    calorieTarget,
    remaining: calorieTarget - totalCalories,
    isDeficit
  }
}
