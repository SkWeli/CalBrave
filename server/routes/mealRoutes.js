import express from "express";
import { db, admin } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

const UNIT_TO_GRAMS = {
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  piece: 100,
  pieces: 100,
  slice: 30,
  slices: 30,
  bowl: 300,
  bowls: 300,
  plate: 400,
  plates: 400,
  handful: 30,
  handfuls: 30,
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  oz: 28
};

const FOOD_ALIASES = {
  dahl: "lentils cooked",
  dal: "lentils cooked",
  dhal: "lentils cooked",
  "pol sambol": "coconut fresh",
  roti: "flatbread",
  chapati: "flatbread",
  brinjal: "eggplant",
  "lady fingers": "okra",
  "ladies fingers": "okra",
  "bitter gourd": "bitter melon",
  mango: "mango raw",
  papaya: "papaya raw"
};

function parseIngredient(text) {
  const words = text.trim().toLowerCase().split(/\s+/);

  let foodName = "";
  let quantity = 1;
  let grams = 100;

  const numberIndex = words.findIndex((word) => !Number.isNaN(parseFloat(word)));

  if (numberIndex === -1) {
    foodName = words.join(" ");
    grams = 100;
  } else {
    quantity = parseFloat(words[numberIndex]);

    const unitWord = words[numberIndex + 1] || "";
    const unitGrams = UNIT_TO_GRAMS[unitWord];

    if (unitGrams) {
      grams = quantity * unitGrams;
    } else {
      grams = quantity;
    }

    const nonFoodIndexes = new Set([numberIndex, numberIndex + 1]);

    foodName = words
      .filter((_, index) => !nonFoodIndexes.has(index))
      .join(" ");
  }

  return {
    foodName: foodName.trim() || words[0],
    grams: Math.round(grams)
  };
}

