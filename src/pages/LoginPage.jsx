// component: LoginPage
import { useEffect, useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"
import { FaGoogle, FaFacebook, FaApple } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"

const MEMBER_REMEMBER_EMAIL_KEY = "kaki_member_remember_email"

function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetStatus, setResetStatus] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // ✅ load remembered email once
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MEMBER_REMEMBER_EMAIL_KEY)
      if (saved) {
        setEmail(saved)
        setRememberMe(true)
      }
    } catch {}
  }, [])

  const persistRememberEmail = (nextRemember, nextEmail) => {
    try {
      const clean = String(nextEmail || "").trim().toLowerCase()
      if (nextRemember && clean) localStorage.setItem(MEMBER_REMEMBER_EMAIL_KEY, clean)
      else localStorage.removeItem(MEMBER_REMEMBER_EMAIL_KEY)
    } catch {}
  }

  // ✅ Social login (OAuth)
  const handleOAuth = async (provider) => {
    setError("")
    setStatus("")
    setResetStatus("")
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider, // "google" | "facebook" | "apple" | "twitter"
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setError(err?.message || "Social login failed.")
      setLoading(false)
    }
  }

  // ✅ Member login: allow ONLY customers
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

      const userId = data?.user?.id
      if (!userId) {
        await supabase.auth.signOut()
        throw new Error("Login failed. Please try again.")
      }

      // ✅ check role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      // If no profile row OR role not customer => reject + sign out
      if (profileError || !profile || profile.role !== "customer") {
        await supabase.auth.signOut()
        throw new Error("This account is not a customer. Please use Supplier/Admin login.")
      }

      // ✅ save email only if rememberMe
      persistRememberEmail(rememberMe, cleanEmail)

      setStatus("Login successful. Redirecting...")
      onNavigate?.("/")
    } catch (err) {
      setError(err?.message || "Unable to login right now.")
    } finally {
      setLoading(false)
    }
  }

  // ✅ password reset email (Supabase hides whether user exists)
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
      setPassword("")
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
          <p className="eyebrow">Member login</p>
          <h2>Sign in to Kaki</h2>
          <p className="hero-note">Login to checkout faster</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Email address
            <input
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => persistRememberEmail(rememberMe, email)}
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
                type="button"
                className="ghost-btn zoom-on-hover password-toggle"
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

            <button type="button" className="ghost-btn zoom-on-hover" onClick={handleForgotPassword} disabled={loading}>
              Forgot password?
            </button>
          </div>

          {status && <p className="auth-status success">{status}</p>}
          {error && <p className="auth-status error">{error}</p>}
          {resetStatus && <p className="auth-status success">{resetStatus}</p>}

          {/* ✅ Primary button */}
          <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </button>

          {/* ✅ Social login UNDER Continue */}
          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="social-auth">
            <button type="button" className="social-btn google" onClick={() => handleOAuth("google")} disabled={loading}>
              <FaGoogle size={18} />
              Google
            </button>
          </div>

          <div className="auth-form-actions">
            <button className="ghost-btn zoom-on-hover" type="button" onClick={() => onNavigate?.("/signup")} disabled={loading}>
              Create an account
            </button>

            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/supplier-login")}
              disabled={loading}
            >
              Sign in as Supplier
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default LoginPage