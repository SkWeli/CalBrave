import express from "express";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// POST /api/weight/log
// Log a weight entry
router.post("/log", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { weight, date } = req.body;

    if (weight === undefined || weight === null || !date) {
      return res.status(400).json({
        error: "weight and date are required"
      });
    }

    const weightNumber = Number(weight);

    if (Number.isNaN(weightNumber) || weightNumber <= 0 || weightNumber > 500) {
      return res.status(400).json({
        error: "weight must be a valid number in kg"
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: "date must be in YYYY-MM-DD format"
      });
    }

    await db
      .collection("users")
      .doc(uid)
      .collection("weightLogs")
      .doc(date)
      .set({
        weight: weightNumber,
        date,
        loggedAt: new Date().toISOString()
      });

    let bpResult = null;
    const today = new Date().toISOString().split("T")[0];

    if (date === today) {
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
              action: "WEIGHT_LOGGED"
            })
          }
        );

        bpResult = await response.json();
      } catch (err) {
        console.log("BP award failed:", err.message);
      }
    }

    return res.status(201).json({
      message: `Weight ${weightNumber}kg logged for ${date}`,
      blazePoints: bpResult
    });
  } catch (error) {
    console.error("Log weight error:", error);

    return res.status(500).json({
      error: "Failed to log weight"
    });
  }
});

// GET /api/weight/history
// Get all weight logs for this user
router.get("/history", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("weightLogs")
      .orderBy("date", "asc")
      .get();

    if (snapshot.empty) {
      return res.json({
        logs: []
      });
    }

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return res.json({
      logs
    });
  } catch (error) {
    console.error("Get weight history error:", error);

    return res.status(500).json({
      error: "Failed to get weight history"
    });
  }
});

// GET /api/weight/latest
// Get most recent weight entry
router.get("/latest", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("weightLogs")
      .orderBy("date", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        error: "No weight logs found"
      });
    }

    return res.json({
      latest: {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      }
    });
  } catch (error) {
    console.error("Get latest weight error:", error);

    return res.status(500).json({
      error: "Failed to get latest weight"
    });
  }
});

export default router;