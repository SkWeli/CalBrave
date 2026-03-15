import admin from 'firebase-admin'
import dotenv from 'dotenv'

dotenv.config() // Loads variables from .env

// Converts the JSON string from .env back into an object
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

export { admin, db } // Makes Firebase and Firestore available to all route files
