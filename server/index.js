import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { db } from './firebase-admin.js'
import userRoutes from './routes/userRoutes.js'
import weightRoutes from './routes/weightRoutes.js' 
import gamificationRoutes from './routes/gamificationRoutes.js'

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

// Mount user routes at /api/users
app.use('/api/users', userRoutes)
aapp.use('/api/gamification', gamificationRoutes)
app.use('/api/weight', weightRoutes)

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})
