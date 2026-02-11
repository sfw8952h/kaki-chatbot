// feedback page
import { useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

// submit feedback
function FeedbackPage({ onFeedbackSubmitted }) {
  // subject input
  const [subject, setSubject] = useState("")

  // details input
  const [details, setDetails] = useState("")

  // success message
  const [status, setStatus] = useState("")

  // error message
  const [error, setError] = useState("")

  // loading state
  const [loading, setLoading] = useState(false)

  // submit handler (stop refresh validate input and stuff)
  const handleSubmit = async (event) => {
    // stop reload
    event.preventDefault()

    // reset messages clear all the msg 
    setStatus("")
    setError("")

    // basic validation
    if (!subject.trim() || !details.trim()) {
      setError("Please fill in both fields.")
      return
    }

    // start loading
    setLoading(true)

    try {
      let supabase

      // get client
      try {
        supabase = getSupabaseClient()
      } catch {
        // config error
        setError("Feedback service is not configured. Check Supabase env vars.")
        return
      }

      // get user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // auth check
      if (!user) {
        setError("You must be logged in to send feedback.")
        setLoading(false)
        return
      }

      // insert record
      const { data: inserted, error: insertError } = await supabase
        .from("complaints")
        .insert({
          // user link
          user_id: user.id,
          subject: subject.trim(),
          details: details.trim(),
        })
        // return row
        .select()
        .maybeSingle()

      // insert fail
      if (insertError) throw insertError

      // success msg
      setStatus("Thank you! Your feedback has been submitted.")

      // reset form
      setSubject("")
      setDetails("")

      // notify parent
      onFeedbackSubmitted?.({
        id: inserted?.id,
        subject: inserted?.subject || subject.trim(),
        details: inserted?.details || details.trim(),
        created_at: inserted?.created_at || new Date().toISOString(),
      })
    } catch (err) {
      // log error
      console.error("Feedback error:", err)

      // show error
      setError(err.message || "Could not submit feedback, please try again.")
    } finally {
      // stop loading
      setLoading(false)
    }
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Feedback</p>
      <h2>Help us improve</h2>
      <p>Share your thoughts on deliveries, products, or the chatbot experience.</p>

      {/* feedback form */}
      <form className="signup-form" onSubmit={handleSubmit}>
        <label>
          Subject
          <input
            type="text"
            placeholder="Short summary"
            value={subject}
            // update subject
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>

        <label>
          Details
          <textarea
            rows="4"
            placeholder="Tell us what went well or what to fix"
            value={details}
            // update details
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>

        {/* success text */}
        {status && <p className="auth-status success">{status}</p>}

        {/* error text */}
        {error && <p className="auth-status error">{error}</p>}

        {/* submit button */}
        <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send feedback"}
        </button>
      </form>
    </section>
  )
}

export default FeedbackPage
