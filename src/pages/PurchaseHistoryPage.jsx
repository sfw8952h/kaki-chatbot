// component: PurchaseHistoryPage
import "./Pages.css"

const purchases = [
  { id: "#2041", item: "Weekly fresh box", date: "Dec 03", total: "58.90", status: "Delivered" },
  { id: "#2040", item: "Pantry refill pack", date: "Nov 27", total: "34.20", status: "Delivered" },
  { id: "#2039", item: "Dairy-free bundle", date: "Nov 20", total: "26.10", status: "Refunded" },
  { id: "#2038", item: "Bakery sampler", date: "Nov 12", total: "18.50", status: "Delivered" },
]

function PurchaseHistoryPage({ user, onNavigate }) {
  if (!user) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Purchase history</p>
        <h2>Login required</h2>
        <p className="guest-detail">Sign in to view and manage your past orders.</p>
        <button className="primary-btn" type="button" onClick={() => onNavigate?.("/login")}>
          Go to login
        </button>
      </section>
    )
  }

  return (
    <section className="page-panel">
      <div className="board-top">
        <div>
          <p className="dash-label">Purchase history</p>
          <strong>Your past orders</strong>
          <p className="guest-detail">Quickly reorder favorites or request a refund.</p>
        </div>
      </div>

      <div className="product-table compact">
        <div className="product-header">
          <span>Order</span>
          <span>Items</span>
          <span>Date</span>
          <span>Total</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className="product-rows">
          {purchases.map((p) => (
            <div key={p.id} className="product-row">
              <span>{p.id}</span>
              <span>{p.item}</span>
              <span>{p.date}</span>
              <span className="price-chip">${p.total}</span>
              <span className={p.status === "Delivered" ? "status success" : "status warn"}>
                {p.status}
              </span>
              <div className="action-badges">
                <button className="badge-btn primary">Reorder</button>
                <button className="badge-btn danger">Refund</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PurchaseHistoryPage
