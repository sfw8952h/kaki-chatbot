// component: SupplierSignUpPage
import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function SupplierSignUpPage({ onNavigate }) {
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [debug, setDebug] = useState("")

  const handleSignUp = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")
    setLoading(true)
    setDebug("")

    const cleanEmail = email.trim().toLowerCase()
    const cleanCompanyName = companyName.trim()
    const cleanPhone = phone.trim()

    if (!cleanCompanyName || !cleanEmail || !password) {
      setError("Please fill in your company name, email, and password.")
      setLoading(false)
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(cleanEmail)) {
      setError("Please enter a valid email address.")
      setLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()

      // 1) sign up (auth only)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            company_name: cleanCompanyName,
            phone: cleanPhone,
            requested_role: "supplier", // optional metadata (helpful for debugging/admin review)
          },
          emailRedirectTo: window?.location?.origin ? `${window.location.origin}/login` : undefined,
        },
      })

      if (signUpError) {
        setDebug(JSON.stringify({ stage: "auth.signUp", error: signUpError }, null, 2))
        throw signUpError
      }

      const user = signUpData?.user
      if (!user) throw new Error("Signup succeeded but user is missing from response.")

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: cleanCompanyName,
        phone: cleanPhone,
        role: "supplier",
      })

      if (profileError) {
        setDebug(JSON.stringify({ stage: "profiles.insert", error: profileError }, null, 2))
        console.error("Profile insert error:", profileError)
        throw profileError
      }

      setStatus("Supplier account created. Please confirm via email and log in.")
      await supabase.auth.signOut()
      // optional: send them to supplier login
      // onNavigate?.("/supplier-login")
    } catch (err) {
      console.error("Signup error:", err)
      setDebug(JSON.stringify({ stage: "caught error", message: err?.message }, null, 2))

      if (err?.message?.includes("Supabase client is not configured")) {
        setError("Supabase is not configured. Check your .env values.")
      } else {
        setError(err?.message || "Unable to complete signup right now.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-panel">
      <p className="eyebrow">Supplier registration</p>
      <h2>Create a Supplier Account</h2>
      <p>Supplier accounts are created by admins and shared with suppliers directly.</p>

      <form className="signup-form" onSubmit={handleSignUp}>
        <label>
          Company name
          <input
            type="text"
            placeholder="Your company name"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Mobile number
          <input
            type="tel"
            placeholder="+65 1234 5678"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>

        <label>
          Set a password
          <input
            type="password"
            placeholder="Choose a secure password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create supplier account"}
        </button>
      </form>

      {debug && <pre className="auth-debug">{debug}</pre>}

      <div className="auth-helper-row">
        <span>Need to return to the dashboard?</span>
        <button
          className="ghost-btn zoom-on-hover"
          type="button"
          onClick={() => onNavigate?.("/admin")}
          disabled={loading}
        >
          Back to admin center
        </button>
      </div>
    </div>
  )
}

export default SupplierSignUpPage
