import express from "express";
import { db, admin } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

const BP_ACTIONS = {
  WEIGHT_LOGGED: 20,
  MEAL_LOGGED: 15,
  WATER_GLASS: 5,
  WATER_GOAL_COMPLETE: 30,
  CALORIE_DEFICIT_GOOD: 80,
  CALORIE_DEFICIT_MILD: 50,
  CALORIE_SURPLUS: -20,
  ALL_QUESTS_DONE: 100,
  STREAK_7_DAYS: 200
};

const MILESTONE_BP = {
  FIRST_WEIGHT_LOG: 50,
  FIRST_MEAL_LOG: 50,
  LOSE_1KG: 300,
  LOSE_5_PERCENT: 500,
  REACH_GOAL: 2000,
  STREAK_30_DAYS: 1000
};

const DAILY_QUESTS = [
  {
    id: "log_weight",
    title: "Log Your Weight",
    description: "Record today's weight",
    emoji: "⚖️",
    bp: 20,
    checkField: "weightLogged"
  },
  {
    id: "drink_water",
    title: "Drink 8 Glasses",
    description: "Stay hydrated all day",
    emoji: "💧",
    bp: 30,
    checkField: "waterGoalComplete"
  },
  {
    id: "calorie_target",
    title: "Hit Calorie Target",
    description: "Stay within your calorie goal",
    emoji: "🎯",
    bp: 80,
    checkField: "calorieTargetHit"
  }
];

const LEVELS = [
  { level: 1, bpNeeded: 0, rank: "🌱 Beginner" },
  { level: 5, bpNeeded: 1000, rank: "🚶 Active Starter" },
  { level: 10, bpNeeded: 4000, rank: "💧 Hydration Hero" },
  { level: 15, bpNeeded: 9000, rank: "🔥 Fat Burner" },
  { level: 20, bpNeeded: 16000, rank: "💪 Wellness Warrior" },
  { level: 25, bpNeeded: 25000, rank: "⭐ Health Champion" },
  { level: 30, bpNeeded: 40000, rank: "🏆 BlazeElite" }
];

