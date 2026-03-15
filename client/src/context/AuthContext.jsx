import { createContext, useState, useEffect } from 'react'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged} from 'firebase/auth'

export const AuthContext = createContext()

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for login/logout — fires on every auth state change including page refresh
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe // stop listener on unmount
  }, [])

  const login  = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password)
  const logout = ()                => signOut(auth)

  const value = { user, login, signup, logout }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* hide app until Firebase confirms auth state */}
    </AuthContext.Provider>
  )
}
