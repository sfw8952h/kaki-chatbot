// signup page component for new account creation
import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function SignUpPage({ onNavigate }) {
  const [fullName, setFullName] = useState("")
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
    const cleanName = fullName.trim()
    const cleanPhone = phone.trim()

    if (!cleanName || !cleanEmail || !password) {
      setError("Please fill in your name, email, and password.")
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

      // 1) SIGN UP (auth only)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName, phone: cleanPhone }, // metadata only
          emailRedirectTo: window?.location?.origin
            ? `${window.location.origin}/login`
            : undefined,
        },
      })

      if (signUpError) {
        setDebug(JSON.stringify({ stage: "auth.signUp", error: signUpError }, null, 2))
        throw signUpError
      }

      const user = signUpData?.user
      if (!user) {
        throw new Error("Signup succeeded but user is missing from response.")
      }

      // 2) INSERT PROFILE ROW (this populates the profiles table)
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,            // must match profiles.id (PK, FK -> auth.users.id)
        full_name: cleanName,
        phone: cleanPhone,
        role: "customer",       // default role; you can change manually to 'admin' or 'supplier'
      })

      if (profileError) {
        setDebug((prev) =>
          prev ||
          JSON.stringify(
            { stage: "profiles.insert", error: profileError },
            null,
            2
          )
        )
        // don't throw here if you still want auth account to be created
        console.error("Profile insert error:", profileError)
      }

      setDebug(
        JSON.stringify(
          {
            stage: "completed",
            user: {
              id: user.id,
              email: user.email,
              phone: user.phone,
              metadata: user.user_metadata,
            },
          },
          null,
          2
        )
      )

      setStatus("Account created! Check your email to confirm.")
    } catch (err) {
      console.error("Signup error:", err)

      if (!debug) {
        setDebug(JSON.stringify({ stage: "caught error", message: err.message }, null, 2))
      }

      if (err.message?.includes("Supabase client is not configured")) {
        setError("Supabase is not configured. Check your .env values.")
      } else {
        setError(err.message || "Unable to complete signup right now.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-panel">
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
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>

        <label>
          Email address
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
          />
        </label>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      {debug && <pre className="auth-debug">{debug}</pre>}

      <div className="auth-helper-row">
        <span>Already a member?</span>
        <button
          className="ghost-btn zoom-on-hover"
          type="button"
          onClick={() => onNavigate?.("/login")}
        >
          Login
        </button>
      </div>
    </div>
  )
}

export default SignUpPage