function calculateLevel(totalBP = 0) {
  let currentLevel = LEVELS[0];

  for (const lvl of LEVELS) {
    if (totalBP >= lvl.bpNeeded) {
      currentLevel = lvl;
    }
  }

  return currentLevel;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

async function ensureUserGamificationDoc(uid, user = {}) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    await userRef.set(
      {
        email: user.email || null,
        authProvider: "asgardeo",
        asgardeoSub: user.sub || uid,
        totalBP: 0,
        level: 1,
        rank: "🌱 Beginner",
        currentStreak: 0,
        longestStreak: 0,
        characterClass: "🔥 Challenger",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return {
      totalBP: 0,
      level: 1,
      rank: "🌱 Beginner",
      currentStreak: 0,
      longestStreak: 0,
      characterClass: "🔥 Challenger"
    };
  }

  const existingData = userSnap.data() || {};

  const defaults = {
    totalBP: existingData.totalBP ?? 0,
    level: existingData.level ?? 1,
    rank: existingData.rank ?? "🌱 Beginner",
    currentStreak: existingData.currentStreak ?? 0,
    longestStreak: existingData.longestStreak ?? 0,
    characterClass: existingData.characterClass ?? "🔥 Challenger",
    updatedAt: new Date().toISOString()
  };

  await userRef.set(defaults, { merge: true });

  return {
    ...existingData,
    ...defaults
  };
}

async function awardBP(uid, amount, reason) {
  const userRef = db.collection("users").doc(uid);

  await ensureUserGamificationDoc(uid);

  await userRef.set(
    {
      totalBP: admin.firestore.FieldValue.increment(amount),
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};
  const newTotalBP = userData.totalBP || 0;
  const levelInfo = calculateLevel(newTotalBP);

  await userRef.set(
    {
      level: levelInfo.level,
      rank: levelInfo.rank,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  return {
    bpAwarded: amount,
    reason,
    newTotalBP,
    level: levelInfo.level,
    rank: levelInfo.rank
  };
}

async function awardBadge(uid, badgeKey, badgeName, badgeEmoji) {
  const badgeRef = db
    .collection("users")
    .doc(uid)
    .collection("badges")
    .doc(badgeKey);

  const existing = await badgeRef.get();

  if (existing.exists) {
    return null;
  }

  await badgeRef.set({
    key: badgeKey,
    name: badgeName,
    emoji: badgeEmoji,
    earnedAt: new Date().toISOString()
  });

  return {
    key: badgeKey,
    name: badgeName,
    emoji: badgeEmoji
  };
}

async function checkAndAwardQuestBonus(uid) {
  const today = getTodayDate();

  const dailyRef = db
    .collection("users")
    .doc(uid)
    .collection("dailyLogs")
    .doc(today);

  const dailySnap = await dailyRef.get();
  const dailyData = dailySnap.exists ? dailySnap.data() : {};

  if (dailyData.allQuestsCompleted) {
    return null;
  }

  const allDone = DAILY_QUESTS.every((q) => dailyData[q.checkField] === true);

  if (!allDone) {
    return null;
  }

  await dailyRef.set(
    {
      allQuestsCompleted: true
    },
    { merge: true }
  );

  await awardBP(uid, BP_ACTIONS.ALL_QUESTS_DONE, "🎉 All quests completed bonus!");
  await awardBadge(uid, "first_quest_sweep", "Quest Blazer", "🎯");

  return {
    bonusAwarded: true,
    bp: BP_ACTIONS.ALL_QUESTS_DONE
  };
}

async function updateStreak(uid, today) {
  const userRef = db.collection("users").doc(uid);

  await ensureUserGamificationDoc(uid);

  const userSnap = await userRef.get();
  const userData = userSnap.data() || {};

  const lastLogDate = userData.lastLogDate;
  const currentStreak = userData.currentStreak || 0;
  const longestStreak = userData.longestStreak || 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = currentStreak;

  if (lastLogDate === today) {
    return {
      currentStreak,
      longestStreak,
      message: "Already counted today"
    };
  }

  if (lastLogDate === yesterdayStr) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, longestStreak);

  await userRef.set(
    {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastLogDate: today,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );

  let newBadge = null;

  if (newStreak === 7) {
    newBadge = await awardBadge(uid, "seven_day_streak", "7-Day Blaze", "🔥");
    await awardBP(uid, BP_ACTIONS.STREAK_7_DAYS, "🔥 7-day blaze streak bonus!");
  }

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    newBadge
  };
}

// GET /api/gamification/status
router.get("/status", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const today = getTodayDate();

    const userData = await ensureUserGamificationDoc(uid, req.user);

    const dailySnap = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(today)
      .get();

    const dailyData = dailySnap.exists ? dailySnap.data() : null;

    const totalBP = userData.totalBP || 0;
    const levelInfo = calculateLevel(totalBP);

    const currentLevelIndex = LEVELS.findIndex(
      (level) => level.level === levelInfo.level
    );

    const nextLevel = LEVELS[currentLevelIndex + 1] || null;

    const bpToNextLevel = nextLevel ? nextLevel.bpNeeded - totalBP : 0;

    return res.json({
      totalBP,
      level: levelInfo.level,
      rank: levelInfo.rank,
      bpToNextLevel,
      nextLevelBP: nextLevel?.bpNeeded || null,
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      characterClass: userData.characterClass || "🔥 Challenger",
      today: dailyData
    });
  } catch (error) {
    console.error("Gamification status error:", error);

    return res.status(500).json({
      error: "Failed to get gamification status"
    });
  }
});

// POST /api/gamification/log-action
router.post("/log-action", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { action } = req.body;
    const today = getTodayDate();

    await ensureUserGamificationDoc(uid, req.user);

    if (!action || !BP_ACTIONS[action]) {
      return res.status(400).json({
        error: "Invalid action"
      });
    }

    const dailyRef = db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(today);

    const dailySnap = await dailyRef.get();
    const dailyData = dailySnap.exists ? dailySnap.data() : {};

    if (action === "WEIGHT_LOGGED" && dailyData.weightLogged) {
      return res.status(400).json({
        error: "Weight already logged today"
      });
    }

    const bpAmount = BP_ACTIONS[action];
    const newBadges = [];

    const updates = {
      date: today
    };

    if (action === "WEIGHT_LOGGED") {
      updates.weightLogged = true;
      updates.bpBreakdown = {
        ...dailyData.bpBreakdown,
        weightLogged: bpAmount
      };

      const userSnap = await db.collection("users").doc(uid).get();
      const userData = userSnap.data() || {};
      const totalWeightLogs = userData.totalWeightLogs || 0;

      if (totalWeightLogs === 0) {
        const badge = await awardBadge(uid, "first_weight_log", "First Drop", "🥇");

        if (badge) {
          newBadges.push(badge);
        }

        await awardBP(uid, MILESTONE_BP.FIRST_WEIGHT_LOG, "First weight log milestone");

        updates.bpBreakdown = {
          ...updates.bpBreakdown,
          firstWeightMilestone: MILESTONE_BP.FIRST_WEIGHT_LOG
        };
      }

      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            totalWeightLogs: admin.firestore.FieldValue.increment(1),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
    }

    if (action === "MEAL_LOGGED") {
      updates.mealLogged = true;
      updates.bpBreakdown = {
        ...dailyData.bpBreakdown,
        mealLogged: bpAmount
      };
    }

    if (action === "WATER_GLASS") {
      updates.waterGlassLogged = true;
      updates.bpBreakdown = {
        ...dailyData.bpBreakdown,
        waterGlass: bpAmount
      };
    }

    await dailyRef.set(updates, { merge: true });

    const result = await awardBP(uid, bpAmount, action);
    const streakResult = await updateStreak(uid, today);
    const questBonus = await checkAndAwardQuestBonus(uid);

    return res.json({
      ...result,
      newBadges,
      streak: streakResult,
      questBonus
    });
  } catch (error) {
    console.error("Log gamification action error:", error);

    return res.status(500).json({
      error: "Failed to log gamification action"
    });
  }
});

