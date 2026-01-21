// component: SignUpPage
import { useMemo, useRef, useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"
import ReCAPTCHA from "react-google-recaptcha"
import { FaGoogle } from "react-icons/fa"

function SignUpPage({ onNavigate }) {
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

  // ✅ captcha
  const recaptchaRef = useRef(null)
  const [captchaToken, setCaptchaToken] = useState("")
  const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

  // ---------- helpers ----------
  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const cleanName = useMemo(() => fullName.trim(), [fullName])

  // Email format (simple + solid)
  const isEmailValid = useMemo(() => {
    if (!cleanEmail) return false
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    return emailPattern.test(cleanEmail)
  }, [cleanEmail])

  // Phone: accept +65 or 65 or local 8-digit, and ignore spaces/dashes
  const normalizePhone = (raw) => String(raw || "").replace(/[\s-]/g, "")
  const normalizedPhone = useMemo(() => normalizePhone(phone.trim()), [phone])

  const isPhoneValid = useMemo(() => {
    if (!normalizedPhone) return false
    const local8 = /^[89]\d{7}$/
    const sgWith65 = /^(?:\+65|65)([89]\d{7})$/
    return local8.test(normalizedPhone) || sgWith65.test(normalizedPhone)
  }, [normalizedPhone])

  const formattedPhoneForProfile = useMemo(() => {
    const local8 = normalizedPhone.match(/^([89]\d{7})$/)
    if (local8) return `+65${local8[1]}`
    const sg = normalizedPhone.match(/^(?:\+65|65)([89]\d{7})$/)
    if (sg) return `+65${sg[1]}`
    return phone.trim()
  }, [normalizedPhone, phone])

  // password strength
  const passwordStrength = useMemo(() => {
    if (!password) return ""
    const rules = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ]
    const score = rules.filter(Boolean).length
    if (score >= 5) return "strong"
    if (score >= 3) return "medium"
    return "weak"
  }, [password])

  const passwordsMatch = useMemo(() => {
    if (!password && !confirmPassword) return true
    return password === confirmPassword
  }, [password, confirmPassword])

  // Inline field errors (shown only after user starts typing)
  const emailError =
    email.length === 0 ? "" : !isEmailValid ? "Please enter a valid email address." : ""

  const phoneError =
    phone.length === 0 ? "" : !isPhoneValid ? "Enter a valid SG number (e.g. +65 8123 4567)." : ""

  const passwordError =
    password.length === 0
      ? ""
      : passwordStrength !== "strong"
        ? "Use a stronger password (8+ chars, A-Z, a-z, 0-9, symbol)."
        : ""

  const confirmError =
    confirmPassword.length === 0 ? "" : !passwordsMatch ? "Passwords do not match." : ""

  // ✅ If you want signup to still work even when captcha key is missing on Vercel,
  // make captcha optional by toggling this:
  const CAPTCHA_REQUIRED = true

  const canSubmit =
    !!cleanName &&
    isEmailValid &&
    isPhoneValid &&
    passwordStrength === "strong" &&
    passwordsMatch &&
    (!CAPTCHA_REQUIRED || !!captchaToken) &&
    !loading

  // ✅ verify captcha on server (recommended)
  const verifyCaptcha = async (token) => {
    const res = await fetch("/api/verify-recaptcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || "Captcha verification failed. Please try again.")
    }
  }

  // Email signup
  const handleSignUp = async (e) => {
    e.preventDefault()
    setStatus("")
    setError("")

    if (!cleanName) return setError("Please enter your full name.")
    if (!isEmailValid) return setError("Please enter a valid email address.")
    if (!isPhoneValid) return setError("Please enter a valid Singapore mobile number.")
    if (passwordStrength !== "strong") return setError("Please choose a stronger password.")
    if (!passwordsMatch) return setError("Passwords do not match.")

    if (CAPTCHA_REQUIRED) {
      if (!SITE_KEY) return setError("Missing reCAPTCHA site key. Add VITE_RECAPTCHA_SITE_KEY in .env and Vercel.")
      if (!captchaToken) return setError("Please complete the captcha.")
    }

    setLoading(true)
    try {
      if (CAPTCHA_REQUIRED) await verifyCaptcha(captchaToken)

      const supabase = getSupabaseClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: formattedPhoneForProfile,
            role: "customer",
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) throw signUpError

      const userId = data?.user?.id
      if (userId) {
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: cleanName,
          phone: formattedPhoneForProfile,
          role: "customer",
        })
      }

      setStatus("Account created! Check your email to confirm.")
      setCaptchaToken("")
      recaptchaRef.current?.reset?.()
    } catch (err) {
      setError(err?.message || "Unable to create account.")
      setCaptchaToken("")
      recaptchaRef.current?.reset?.()
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth
  const handleOAuth = async (provider) => {
    setStatus("")
    setError("")
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      setError(err?.message || "Google login failed.")
      setLoading(false)
    }
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Create account</p>
      <h2>Join Kaki Membership</h2>
      <p>Get instant access to deals, chat-based shopping, and loyalty points.</p>

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

          {passwordStrength && (
            <div className={`pw-strength-label ${passwordStrength}`}>
              {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
            </div>
          )}
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

        {/* CAPTCHA */}
        {CAPTCHA_REQUIRED && (
          <div className="captcha-row">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={SITE_KEY || ""}
              onChange={(token) => setCaptchaToken(token || "")}
            />
          </div>
        )}

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <button className="primary-btn zoom-on-hover" type="submit" disabled={!canSubmit}>
          {loading ? "Creating..." : "Create account"}
        </button>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div className="social-auth">
          <button
            type="button"
            className="social-btn google"
            onClick={() => handleOAuth("google")}
            disabled={loading}
          >
            <FaGoogle size={18} />
            Google
          </button>
        </div>
      </form>

      <div className="auth-helper-row">
        <span>Already a member?</span>
        <button
          className="ghost-btn zoom-on-hover"
          type="button"
          onClick={() => onNavigate?.("/login")}
          disabled={loading}
        >
          Login
        </button>
      </div>
    </section>
  )
}

export default SignUpPage