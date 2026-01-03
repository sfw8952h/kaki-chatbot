// component: SupplierLoginPage
import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function SupplierLoginPage({ onNavigate }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError

      // After login, your App.jsx will fetch profile.role and
      // show Supplier Center button automatically.
      setStatus("Supplier login successful. Redirecting...")
      onNavigate?.("/")
    } catch (err) {
      setError(err?.message || "Unable to login right now.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-panel login-panel">
      <div className="login-grid">
        <div className="login-hero">
          <p className="eyebrow">Supplier login</p>
          <h2>Sign in as Supplier</h2>
          <p className="hero-note">Access your supplier center and proposals</p>
          <div className="hero-support">
            <span />
          </div>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Email address
            <input
              type="email"
              placeholder="supplier@email.com"
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
              {loading ? "Signing in..." : "Continue to supplier center"}
            </button>

            {/* Supplier signup */}
            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/supplier-signup")}
            >
              Create supplier account
            </button>

            {/* Back to member login */}
            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/login")}
            >
              Back to member login
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default SupplierLoginPage