import express from 'express'
import { db } from '../firebase-admin.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()

// POST /api/users/profile — Save or update user profile
router.post('/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid  // from the verified token
    const { name, height, goalWeight, dateOfBirth } = req.body

    // Validate required fields
    if (!name || !height || !goalWeight) {
      return res.status(400).json({ 
        error: 'name, height, and goalWeight are required' 
      })
    }

    // Save to Firestore — document ID = user's uid
    await db.collection('users').doc(uid).set({
      name,
      height,
      goalWeight,
      dateOfBirth: dateOfBirth || null,
      updatedAt: new Date().toISOString()
    }, { merge: true }) // merge:true = update only provided fields

    res.status(201).json({ message: 'Profile saved successfully!' })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET /api/users/profile — Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid

    const doc = await db.collection('users').doc(uid).get()

    if (!doc.exists) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    res.json({ profile: doc.data() })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
