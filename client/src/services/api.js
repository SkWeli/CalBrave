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

export default api
