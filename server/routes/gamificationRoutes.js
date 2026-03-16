import express from 'express'
import { db, admin } from '../firebase-admin.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()

// Constants 

const BP_ACTIONS = {
  WEIGHT_LOGGED:        20,
  MEAL_LOGGED:          15,
  WATER_GLASS:           5,
  WATER_GOAL_COMPLETE:  30,
  CALORIE_DEFICIT_GOOD: 80,
  CALORIE_DEFICIT_MILD: 50,
  CALORIE_SURPLUS:     -20,
  ALL_QUESTS_DONE:     100,
  STREAK_7_DAYS:       200,
}

const MILESTONE_BP = {
  FIRST_WEIGHT_LOG:    50,
  FIRST_MEAL_LOG:      50,
  LOSE_1KG:           300,
  LOSE_5_PERCENT:     500,
  REACH_GOAL:        2000,
  STREAK_30_DAYS:    1000,
}

const DAILY_QUESTS = [
  {
    id: 'log_weight',
    title: 'Log Your Weight',
    description: 'Record today\'s weight',
    emoji: '⚖️',
    bp: 20,
    checkField: 'weightLogged'       // field in dailyLog to check
  },
  {
    id: 'drink_water',
    title: 'Drink 8 Glasses',
    description: 'Stay hydrated all day',
    emoji: '💧',
    bp: 30,
    checkField: 'waterGoalComplete'  // field in dailyLog to check
  },
  {
    id: 'calorie_target',
    title: 'Hit Calorie Target',
    description: 'Stay within your calorie goal',
    emoji: '🎯',
    bp: 80,
    checkField: 'calorieTargetHit'   // field in dailyLog to check
  },
]

const LEVELS = [
  { level: 1,  bpNeeded: 0,     rank: '🌱 Beginner' },
  { level: 5,  bpNeeded: 1000,  rank: '🚶 Active Starter' },
  { level: 10, bpNeeded: 4000,  rank: '💧 Hydration Hero' },
  { level: 15, bpNeeded: 9000,  rank: '🔥 Fat Burner' },
  { level: 20, bpNeeded: 16000, rank: '💪 Wellness Warrior' },
  { level: 25, bpNeeded: 25000, rank: '⭐ Health Champion' },
  { level: 30, bpNeeded: 40000, rank: '🏆 BlazeElite' },
]

// Helper Functions 

