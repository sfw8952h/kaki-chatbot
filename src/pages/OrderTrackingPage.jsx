// component: OrderTrackingPage
import "./Pages.css"

const preferences = ["Leave at door", "Text on arrival", "No cutlery", "Eco packaging"]

// renders delivery tracking and preferences for the current user
function OrderTrackingPage({ user, onNavigate }) {
  if (!user) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Tracking</p>
        <h2>Login required</h2>
        <p className="guest-detail">Sign in to view your active deliveries and update instructions.</p>
        <button className="primary-btn" type="button" onClick={() => onNavigate?.("/login")}>
          Go to login
        </button>
      </section>
    )
  }

  const activeOrders = [
    {
      id: "#2042",
      title: "Same-day fresh pick",
      eta: "Arriving today • 5-7pm",
      step: "Out for delivery",
      carrier: "Kaki Express",
      address: "12 Hillview Rise #08-03, Singapore 669745",
    },
    {
      id: "#2043",
      title: "Pantry staples",
      eta: "Tomorrow • 12-2pm",
      step: "Packed",
      carrier: "Kaki Express",
      address: "8 Marina View #25-01, Singapore 018960",
    },
  ]

  return (
    <section className="page-panel profile-shell">
      <header className="profile-head">
        <div>
          <p className="eyebrow">Delivery & tracking</p>
          <h2>Manage deliveries with your profile</h2>
          <p className="guest-detail">
            Saved addresses and delivery preferences are shared with the chatbot for faster checkout and updates.
          </p>
        </div>
        <div className="pill-chip">Live updates</div>
      </header>

      <div className="tracking-grid">
        <article className="card-slab">
          <p className="dash-label">Delivery preferences</p>
          <div className="chip-row">
            {preferences.map((pref) => (
              <span key={pref} className="pill pill-soft">
                {pref}
              </span>
            ))}
          </div>
          <button className="ghost-btn" type="button">
            Edit preferences
          </button>
        </article>

        <article className="card-slab">
          <p className="dash-label">Default address</p>
          <h4>Home</h4>
          <p className="muted">12 Hillview Rise #08-03</p>
          <p className="muted">Singapore 669745</p>
          <button className="ghost-btn" type="button">
            Switch address
          </button>
        </article>
      </div>

      <article className="card-slab">
        <div className="board-top">
          <div>
            <p className="dash-label">Active orders</p>
            <strong>Live tracking</strong>
            <p className="guest-detail">Real-time delivery status with profile-linked addresses.</p>
          </div>
          <button className="primary-btn" type="button">
            View full history
          </button>
        </div>

        <div className="tracking-list">
          {activeOrders.map((order) => (
            <div key={order.id} className="tracking-card">
              <div className="tracking-head">
                <div>
                  <p className="dash-label">{order.id}</p>
                  <strong>{order.title}</strong>
                  <p className="muted">{order.address}</p>
                </div>
                <span className="pill pill-neutral">{order.carrier}</span>
              </div>
              <div className="tracking-meta">
                <span className="pill pill-soft">{order.step}</span>
                <span className="pill pill-soft">{order.eta}</span>
              </div>
              <div className="action-badges">
                <button className="badge-btn primary">Contact rider</button>
                <button className="badge-btn">Change instructions</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

export default OrderTrackingPage
