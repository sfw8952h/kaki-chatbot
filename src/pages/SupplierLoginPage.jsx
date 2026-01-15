import { useEffect, useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

const SUPPLIER_REMEMBER_EMAIL_KEY = "kaki_supplier_remember_email"

function SupplierLoginPage({ onNavigate }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetStatus, setResetStatus] = useState("")

  // ✅ load remembered email once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SUPPLIER_REMEMBER_EMAIL_KEY)
      if (saved) {
        setEmail(saved)
        setRememberMe(true)
      }
    } catch {}
  }, [])

  const persistRememberEmail = (nextRemember, nextEmail) => {
    try {
      const clean = String(nextEmail || "").trim().toLowerCase()
      if (nextRemember && clean) localStorage.setItem(SUPPLIER_REMEMBER_EMAIL_KEY, clean)
      else localStorage.removeItem(SUPPLIER_REMEMBER_EMAIL_KEY)
    } catch {}
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")
    setResetStatus("")
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (!cleanEmail || !password) {
        setError("Please enter email and password.")
        return
      }

      const supabase = getSupabaseClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (signInError) throw signInError

      // ✅ role gate: supplier only
      const userId = data?.user?.id
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (profileErr || profile?.role !== "supplier") {
        await supabase.auth.signOut()
        throw new Error("This account is not a supplier. Please use Member Login instead.")
      }

      // ✅ save email only if rememberMe
      persistRememberEmail(rememberMe, cleanEmail)

      setStatus("Login successful. Redirecting...")
      onNavigate?.("/supplier/dashboard")
    } catch (err) {
      setError(err?.message || "Unable to login right now.")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError("")
    setStatus("")
    setResetStatus("")

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError("Please enter your email first.")
      return
    }

    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error

      setResetStatus("If an account exists for this email, a reset link will be sent. Please check inbox/spam.")
    } catch (err) {
      setError(err?.message || "Unable to send reset email.")
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
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Email address
            <input
              type="email"
              placeholder="supplier@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => persistRememberEmail(rememberMe, email)} // ✅ save on blur
              disabled={loading}
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                className="ghost-btn zoom-on-hover password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div className="auth-form-foot">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  const next = e.target.checked
                  setRememberMe(next)
                  persistRememberEmail(next, email)
                }}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>

            <button className="ghost-btn zoom-on-hover" type="button" onClick={handleForgotPassword} disabled={loading}>
              Forgot password?
            </button>
          </div>

          {status && <p className="auth-status success">{status}</p>}
          {error && <p className="auth-status error">{error}</p>}
          {resetStatus && <p className="auth-status success">{resetStatus}</p>}

          <div className="auth-form-actions">
            <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Continue to supplier center"}
            </button>

            <button className="ghost-btn zoom-on-hover" type="button" onClick={() => onNavigate?.("/supplier-signup")} disabled={loading}>
              Create supplier account
            </button>

            <button className="ghost-btn zoom-on-hover" type="button" onClick={() => onNavigate?.("/login")} disabled={loading}>
              Back to member login
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default SupplierLoginPage