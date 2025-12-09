import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function FeedbackPage({ onFeedbackSubmitted }) {
  const [subject, setSubject] = useState("")
  const [details, setDetails] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")

    if (!subject.trim() || !details.trim()) {
      setError("Please fill in both fields.")
      return
    }

    setLoading(true)
    try {
      let supabase
      try {
        supabase = getSupabaseClient()
      } catch (clientErr) {
        setError("Feedback service is not configured. Check Supabase env vars.")
        return
      }

      // Get logged-in user's ID
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to send feedback.")
        setLoading(false)
        return
      }

      // Insert complaint into Supabase
      const { data: inserted, error: insertError } = await supabase
        .from("complaints")
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          details: details.trim(),
        })
        .select()
        .maybeSingle()

      if (insertError) throw insertError

      setStatus("Thank you! Your feedback has been submitted.")
      setSubject("")
      setDetails("")
      onFeedbackSubmitted?.({
        id: inserted?.id,
        subject: inserted?.subject || subject.trim(),
        details: inserted?.details || details.trim(),
        created_at: inserted?.created_at || new Date().toISOString(),
      })
    } catch (err) {
      console.error("Feedback error:", err)
      setError(err.message || "Could not submit feedback, please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Feedback</p>
      <h2>Help us improve</h2>
      <p>Share your thoughts on deliveries, products, or the chatbot experience.</p>

      <form className="signup-form" onSubmit={handleSubmit}>
        <label>
          Subject
          <input
            type="text"
            placeholder="Short summary"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>

        <label>
          Details
          <textarea
            rows="4"
            placeholder="Tell us what went well or what to fix"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send feedback"}
        </button>
      </form>
    </section>
  )
}

export default FeedbackPage
