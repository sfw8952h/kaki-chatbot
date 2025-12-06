// feedback page for collecting user suggestions
import "./Pages.css"

function FeedbackPage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">Feedback</p>
      <h2>Help us improve</h2>
      <p>Share your thoughts on deliveries, products, or the chatbot experience.</p>
      <form className="signup-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Subject
          <input type="text" placeholder="Short summary" />
        </label>
        <label>
          Details
          <textarea rows="4" placeholder="Tell us what went well or what to fix" />
        </label>
        <button className="primary-btn zoom-on-hover" type="submit">
          Send feedback
        </button>
      </form>
    </section>
  )
}

export default FeedbackPage
