import express from "express";
import { db } from "../firebase-admin.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

// POST /api/users/profile
// Create or update the authenticated user's profile
router.post("/profile", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const {
      name,
      height,
      goalWeight,
      dateOfBirth,
      gender,   // ← persisted from SetupPage
      bmi,      // ← persisted so DashboardPage can render BMIGauge immediately
      bmiStatus // ← persisted for categorisation
    } = req.body;

    // Required field validation
    if (!name || !height || !goalWeight) {
      return res.status(400).json({
        error: "name, height, and goalWeight are required"
      });
    }

    const heightNumber     = Number(height);
    const goalWeightNumber = Number(goalWeight);

    if (Number.isNaN(heightNumber) || Number.isNaN(goalWeightNumber)) {
      return res.status(400).json({
        error: "height and goalWeight must be valid numbers"
      });
    }

    await db.collection("users").doc(uid).set(
      {
        name,
        email:        req.user.email || null,
        height:       heightNumber,
        goalWeight:   goalWeightNumber,
        dateOfBirth:  dateOfBirth  || null,
        gender:       gender       || null,
        bmi:          bmi          != null ? Number(bmi) : null,
        bmiStatus:    bmiStatus    || null,
        authProvider: "asgardeo",
        asgardeoSub:  req.user.sub,
        updatedAt:    new Date().toISOString()
      },
      { merge: true }
    );

    return res.status(201).json({ message: "Profile saved successfully!" });
  } catch (error) {
    console.error("Save profile error:", error);
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

// GET /api/users/profile
// Return the authenticated user's profile (404 if not yet created)
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection("users").doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.json({
      profile: { id: doc.id, ...doc.data() }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

export default router;