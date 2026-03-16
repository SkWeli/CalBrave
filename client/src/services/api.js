import axios from 'axios'
import { auth } from '../firebase.js'

// Base axios instance - all requests go to this URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
})

// Interceptor - runs before EVERY request automatically
// Attaches the Firebase auth token to every request header
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser

  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Weight 

export const logWeight = async (weight, date) => {
  const res = await api.post('/weight/log', { weight, date })
  return res.data
}

export const getWeightHistory = async () => {
  const res = await api.get('/weight/history')
  return res.data
}

// Profile 

export const getProfile = async () => {
  const res = await api.get('/users/profile')
  return res.data
}

export const saveProfile = async (profileData) => {
  const res = await api.post('/users/profile', profileData)
  return res.data
}

// Gamification 

export const getGamificationStatus = async () => {
  const res = await api.get('/gamification/status')
  return res.data
}

export const logWaterGlass = async () => {
  const res = await api.post('/gamification/water')
  return res.data
}

export const getBadges = async () => {
  const res = await api.get('/gamification/badges')
  return res.data
}


export default api


