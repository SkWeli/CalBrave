import express from 'express'
import { db } from '../firebase-admin.js'
import verifyToken from '../middleware/verifyToken.js'

const router = express.Router()

// POST /api/weight/log — Log a weight entry
router.post('/log', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid
    const { weight, date } = req.body

    // Validate
    if (!weight || !date) {
      return res.status(400).json({ error: 'weight and date are required' })
    }

    if (typeof weight !== 'number' || weight <= 0 || weight > 500) {
      return res.status(400).json({ error: 'weight must be a valid number in kg' })
    }

    // Date format check — must be YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' })
    }

    // Save to subcollection — document ID is the date
    // so only one entry per day per user
    await db
      .collection('users')
      .doc(uid)
      .collection('weightLogs')
      .doc(date)
      .set({
        weight,
        date,
        loggedAt: new Date().toISOString()
      })

      // Award BP for logging weight — only for today's date
      let bpResult = null
      const today = new Date().toISOString().split('T')[0]
      if (date === today) {
        try {
          const response = await fetch(`http://localhost:5000/api/gamification/log-action`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization
            },
            body: JSON.stringify({ action: 'WEIGHT_LOGGED' })
          })
          bpResult = await response.json()
        } catch (err) {
          // BP award failed silently — weight still saved ✅
          console.log('BP award failed:', err.message)
        }
      }

    res.status(201).json({ 
      message: `Weight ${weight}kg logged for ${date}`,
      blazePoints: bpResult   
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// GET /api/weight/history — Get all weight logs for this user
router.get('/history', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid

    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('weightLogs')
      .orderBy('date', 'asc')
      .get()

    // snapshot.empty = true if no documents found
    if (snapshot.empty) {
      return res.json({ logs: [] })
    }

    // Convert snapshot to an array of plain objects
    const logs = snapshot.docs.map(doc => doc.data())

    res.json({ logs })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// GET /api/weight/latest — Get most recent weight entry
router.get('/latest', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid

    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('weightLogs')
      .orderBy('date', 'desc') // newest first
      .limit(1)                // only 1 document
      .get()

    if (snapshot.empty) {
      return res.status(404).json({ error: 'No weight logs found' })
    }

    res.json({ latest: snapshot.docs[0].data() })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
