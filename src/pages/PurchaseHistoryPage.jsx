// component: PurchaseHistoryPage
// component: PurchaseHistoryPage
import { useState } from "react"
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
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  const formatOrderDate = (value) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const toggleExpansion = (id) => {
    setExpandedOrderId((prev) => (prev === id ? null : id))
  }

  const renderOrderItems = (items) => {
    if (!items || items.length === 0) return "No items recorded."
    return items
      .map((item) => `${item.quantity}x ${item.product_name || item.name}`)
      .join(", ")
  }

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
            <span>Date</span>
            <span>Total</span>
            <span>Status</span>
            <span>Actions</span>
            <span>Details</span>
          </div>
          <div className="product-rows">
            {orders.map((order, index) => {
              const orderItems = order.order_items ?? order.items ?? []
              const orderDate = order.placed_at || order.date || ""
              const isExpanded = expandedOrderId === order.id

              return (
                <div key={order.id}>
                  <div className="product-row">
                    <span>Order #{orders.length - index}</span>
                    <span>{formatOrderDate(orderDate)}</span>
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
                    <span>
                      <button
                        className="primary-btn zoom-on-hover summary-toggle"
                        type="button"
                        onClick={() => toggleExpansion(order.id)}
                      >
                        {isExpanded ? "Hide order" : "Show full order"}
                      </button>
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="order-detail-row">
                      <p>{renderOrderItems(orderItems)}</p>
                    </div>
                  )}
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
