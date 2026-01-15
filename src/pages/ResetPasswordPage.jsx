import { useState, useEffect } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function ResetPasswordPage({ onNavigate }) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // password strength (silent)
  const passwordStrength = (() => {
    const rules = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /[a-z]/.test(newPassword),
      /[0-9]/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
    ].filter(Boolean).length

    if (rules >= 5) return "strong"
    if (rules >= 3) return "medium"
    if (newPassword.length > 0) return "weak"
    return ""
  })()

  // ✅ NEW: helpers to read tokens/code from URL
  const getUrlParams = () => new URLSearchParams(window.location.search)
  const getHashParams = () => new URLSearchParams((window.location.hash || "").replace(/^#/, ""))

  // ✅ CHANGED: Detect recovery session properly from Supabase reset link
  useEffect(() => {
    const supabase = getSupabaseClient()

    const initRecovery = async () => {
      try {
        setError("")
        setStatus("")

        // 1) If already have a session, you're ready
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          setReady(true)
          return
        }

        // 2) ✅ NEW: handle PKCE/code flow (?code=...)
        const code = getUrlParams().get("code")
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (exchangeError) throw exchangeError
          if (data?.session) {
            setReady(true)
            return
          }
        }

        // 3) ✅ NEW: handle hash token flow (#access_token & refresh_token)
        const hash = getHashParams()
        const access_token = hash.get("access_token")
        const refresh_token = hash.get("refresh_token")

        if (access_token && refresh_token) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (setSessionError) throw setSessionError
          if (data?.session) {
            setReady(true)
            return
          }
        }

        // 4) If nothing worked, link is invalid/expired
        setError("Invalid or expired reset link. Please request a new one.")
        setReady(false)
      } catch (err) {
        setError(err?.message || "Invalid or expired reset link. Please request a new one.")
        setReady(false)
      }
    }

    initRecovery()
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setStatus("")
    setError("")

    if (!ready) {
      setError("Recovery session missing. Please open the reset link from your email.")
      return
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.")
      return
    }

    if (passwordStrength !== "strong") {
      setError("Please choose a stronger password.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const supabase = getSupabaseClient()

      // ✅ CHANGED: make sure updateUser error is handled clearly
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError

      setStatus("Password updated! You can log in now.")

      // ✅ NEW (optional but recommended): clear URL params/hash after success
      try {
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch {}

      setTimeout(() => onNavigate?.("/login"), 1000)
    } catch (err) {
      setError(err?.message || "Unable to update password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-panel login-panel">
      <div className="login-grid">
        <div className="login-hero">
          <p className="eyebrow">Reset password</p>
          <h2>Set a new password</h2>
          <p className="hero-note">Enter a new password for your account.</p>
        </div>

        <form className="auth-form" onSubmit={handleUpdate}>
          <label>
            New password
            <div className="password-row">
              <input
                type={showNew ? "text" : "password"}
                placeholder="Enter a new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={!ready || loading}
              />
              <button
                type="button"
                className="ghost-btn zoom-on-hover pw-toggle"
                onClick={() => setShowNew((v) => !v)}
                disabled={!ready || loading}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>

            {passwordStrength && (
              <div className={`pw-strength-label ${passwordStrength}`}>
                {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
              </div>
            )}
          </label>

          <label>
            Confirm password
            <div className="password-row">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={!ready || loading}
              />
              <button
                type="button"
                className="ghost-btn zoom-on-hover pw-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                disabled={!ready || loading}
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {status && <p className="auth-status success">{status}</p>}
          {error && <p className="auth-status error">{error}</p>}

          <div className="auth-form-actions">
            <button
              className="primary-btn zoom-on-hover"
              type="submit"
              disabled={!ready || loading || passwordStrength !== "strong" || newPassword !== confirmPassword}
            >
              {loading ? "Updating..." : "Update password"}
            </button>

            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/login")}
              disabled={loading}
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ResetPasswordPage