async function ensureUserDoc(uid, user = {}) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    await userRef.set(
      {
        email: user.email || null,
        authProvider: "asgardeo",
        asgardeoSub: user.sub || uid,
        totalMealLogs: 0,
        calorieTarget: 1500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return {
      totalMealLogs: 0,
      calorieTarget: 1500
    };
  }

  const data = userSnap.data() || {};

  if (!data.calorieTarget) {
    await userRef.set(
      {
        calorieTarget: 1500,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }

  return {
    ...data,
    calorieTarget: data.calorieTarget || 1500
  };
}

async function lookupCustomFood(foodName) {
  const key = foodName.toLowerCase().trim();

  const exactSnap = await db.collection("foods").doc(key).get();

  if (exactSnap.exists) {
    return exactSnap.data();
  }

  const snap = await db
    .collection("foods")
    .where("name", ">=", key)
    .where("name", "<=", key + "\uf8ff")
    .limit(3)
    .get();

  if (!snap.empty) {
    return snap.docs[0].data();
  }

  return null;
}

function findNutrientValue(nutrients, ...names) {
  for (const name of names) {
    const nutrient = nutrients.find((item) =>
      item.nutrientName?.toLowerCase().includes(name.toLowerCase())
    );

    if (nutrient && nutrient.value) {
      return nutrient.value;
    }
  }

  return 0;
}

// GET /api/meals/search
router.get("/search", verifyToken, async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: "Please enter a food description"
      });
    }

    const ingredients = query
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const results = [];

    for (const ingredient of ingredients) {
      const { foodName, grams } = parseIngredient(ingredient);

      const customFood = await lookupCustomFood(foodName);

      if (customFood) {
        const scale = grams / 100;

        results.push({
          name: customFood.name,
          originalText: ingredient,
          grams,
          calories: Math.round(customFood.calories_per_100g * scale),
          protein_g: Math.round(customFood.protein_g * scale * 10) / 10,
          carbs_g: Math.round(customFood.carbs_g * scale * 10) / 10,
          fat_g: Math.round(customFood.fat_g * scale * 10) / 10,
          note: `${grams}g (Sri Lanka Food Composition Table)`
        });

        continue;
      }

      const searchName = FOOD_ALIASES[foodName.toLowerCase()] || foodName;

      const searchRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
          searchName
        )}&pageSize=5&dataType=SR%20Legacy,Foundation&api_key=${
          process.env.USDA_API_KEY
        }`
      );

      if (!searchRes.ok) {
        continue;
      }

      const searchData = await searchRes.json();

      if (!searchData.foods || searchData.foods.length === 0) {
        results.push({
          name: foodName,
          originalText: ingredient,
          grams,
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          note: "Not found in database"
        });

        continue;
      }

      const food = searchData.foods.reduce((best, current) => {
        const bestScore = best.description.toLowerCase().split(",").length;
        const currentScore = current.description.toLowerCase().split(",").length;
        const bestHasName = best.description
          .toLowerCase()
          .includes(foodName.toLowerCase());
        const currentHasName = current.description
          .toLowerCase()
          .includes(foodName.toLowerCase());

        if (currentHasName && !bestHasName) return current;
        if (!currentHasName && bestHasName) return best;

        return currentScore < bestScore ? current : best;
      }, searchData.foods[0]);

      const nutrients = food.foodNutrients || [];

      const calPer100g = findNutrientValue(nutrients, "Energy");
      const proteinPer100g = findNutrientValue(nutrients, "Protein");
      const carbsPer100g = findNutrientValue(
        nutrients,
        "Carbohydrate, by difference",
        "Carbohydrate"
      );
      const fatPer100g = findNutrientValue(nutrients, "Total lipid", "Fat");

      const scale = grams / 100;

      results.push({
        name: foodName,
        originalText: ingredient,
        grams,
        calories: Math.round(calPer100g * scale),
        protein_g: Math.round(proteinPer100g * scale * 10) / 10,
        carbs_g: Math.round(carbsPer100g * scale * 10) / 10,
        fat_g: Math.round(fatPer100g * scale * 10) / 10,
        note: `${grams}g (${food.description})`
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: 'No foods found. Try simpler names like "rice", "chicken".'
      });
    }

    const totalCalories = results.reduce((sum, item) => sum + item.calories, 0);

    return res.json({
      results,
      totalCalories
    });
  } catch (error) {
    console.error("Meal search error:", error);

    return res.status(500).json({
      error: "Failed to search meals"
    });
  }
});

// POST /api/meals/log
router.post("/log", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    await ensureUserDoc(uid, req.user);

    const { name, calories, mealType, date } = req.body;
    const logDate = date || getTodayDate();

    if (!name || calories === undefined || calories === null) {
      return res.status(400).json({
        error: "name and calories are required"
      });
    }

    const caloriesNumber = Number(calories);

    if (
      Number.isNaN(caloriesNumber) ||
      caloriesNumber <= 0 ||
      caloriesNumber > 5000
    ) {
      return res.status(400).json({
        error: "calories must be a number between 1 and 5000"
      });
    }

    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    const type = validMealTypes.includes(mealType) ? mealType : "snack";

    const mealRef = db
      .collection("users")
      .doc(uid)
      .collection("mealLogs")
      .doc(logDate)
      .collection("meals")
      .doc();

    const mealData = {
      id: mealRef.id,
      name: name.trim(),
      calories: Math.round(caloriesNumber),
      mealType: type,
      date: logDate,
      loggedAt: new Date().toISOString()
    };

    await mealRef.set(mealData);

    const summary = await recalculateDailySummary(uid, logDate);

    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          totalMealLogs: admin.firestore.FieldValue.increment(1),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

    let bpResult = null;
    const today = getTodayDate();

    if (logDate === today) {
      try {
        const response = await fetch(
          "http://localhost:5000/api/gamification/log-action",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: req.headers.authorization
            },
            body: JSON.stringify({
              action: "MEAL_LOGGED"
            })
          }
        );

        bpResult = await response.json();
      } catch (err) {
        console.log("BP award failed silently:", err.message);
      }
    }

    return res.status(201).json({
      message: `${name} (${Math.round(caloriesNumber)} cal) logged!`,
      meal: mealData,
      summary,
      blazePoints: bpResult
    });
  } catch (error) {
    console.error("Log meal error:", error);

    return res.status(500).json({
      error: "Failed to log meal"
    });
  }
});

// GET /api/meals/today
router.get("/today", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const today = getTodayDate();

    const userData = await ensureUserDoc(uid, req.user);

    const mealsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("mealLogs")
      .doc(today)
      .collection("meals")
      .orderBy("loggedAt", "asc")
      .get();

    const meals = mealsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    const calorieTarget = userData.calorieTarget || 1500;
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

    return res.json({
      meals,
      totalCalories,
      calorieTarget,
      remaining: calorieTarget - totalCalories,
      isDeficit: totalCalories > 0 && totalCalories <= calorieTarget,
      deficit: Math.max(0, calorieTarget - totalCalories),
      surplus: Math.max(0, totalCalories - calorieTarget)
    });
  } catch (error) {
    console.error("Get today meals error:", error);

    return res.status(500).json({
      error: "Failed to get today's meals"
    });
  }
});

// DELETE /api/meals/:date/:mealId
router.delete("/:date/:mealId", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { date, mealId } = req.params;

    await db
      .collection("users")
      .doc(uid)
      .collection("mealLogs")
      .doc(date)
      .collection("meals")
      .doc(mealId)
      .delete();

    const summary = await recalculateDailySummary(uid, date);

    return res.json({
      message: "Meal deleted",
      summary
    });
  } catch (error) {
    console.error("Delete meal error:", error);

    return res.status(500).json({
      error: "Failed to delete meal"
    });
  }
});

// GET /api/meals/suggest?q=rice
router.get("/suggest", verifyToken, async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase().trim();

    if (!query || query.length < 2) {
      return res.json({
        suggestions: []
      });
    }

    const allSnap = await db.collection("foods").get();
    const searchWords = query.split(" ").filter((word) => word.length > 1);

    const scored = [];

    allSnap.forEach((doc) => {
      const data = doc.data();
      const nameLower = data.name.toLowerCase();

      let score = 0;

      if (nameLower === query) score += 100;
      if (nameLower.startsWith(query)) score += 50;

      searchWords.forEach((word) => {
        if (nameLower.includes(word)) score += 10;
      });

      if (score > 0) {
        scored.push({
          ...data,
          score
        });
      }
    });

    const top5 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score, ...food }) => food);

    if (top5.length === 0) {
      const searchRes = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
          query
        )}&pageSize=5&dataType=SR%20Legacy,Foundation&api_key=${
          process.env.USDA_API_KEY
        }`
      );

      const data = await searchRes.json();

      const usdaSuggestions = (data.foods || []).slice(0, 5).map((food) => ({
        name: food.description,
        calories_per_100g:
          food.foodNutrients?.find((nutrient) =>
            nutrient.nutrientName?.includes("Energy")
          )?.value || 0,
        category: "USDA"
      }));

      return res.json({
        suggestions: usdaSuggestions
      });
    }

    return res.json({
      suggestions: top5
    });
  } catch (error) {
    console.error("Meal suggest error:", error);

    return res.status(500).json({
      error: "Failed to get meal suggestions"
    });
  }
});

async function recalculateDailySummary(uid, date) {
  const userData = await ensureUserDoc(uid);

  const mealsSnap = await db
    .collection("users")
    .doc(uid)
    .collection("mealLogs")
    .doc(date)
    .collection("meals")
    .get();

  const meals = mealsSnap.docs.map((doc) => doc.data());
  const calorieTarget = userData.calorieTarget || 1500;
  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const isDeficit = totalCalories > 0 && totalCalories <= calorieTarget;

  await db
    .collection("users")
    .doc(uid)
    .collection("dailyLogs")
    .doc(date)
    .set(
      {
        totalCalories,
        calorieTarget,
        calorieTargetHit: isDeficit
      },
      { merge: true }
    );

  return {
    totalCalories,
    calorieTarget,
    remaining: calorieTarget - totalCalories,
    isDeficit
  };
}

export default router;