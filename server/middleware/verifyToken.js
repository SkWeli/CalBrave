import { admin } from '../firebase-admin.js'

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization // Get the token from the request header

    // Check if header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided. Please login first.' 
      })
    }

    const token = authHeader.split(' ')[1] // Extract just the token part (remove 'Bearer ' prefix)
    const decodedToken = await admin.auth().verifyIdToken(token) //Verify the token with Firebase Admin

    req.user = decodedToken // Attach user info to request object

    next() // Move to the next function (the actual route handler)

  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token. Please login again.' 
    })
  }
}

export default verifyToken