function calculateLevel(totalBP) {
  let currentLevel = LEVELS[0]
  for (const lvl of LEVELS) {
    if (totalBP >= lvl.bpNeeded) currentLevel = lvl
  }
  return currentLevel
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

// Blaze Points and recalculates level
async function awardBP(uid, amount, reason) {
  const userRef = db.collection('users').doc(uid)

  await userRef.update({
    totalBP: admin.firestore.FieldValue.increment(amount)
  })

  const userSnap = await userRef.get()
  const newTotalBP = userSnap.data().totalBP
  const levelInfo = calculateLevel(newTotalBP)

  await userRef.update({
    level: levelInfo.level,
    rank: levelInfo.rank
  })

  return { bpAwarded: amount, reason, newTotalBP, level: levelInfo.level }
}

// One-time badge awarding — silently skips if already earned
async function awardBadge(uid, badgeKey, badgeName, badgeEmoji) {
  const badgeRef = db
    .collection('users').doc(uid)
    .collection('badges').doc(badgeKey)

  const existing = await badgeRef.get()
  if (existing.exists) return null

  await badgeRef.set({
    key: badgeKey,
    name: badgeName,
    emoji: badgeEmoji,
    earnedAt: new Date().toISOString()
  })

  return { key: badgeKey, name: badgeName, emoji: badgeEmoji }
}

// Checks if all quests done → awards bonus automatically
async function checkAndAwardQuestBonus(uid) {
  const today = getTodayDate()

  const dailyRef = db
    .collection('users').doc(uid)
    .collection('dailyLogs').doc(today)

  const dailySnap = await dailyRef.get()
  const dailyData = dailySnap.exists ? dailySnap.data() : {}

  // Already awarded → skip
  if (dailyData.allQuestsCompleted) return null

  // Check if all quests are done
  const allDone = DAILY_QUESTS.every(q => dailyData[q.checkField] === true)
  if (!allDone) return null

  // All done! Award bonus
  await dailyRef.set({ allQuestsCompleted: true }, { merge: true })
  await awardBP(uid, BP_ACTIONS.ALL_QUESTS_DONE, '🎉 All quests completed bonus!')
  await awardBadge(uid, 'first_quest_sweep', 'Quest Blazer', '🎯')

  return { bonusAwarded: true, bp: 100 }
}


// Routes 

// GET /api/gamification/status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const today = getTodayDate()

    const [userSnap, dailySnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid)
        .collection('dailyLogs').doc(today).get()
    ])

    const userData = userSnap.data()
    const dailyData = dailySnap.exists ? dailySnap.data() : null
    const levelInfo = calculateLevel(userData.totalBP || 0)

    const currentLevelIndex = LEVELS.findIndex(l => l.level === levelInfo.level)
    const nextLevel = LEVELS[currentLevelIndex + 1] || null
    const bpToNextLevel = nextLevel
      ? nextLevel.bpNeeded - (userData.totalBP || 0)
      : 0

    res.json({
      totalBP: userData.totalBP || 0,
      level: levelInfo.level,
      rank: levelInfo.rank,
      bpToNextLevel,
      nextLevelBP: nextLevel?.bpNeeded || null,
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      characterClass: userData.characterClass || '🔥 Challenger',
      today: dailyData
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// POST /api/gamification/log-action
router.post('/log-action', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const { action } = req.body
    const today = getTodayDate()

    if (!action || !BP_ACTIONS[action]) {
      return res.status(400).json({ error: 'Invalid action' })
    }

    const dailyRef = db
      .collection('users').doc(uid)
      .collection('dailyLogs').doc(today)

    const dailySnap = await dailyRef.get()
    const dailyData = dailySnap.exists ? dailySnap.data() : {}

    // Prevent double-awarding for once-per-day actions
    if (action === 'WEIGHT_LOGGED' && dailyData.weightLogged) {
      return res.status(400).json({ error: 'Weight already logged today' })
    }

    const bpAmount = BP_ACTIONS[action]
    const newBadges = []

    const updates = { date: today }

    if (action === 'WEIGHT_LOGGED') {
      updates.weightLogged = true
      updates.bpBreakdown = {
        ...dailyData.bpBreakdown,
        weightLogged: bpAmount
      }

      const userSnap = await db.collection('users').doc(uid).get()
      const totalWeightLogs = userSnap.data().totalWeightLogs || 0

      if (totalWeightLogs === 0) {
        const badge = await awardBadge(uid, 'first_weight_log', 'First Drop', '🥇')
        if (badge) newBadges.push(badge)
        await awardBP(uid, MILESTONE_BP.FIRST_WEIGHT_LOG, 'First weight log milestone')
        updates.bpBreakdown = {
          ...updates.bpBreakdown,
          firstWeightMilestone: MILESTONE_BP.FIRST_WEIGHT_LOG
        }
      }

      await db.collection('users').doc(uid).update({
        totalWeightLogs: admin.firestore.FieldValue.increment(1)
      })
    }

    await dailyRef.set(updates, { merge: true })

    const result = await awardBP(uid, bpAmount, action)
    const streakResult = await updateStreak(uid, today)
    const questBonus = await checkAndAwardQuestBonus(uid)

    res.json({
      ...result,
      newBadges,
      streak: streakResult,
      questBonus
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// POST /api/gamification/water
router.post('/water', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const today = getTodayDate()

    const dailyRef = db
      .collection('users').doc(uid)
      .collection('dailyLogs').doc(today)

    const dailySnap = await dailyRef.get()
    const currentGlasses = dailySnap.exists
      ? (dailySnap.data().waterGlasses || 0)
      : 0

    if (currentGlasses >= 8) {
      return res.status(400).json({ error: '🔥 Water goal already blazed today!' })
    }

    const newGlasses = currentGlasses + 1
    await dailyRef.set({ waterGlasses: newGlasses }, { merge: true })

    const result = await awardBP(uid, BP_ACTIONS.WATER_GLASS, 'Water glass logged')

    let bonusResult = null
    if (newGlasses === 8) {
      bonusResult = await awardBP(uid, BP_ACTIONS.WATER_GOAL_COMPLETE, '🔥 Water goal blazed!')
      await dailyRef.set({ waterGoalComplete: true }, { merge: true })
      await checkAndAwardQuestBonus(uid)
    }

    res.json({
      glassesLogged: newGlasses,
      bpAwarded: result.bpAwarded + (bonusResult?.bpAwarded || 0),
      waterGoalComplete: newGlasses === 8,
      newTotalBP: bonusResult?.newTotalBP || result.newTotalBP,
      message: newGlasses === 8
        ? '🔥 Water goal blazed! +30 Bonus BP!'
        : `+${BP_ACTIONS.WATER_GLASS} BP — keep blazing! 💧`
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// GET /api/gamification/badges
router.get('/badges', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid

    const snapshot = await db
      .collection('users').doc(uid)
      .collection('badges')
      .orderBy('earnedAt', 'desc')
      .get()

    const badges = snapshot.docs.map(doc => doc.data())
    res.json({ badges })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// GET /api/gamification/daily
router.get('/daily', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const today = getTodayDate()

    const dailySnap = await db
      .collection('users').doc(uid)
      .collection('dailyLogs').doc(today).get()

    res.json({
      date: today,
      log: dailySnap.exists ? dailySnap.data() : null
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/gamification/quests — get today's quests with completion status
router.get('/quests', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const today = getTodayDate()

    const dailySnap = await db
      .collection('users').doc(uid)
      .collection('dailyLogs').doc(today).get()

    const dailyData = dailySnap.exists ? dailySnap.data() : {}

    // Map quests and attach completion status from today's log
    const quests = DAILY_QUESTS.map(quest => ({
      ...quest,
      completed: dailyData[quest.checkField] === true
    }))

    const allCompleted = quests.every(q => q.completed)
    const completedCount = quests.filter(q => q.completed).length

    res.json({
      quests,
      allCompleted,
      completedCount,
      totalQuests: DAILY_QUESTS.length,
      bonusBP: 100,
      bonusAwarded: dailyData.allQuestsCompleted || false
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// POST /api/gamification/quests/complete-bonus
// Called internally when all quests are done — awards the +100 BP bonus
router.post('/quests/complete-bonus', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const today = getTodayDate()

    const dailyRef = db
      .collection('users').doc(uid)
      .collection('dailyLogs').doc(today)

    const dailySnap = await dailyRef.get()
    const dailyData = dailySnap.exists ? dailySnap.data() : {}

    // Don't award bonus twice
    if (dailyData.allQuestsCompleted) {
      return res.status(400).json({ error: 'Quest bonus already awarded today' })
    }

    // Check all quests are actually completed
    const allDone = DAILY_QUESTS.every(q => dailyData[q.checkField] === true)
    if (!allDone) {
      return res.status(400).json({ error: 'Not all quests completed yet' })
    }

    // Award bonus
    await dailyRef.set({ allQuestsCompleted: true }, { merge: true })
    const result = await awardBP(uid, BP_ACTIONS.ALL_QUESTS_DONE, '🎉 All quests completed bonus!')

    // Award badge
    const badge = await awardBadge(uid, 'first_quest_sweep', 'Quest Blazer', '🎯')

    res.json({
      ...result,
      message: '🎉 All quests blazed! +100 BP bonus!',
      badge
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router


// Streak Helper 

async function updateStreak(uid, today) {
  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  const userData = userSnap.data()

  const lastLogDate = userData.lastLogDate
  const currentStreak = userData.currentStreak || 0
  const longestStreak = userData.longestStreak || 0

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak = currentStreak

  if (lastLogDate === today) {
    return { currentStreak, message: 'Already counted today' }
  } else if (lastLogDate === yesterdayStr) {
    newStreak = currentStreak + 1
  } else {
    newStreak = 1
  }

  const newLongest = Math.max(newStreak, longestStreak)

  await userRef.update({
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastLogDate: today
  })

  let newBadge = null
  if (newStreak === 7) {
    newBadge = await awardBadge(uid, 'seven_day_streak', '7-Day Blaze', '🔥')
    await awardBP(uid, BP_ACTIONS.STREAK_7_DAYS, '🔥 7-day blaze streak bonus!')
  }

  return { currentStreak: newStreak, longestStreak: newLongest, newBadge }
}
