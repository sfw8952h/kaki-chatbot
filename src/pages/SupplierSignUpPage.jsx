// component: SupplierSignUpPage  (same style as member signup)
import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function SupplierSignUpPage({ onNavigate }) {
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // password strength (silent)
  const passwordStrength = (() => {
    const rules = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length

    if (rules >= 5) return "strong"
    if (rules >= 3) return "medium"
    if (password.length > 0) return "weak"
    return ""
  })()

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  const handleSignUp = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()
    const cleanCompany = companyName.trim()
    const cleanPhone = phone.trim()

    if (!cleanCompany || !cleanEmail || !password || !confirmPassword) {
      setError("Please fill in company name, email, and password.")
      setLoading(false)
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(cleanEmail)) {
      setError("Please enter a valid email address.")
      setLoading(false)
      return
    }

    if (passwordStrength !== "strong") {
      setError("Please choose a stronger password.")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()

      // 1) SIGN UP (auth)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { company_name: cleanCompany, phone: cleanPhone, role: "supplier" },
          emailRedirectTo: window?.location?.origin
            ? `${window.location.origin}/supplier-login`
            : undefined,
        },
      })

      if (signUpError) throw signUpError

      const user = signUpData?.user
      if (!user) throw new Error("Signup succeeded but user is missing from response.")

      // 2) INSERT PROFILE ROW
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: cleanCompany,
        phone: cleanPhone,
        role: "supplier",
      })

      if (profileError) {
        console.error("Profile insert error:", profileError)
      }

      setStatus("Supplier account created! Check your email to confirm.")
    } catch (err) {
      setError(err.message || "Unable to complete signup right now.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-panel">
      <p className="eyebrow">Supplier registration</p>
      <h2>Register as a Supplier</h2>
      <p>Create a supplier account to propose products and manage listings in the Supplier Center.</p>

      <form className="signup-form" onSubmit={handleSignUp}>
        <label>
          Company name
          <input
            type="text"
            placeholder="Your company name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={loading}
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
        </label>

        <label>
          Mobile number
          <input
            type="tel"
            placeholder="+65 1234 5678"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            disabled={loading}
          />
        </label>

        <label>
          Set a password
          <div className="password-row">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Choose a secure password"
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
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="ghost-btn zoom-on-hover password-toggle"
              onClick={() => setShowConfirm((v) => !v)}
              disabled={loading}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <button
          className="primary-btn zoom-on-hover"
          type="submit"
          disabled={loading || passwordStrength !== "strong" || !passwordsMatch}
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <div className="auth-helper-row">
        <span>Already a supplier?</span>
        <button
          className="ghost-btn zoom-on-hover"
          type="button"
          onClick={() => onNavigate?.("/supplier-login")}
        >
          Login
        </button>
      </div>
    </div>
  )
}

export default SupplierSignUpPage