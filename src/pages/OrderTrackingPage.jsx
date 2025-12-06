// order tracking page showing live delivery status
import "./Pages.css"

const tracking = [
  { id: "#1026", item: "apple", eta: "Arriving today", step: "Out for delivery" },
  { id: "#1025", item: " oranges", eta: "Tomorrow", step: "In transit" },
]

function OrderTrackingPage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">Track orders</p>
      <h2>Live delivery status</h2>
      <div className="list-stack">
        {tracking.map((t) => (
          <article key={t.id} className="list-card">
            <div>
              <strong>{t.item}</strong>
              <p>{t.id}</p>
            </div>
            <div className="list-meta">
              <span>{t.step}</span>
              <strong>{t.eta}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default OrderTrackingPage
