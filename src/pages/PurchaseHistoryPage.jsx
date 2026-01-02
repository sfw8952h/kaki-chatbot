// component: PurchaseHistoryPage
import "./Pages.css"

function PurchaseHistoryPage({ user, onNavigate, orders = [] }) {
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

  const hasOrders = orders.length > 0

  return (
    <section className="page-panel">
      <div className="board-top">
        <div>
          <p className="dash-label">Purchase history</p>
          <strong>Your past orders</strong>
          <p className="guest-detail">
            Quickly reorder favorites or request help with an existing order.
          </p>
        </div>
      </div>

      {!hasOrders ? (
        <div className="empty-cart">
          <p>You don’t have any orders yet.</p>
          <button className="primary-btn zoom-on-hover" type="button" onClick={() => onNavigate?.("/")}>
            Start shopping
          </button>
        </div>
      ) : (
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
            {orders.map((order) => {
              const orderItems = order.order_items ?? order.items ?? []
              const summary =
                orderItems.length > 0
                  ? orderItems
                      .map((item) => `${item.quantity}× ${item.product_name || item.name}`)
                      .join(", ")
                  : "No items recorded"
              const orderDate = order.placed_at || order.date || ""
              return (
                <div key={order.id} className="product-row">
                  <span>{order.id}</span>
                  <span>{summary}</span>
                  <span>{orderDate}</span>
                  <span className="price-chip">${order.total}</span>
                  <span className={order.status === "Delivered" ? "status success" : "status warn"}>
                    {order.status}
                  </span>
                  <div className="action-badges">
                    <button className="badge-btn primary" type="button" onClick={() => onNavigate?.("/")}>
                      Reorder
                    </button>
                    <button
                      className="badge-btn danger"
                      type="button"
                      onClick={() => {
                        const helpPath = order.id ? `/help/${order.id}` : "/help"
                        onNavigate?.(helpPath)
                      }}
                    >
                      Help
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default PurchaseHistoryPage
