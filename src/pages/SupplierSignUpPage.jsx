import { useMemo, useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function SupplierSignUpPage({ onNavigate }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const formatSupabaseError = (err) => {
    if (!err) return "Unknown error"
    const parts = [
      err.message,
      err.details ? `details: ${err.details}` : null,
      err.hint ? `hint: ${err.hint}` : null,
      err.code ? `code: ${err.code}` : null,
    ].filter(Boolean)
    return parts.join(" | ")
  }

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const cleanName = useMemo(() => fullName.trim(), [fullName])

  const isEmailValid = useMemo(() => {
    if (!cleanEmail) return false
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    return emailPattern.test(cleanEmail)
  }, [cleanEmail])

  const normalizePhone = (raw) => String(raw || "").replace(/[\s-]/g, "")
  const normalizedPhone = useMemo(() => normalizePhone(phone.trim()), [phone])

  // You had isPhoneValid always true; keep that behavior for now
  // (you can tighten later to SG mobile validation)
  const isPhoneValid = useMemo(() => true, [])

  const formattedPhoneForProfile = useMemo(() => {
    const local8 = normalizedPhone.match(/^([89]\d{7})$/)
    if (local8) return `+65${local8[1]}`
    const sg = normalizedPhone.match(/^(?:\+65|65)([89]\d{7})$/)
    if (sg) return `+65${sg[1]}`
    return phone.trim()
  }, [normalizedPhone, phone])

  const isPasswordValid = useMemo(() => password.length >= 6, [password])

  const passwordsMatch = useMemo(() => {
    if (!password && !confirmPassword) return true
    return password === confirmPassword
  }, [password, confirmPassword])

  const emailError =
    email.length === 0 ? "" : !isEmailValid ? "Please enter a valid email address." : ""
  const phoneError = ""
  const passwordError =
    password.length === 0 ? "" : !isPasswordValid ? "Password must be at least 6 characters." : ""
  const confirmError =
    confirmPassword.length === 0 ? "" : !passwordsMatch ? "Passwords do not match." : ""

  const canSubmit = !!cleanName && isEmailValid && isPasswordValid && passwordsMatch && !loading

  const handleSignUp = async (e) => {
    e.preventDefault()
    setStatus("")
    setError("")

    if (!cleanName) return setError("Please enter your full name.")
    if (!isEmailValid) return setError("Please enter a valid email address.")
    if (!isPhoneValid) return setError("Please enter a valid Singapore mobile number.")
    if (!isPasswordValid) return setError("Password must be at least 6 characters.")
    if (!passwordsMatch) return setError("Passwords do not match.")

    setLoading(true)

    try {
      const supabase = getSupabaseClient()

      // 1) Sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: formattedPhoneForProfile,
            role: "supplier",
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) throw signUpError

      const userId = data?.user?.id
      const hasSession = !!data?.session

      // 2) If email confirmation is ON, user is NOT logged in yet
      //    => RLS will block inserts. So we stop here and tell them to verify & login.
      if (!userId) {
        setStatus("Account created. Please check your email to verify your account.")
        setLoading(false)
        return
      }

      if (!hasSession) {
        setStatus(
          "Account created! Please verify your email first, then log in. After logging in, submit your supplier request from this page again (or we can auto-create it with a trigger).",
        )
        setLoading(false)
        return
      }

      // 3) Now we ARE authenticated, so RLS policies using auth.uid() will work
      //    Upsert profile
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: cleanName,
          phone: formattedPhoneForProfile || null,

          role: "supplier",
        },
        { onConflict: "id" },
      )

      if (profileError) throw profileError

      setStatus("Supplier account created! You can now sign in.")
    } catch (err) {
      console.warn("Supplier signup failed:", err)
      setError(`Unable to create supplier account: ${formatSupabaseError(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Supplier access</p>
      <h2>Apply for Supplier Account</h2>
      <p>Your account will require admin approval before access is granted.</p>

      <form className="signup-form" onSubmit={handleSignUp}>
        <label>
          Full name
          <input
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          {emailError && <div className="field-error">{emailError}</div>}
        </label>

        <label>
          Mobile number
          <input
            type="tel"
            placeholder="+65 8123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
          {phoneError && <div className="field-error">{phoneError}</div>}
        </label>

        <label>
          Password
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
          {passwordError && <div className="field-error">{passwordError}</div>}
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
          {confirmError && <div className="field-error">{confirmError}</div>}
        </label>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <button className="primary-btn zoom-on-hover" type="submit" disabled={!canSubmit}>
          {loading ? "Submitting..." : "Request supplier access"}
        </button>
      </form>

      <div className="auth-helper-row">
        <span>Already approved?</span>
        <button
          className="ghost-btn zoom-on-hover"
          type="button"
          onClick={() => onNavigate?.("/supplier-login")}
          disabled={loading}
        >
          Supplier login
        </button>
      </div>
    </section>
  )
}

export default SupplierSignUpPage
