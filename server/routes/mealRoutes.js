import express from 'express'
import { db, admin } from '../firebase-admin.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

const UNIT_TO_GRAMS = {
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  piece: 100, pieces: 100,
  slice: 30, slices: 30,
  bowl: 300, bowls: 300,
  plate: 400, plates: 400,
  handful: 30, handfuls: 30,
  g: 1, gram: 1, grams: 1,
  kg: 1000,
  ml: 1, oz: 28,
}

const FOOD_ALIASES = {
  'dahl': 'lentils cooked',
  'dal':  'lentils cooked',
  'dhal': 'lentils cooked',
  'pol sambol': 'coconut fresh',
  'roti': 'flatbread',
  'chapati': 'flatbread',
  'brinjal': 'eggplant',
  'lady fingers': 'okra',
  'ladies fingers': 'okra',
  'bitter gourd': 'bitter melon',
  'mango': 'mango raw',
  'papaya': 'papaya raw',
}

function parseIngredient(text) {
  const words = text.trim().toLowerCase().split(/\\s+/)

  let foodName = ''
  let quantity = 1
  let grams = 100

  const numberIndex = words.findIndex(w => !isNaN(parseFloat(w)))

  if (numberIndex === -1) {
    foodName = words.join(' ')
    grams = 100
  } else {
    quantity = parseFloat(words[numberIndex])
    const unitWord = words[numberIndex + 1] || ''
    const unitGrams = UNIT_TO_GRAMS[unitWord]

    if (unitGrams) {
      grams = quantity * unitGrams
    } else {
      grams = quantity
    }

    const nonFoodIndexes = new Set([numberIndex, numberIndex + 1])
    foodName = words.filter((_, i) => !nonFoodIndexes.has(i)).join(' ')
  }

  return { foodName: foodName.trim() || words[0], grams: Math.round(grams) }
}

// ✅ Check Firestore custom Sri Lankan food table first
async function lookupCustomFood(foodName) {
  const key = foodName.toLowerCase().trim()

  // Try exact document ID match first (1 read)
  const exactSnap = await db.collection('foods').doc(key).get()
  if (exactSnap.exists) return exactSnap.data()

  // Range query instead of fetching entire collection
  const snap = await db.collection('foods')
    .where('name', '>=', key)
    .where('name', '<=', key + '\uf8ff')
    .limit(3)
    .get()

  if (!snap.empty) return snap.docs[0].data()
  return null
}

// GET /api/meals/search
router.get('/search', verifyToken, async (req, res) => {
  try {
    const query = req.query.q

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Please enter a food description' })
    }

    const ingredients = query.split(',').map(s => s.trim()).filter(Boolean)
    const results = []

    for (const ingredient of ingredients) {
      const { foodName, grams } = parseIngredient(ingredient)

      // ✅ Step 1: Check Sri Lankan Firestore table first
      const customFood = await lookupCustomFood(foodName)

      if (customFood) {
        const scale = grams / 100
        results.push({
          name: customFood.name,
          originalText: ingredient,
          grams,
          calories: Math.round(customFood.calories_per_100g * scale),
          protein_g: Math.round(customFood.protein_g * scale * 10) / 10,
          carbs_g: Math.round(customFood.carbs_g * scale * 10) / 10,
          fat_g: Math.round(customFood.fat_g * scale * 10) / 10,
          note: `${grams}g (Sri Lanka Food Composition Table)`
        })
        continue
      }

      // ❌ Step 2: Not in custom table → fall back to USDA
      const searchName = FOOD_ALIASES[foodName.toLowerCase()] || foodName
      const searchRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(searchName)}&pageSize=5&dataType=SR%20Legacy,Foundation&api_key=${process.env.USDA_API_KEY}`
      )

      if (!searchRes.ok) continue

      const searchData = await searchRes.json()

      if (!searchData.foods || searchData.foods.length === 0) {
        results.push({
          name: foodName,
          originalText: ingredient,
          grams,
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          note: 'Not found in database'
        })
        continue
      }

      const food = searchData.foods.reduce((best, current) => {
        const bestScore = best.description.toLowerCase().split(',').length
        const currentScore = current.description.toLowerCase().split(',').length
        const bestHasName = best.description.toLowerCase().includes(foodName.toLowerCase())
        const currentHasName = current.description.toLowerCase().includes(foodName.toLowerCase())

        if (currentHasName && !bestHasName) return current
        if (!currentHasName && bestHasName) return best
        return currentScore < bestScore ? current : best
      }, searchData.foods[0])

      const nutrients = food.foodNutrients || []

      const findNutrient = (...names) => {
        for (const name of names) {
          const n = nutrients.find(n =>
            n.nutrientName?.toLowerCase().includes(name.toLowerCase())
          )
          if (n && n.value) return n.value
        }
        return 0
      }

      const calPer100g     = findNutrient('Energy')
      const proteinPer100g = findNutrient('Protein')
      const carbsPer100g   = findNutrient('Carbohydrate, by difference', 'Carbohydrate')
      const fatPer100g     = findNutrient('Total lipid', 'Fat')

      const scale = grams / 100

      results.push({
        name: foodName,
        originalText: ingredient,
        grams,
        calories: Math.round(calPer100g * scale),
        protein_g: Math.round(proteinPer100g * scale * 10) / 10,
        carbs_g: Math.round(carbsPer100g * scale * 10) / 10,
        fat_g: Math.round(fatPer100g * scale * 10) / 10,
        note: `${grams}g (${food.description})`
      })
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'No foods found. Try simpler names like "rice", "chicken".' })
    }

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

// GET /api/meals/suggest?q=rice
router.get('/suggest', verifyToken, async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase().trim()
    if (!query || query.length < 2) return res.json({ suggestions: [] })

    const allSnap = await db.collection('foods').get()
    const searchWords = query.split(' ').filter(w => w.length > 1)

    const scored = []

    allSnap.forEach(doc => {
      const data = doc.data()
      const nameLower = data.name.toLowerCase()

      // Score: exact match > starts with > contains each word
      let score = 0
      if (nameLower === query) score += 100
      if (nameLower.startsWith(query)) score += 50
      searchWords.forEach(word => {
        if (nameLower.includes(word)) score += 10
      })

      if (score > 0) scored.push({ ...data, score })
    })

    // Sort by score, return top 5
    const top5 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...food }) => food)  // remove score from response

    // If nothing in custom DB, fall back to USDA suggestions
    if (top5.length === 0) {
      const searchRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&dataType=SR%20Legacy,Foundation&api_key=${process.env.USDA_API_KEY}`
      )
      const data = await searchRes.json()
      const usdaSuggestions = (data.foods || []).slice(0, 5).map(f => ({
        name: f.description,
        calories_per_100g: f.foodNutrients?.find(n => n.nutrientName?.includes('Energy'))?.value || 0,
        category: 'USDA'
      }))
      return res.json({ suggestions: usdaSuggestions })
    }

    res.json({ suggestions: top5 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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

export default router