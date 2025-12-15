// component: ProfilePage
import { useEffect, useMemo, useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function ProfilePage({ onNavigate, user, profileName, onProfileUpdated }) {
  const supabase = useMemo(() => {
    try {
      return getSupabaseClient()
    } catch (err) {
      console.error(err)
      return null
    }
  }, [])

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setFullName(profileName || meta.full_name || meta.name || "")
    setPhone(meta.phone || "")
    setAddress(meta.address || "")
  }, [user, profileName])

  // ensures the user session is valid before updates
  const ensureSession = async () => {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (data?.session) return data.session

    // try to refresh if possible
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) throw refreshError
    if (!refreshed?.session) {
      throw new Error("Session expired. Please log in again.")
    }
    return refreshed.session
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")
    if (!supabase) {
      setError("Supabase is not configured.")
      return
    }
    if (!user) {
      setError("You need to be logged in to update your profile.")
      return
    }

    setLoading(true)
    try {
      await ensureSession()
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() },
      })
      if (updateError) throw updateError

      setStatus("Profile updated successfully.")
      onProfileUpdated?.(fullName.trim())
    } catch (err) {
      console.error("Update profile error:", err)
      setError(err.message || "Unable to update profile right now.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <section className="page-panel">
        <h2>Profile</h2>
        <p>You need to log in to manage your profile.</p>
        <button className="primary-btn zoom-on-hover" onClick={() => onNavigate?.("/login")}>
          Go to login
        </button>
      </section>
    )
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Your account</p>
      <h2>Profile & Address</h2>
      <p>Manage your name, contact, and delivery address.</p>

      <form className="signup-form" onSubmit={handleUpdate}>
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
          Email (sign-in)
          <input type="email" value={user.email} disabled />
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
          Address
          <textarea
            placeholder="Street, unit, postal code"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={3}
          />
        </label>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <div className="auth-helper-row">
          <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </button>
          <button className="ghost-btn zoom-on-hover" type="button" onClick={() => onNavigate?.("/")}>
            Back to home
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProfilePage
