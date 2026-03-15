import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useNavigate, Navigate } from 'react-router-dom'
import styles from './LoginPage.module.css' 

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)

  const { login, signup, user } = useAuth()
  const navigate = useNavigate()

  // If already logged in, redirect to dashboard
    if (user) {
    return <Navigate to="/dashboard" replace />
    }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignup) {
        await signup(email, password)
      } else {
        await login(email, password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err.code))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/user-not-found':    return 'No account found with this email'
      case 'auth/wrong-password':    return 'Incorrect password'
      case 'auth/email-already-in-use': return 'Email already registered'
      case 'auth/weak-password':     return 'Password must be at least 6 characters'
      case 'auth/invalid-email':     return 'Please enter a valid email'
      default:                       return 'Something went wrong. Try again.'
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>🔥 CalBrave</h1>
        <h2 className={styles.subtitle}>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <p className={styles.toggle}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <span
            onClick={() => setIsSignup(!isSignup)}
            className={styles.link}
          >
            {isSignup ? ' Login' : ' Sign Up'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
