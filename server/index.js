import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { db } from './firebase-admin.js'
import verifyToken from './middleware/verifyToken.js'

dotenv.config() // Loads variables from .env into process.env

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors()) // Allows cross-origin requests from React frontend
app.use(express.json()) // Parses incoming JSON request bodies

// Public route — anyone can access
app.get('/', (req, res) => {
  res.json({ message: '🔥 CalBrave API is running!' })
})

// Protected route — only logged in users
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ 
    message: `Hello ${req.user.email}, you are authenticated!`,
    uid: req.user.uid
  })
})

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})
