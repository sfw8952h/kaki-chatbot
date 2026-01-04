// component: OrderHelpPage
import { useState } from "react"
import "./Pages.css"

const helpOptions = [
  {
    id: "issues",
    title: "Order issues",
    description: "Report missing items, damaged goods, or anything that didn't match your expectation.",
  },
  {
    id: "changes",
    title: "Change order",
    description: "Update delivery details, swap items, or add something before we ship.",
  },
  {
    id: "cancel",
    title: "Cancel order",
    description: "Need to cancel entirely? Let us know as soon as possible before fulfillment.",
  },
]

const SUPPORT_EMAIL = "support@kakigrocery.com"

function OrderHelpPage({ orderId, orders = [], onNavigate }) {
  const normalizedId = String(orderId ?? "").trim()
  const order = orders.find((entry) => String(entry.id) === normalizedId)
  const referenceLabel = order ? `Order ${order.id}` : normalizedId ? `Order ${normalizedId}` : "your order"

  const [ackTopic, setAckTopic] = useState(null)

  const handleHelpRequest = (topic) => {
    setAckTopic(topic)
  }

  return (
    <section className="page-panel">
      <div className="board-top help-head">
        <div>
          <p className="dash-label">Need help?</p>
          <strong>Choose how we can assist with {referenceLabel}</strong>
          <p className="guest-detail">
            We guide you through the right next steps. Pick the topic that best matches your need and we‚
            open a support email with everything pre-filled.
          </p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => onNavigate?.("/history")}>
          Back to history
        </button>
      </div>

        <div className="help-grid">
          {helpOptions.map((option) => (
            <article key={option.id} className="help-card">
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <div className="help-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleHelpRequest(option.title)}
                >
                  Request help
                </button>
              </div>
            </article>
          ))}
        </div>

        {ackTopic && (
          <div className="help-alert" role="status">
            <p>We are reviewing your issue ({ackTopic}). Thank you for your patience.</p>
          </div>
        )}

      <div className="help-note">
        <p>
          Prefer chat instead? Reach us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or call
          1212121212 and mention {referenceLabel}.
        </p>
      </div>
    </section>
  )
}

export default OrderHelpPage
