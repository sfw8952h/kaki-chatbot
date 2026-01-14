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

      // 1) sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError

      const userId = signInData?.user?.id
      if (!userId) throw new Error("Login succeeded but no user returned.")

      // 2) fetch profile role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      // if profile missing or blocked, do not allow supplier login
      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error("No supplier profile found for this account.")
      }

      // 3) enforce supplier-only
      if (profile.role !== "supplier") {
        await supabase.auth.signOut()
        throw new Error("This login is for suppliers only. Please use Member Login.")
      }

      // 4) allowed
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
          <p className="eyebrow">Supplier access</p>
          <h2>Supplier sign in</h2>
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
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
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

            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/supplier-signup")}
              disabled={loading}
            >
              Become a new supplier
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default SupplierLoginPage