// POST /api/gamification/water
router.post("/water", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const today = getTodayDate();

    await ensureUserGamificationDoc(uid, req.user);

    const dailyRef = db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(today);

    const dailySnap = await dailyRef.get();

    const currentGlasses = dailySnap.exists
      ? dailySnap.data().waterGlasses || 0
      : 0;

    if (currentGlasses >= 8) {
      return res.status(400).json({
        error: "🔥 Water goal already blazed today!"
      });
    }

    const newGlasses = currentGlasses + 1;

    await dailyRef.set(
      {
        date: today,
        waterGlasses: newGlasses
      },
      { merge: true }
    );

    const result = await awardBP(uid, BP_ACTIONS.WATER_GLASS, "Water glass logged");

    let bonusResult = null;
    let questBonus = null;

    if (newGlasses === 8) {
      bonusResult = await awardBP(
        uid,
        BP_ACTIONS.WATER_GOAL_COMPLETE,
        "🔥 Water goal blazed!"
      );

      await dailyRef.set(
        {
          waterGoalComplete: true
        },
        { merge: true }
      );

      questBonus = await checkAndAwardQuestBonus(uid);
    }

    return res.json({
      glassesLogged: newGlasses,
      bpAwarded: result.bpAwarded + (bonusResult?.bpAwarded || 0),
      waterGoalComplete: newGlasses === 8,
      newTotalBP: bonusResult?.newTotalBP || result.newTotalBP,
      questBonus,
      message:
        newGlasses === 8
          ? "🔥 Water goal blazed! +30 Bonus BP!"
          : `+${BP_ACTIONS.WATER_GLASS} BP — keep blazing! 💧`
    });
  } catch (error) {
    console.error("Water log error:", error);

    return res.status(500).json({
      error: "Failed to log water glass"
    });
  }
});

// GET /api/gamification/badges
router.get("/badges", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    await ensureUserGamificationDoc(uid, req.user);

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("badges")
      .orderBy("earnedAt", "desc")
      .get();

    const badges = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({
      badges
    });
  } catch (error) {
    console.error("Get badges error:", error);

    return res.status(500).json({
      error: "Failed to get badges"
    });
  }
});

// GET /api/gamification/daily
router.get("/daily", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const today = getTodayDate();

    await ensureUserGamificationDoc(uid, req.user);

    const dailySnap = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(today)
      .get();

    return res.json({
      date: today,
      log: dailySnap.exists ? dailySnap.data() : null
    });
  } catch (error) {
    console.error("Get daily log error:", error);

    return res.status(500).json({
      error: "Failed to get daily log"
    });
  }
});

// GET /api/gamification/quests
router.get("/quests", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const today = getTodayDate();

    await ensureUserGamificationDoc(uid, req.user);

    const dailySnap = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(today)
      .get();

    const dailyData = dailySnap.exists ? dailySnap.data() : {};

    const quests = DAILY_QUESTS.map((quest) => ({
      ...quest,
      completed: dailyData[quest.checkField] === true
    }));

    const allCompleted = quests.every((quest) => quest.completed);
    const completedCount = quests.filter((quest) => quest.completed).length;

    return res.json({
      quests,
      allCompleted,
      completedCount,
      totalQuests: DAILY_QUESTS.length,
      bonusBP: 100,
      bonusAwarded: dailyData.allQuestsCompleted || false
    });
  } catch (error) {
    console.error("Get quests error:", error);

    return res.status(500).json({
      error: "Failed to get daily quests"
    });
  }
});

// POST /api/gamification/quests/complete-bonus
router.post("/quests/complete-bonus", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const today = getTodayDate();

    await ensureUserGamificationDoc(uid, req.user);

    const dailyRef = db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(today);

    const dailySnap = await dailyRef.get();
    const dailyData = dailySnap.exists ? dailySnap.data() : {};

    if (dailyData.allQuestsCompleted) {
      return res.status(400).json({
        error: "Quest bonus already awarded today"
      });
    }

    const allDone = DAILY_QUESTS.every((q) => dailyData[q.checkField] === true);

    if (!allDone) {
      return res.status(400).json({
        error: "Not all quests completed yet"
      });
    }

    await dailyRef.set(
      {
        allQuestsCompleted: true
      },
      { merge: true }
    );

    const result = await awardBP(
      uid,
      BP_ACTIONS.ALL_QUESTS_DONE,
      "🎉 All quests completed bonus!"
    );

    const badge = await awardBadge(uid, "first_quest_sweep", "Quest Blazer", "🎯");

    return res.json({
      ...result,
      message: "🎉 All quests blazed! +100 BP bonus!",
      badge
    });
  } catch (error) {
    console.error("Quest bonus error:", error);

    return res.status(500).json({
      error: "Failed to award quest bonus"
    });
  }
});

export default router;