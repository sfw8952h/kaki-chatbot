// component: LoginPage
import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

const loginMetrics = [
  { label: "Instant cart sync", detail: "All devices stay updated with one tap" },
  { label: "Freshness guarantee", detail: "Live stock, weather-aware replenishment" },
  { label: "Shopify-level trust", detail: "Secure tokens and one-touch checkout" },
]

function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // handles user login with Supabase
  const handleLogin = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      setStatus("Login successful. Redirecting...")
      if (onNavigate) {
        onNavigate("/")
      }
    } catch (err) {
      setError(err.message || "unable to login right now.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-panel login-panel">
      <div className="login-grid">
        <div className="login-hero">
          <p className="eyebrow">Member login</p>
          <h2>Sign in to Kaki</h2>
          <p className="hero-note">Login to checkout faster</p>
          <div className="hero-support">
            <span />
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Email address
            <input
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <div className="auth-form-foot">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button className="ghost-btn zoom-on-hover" type="button">
              Forgot password?
            </button>
          </div>

          {status && (
            <p className="auth-status success" role="status">
              {status}
            </p>
          )}
          {error && (
            <p className="auth-status error" role="alert">
              {error}
            </p>
          )}

          <div className="auth-form-actions">
            <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Continue to dashboard"}
            </button>
            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/signup")}
            >
              Create an account
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default LoginPage
