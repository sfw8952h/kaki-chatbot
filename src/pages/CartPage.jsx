// component: CartPage
import { useState } from "react"
import "./Pages.css"

function CartPage({
  user,
  profileName,
  onNavigate,
  items = [],
  subtotal = 0,
  onRemove,
  onQuantityChange,
  onCheckout, // must be async and save to supabase
}) {
  const isEmpty = items.length === 0
  const formattedSubtotal = subtotal.toFixed(2)

  const [orderSuccess, setOrderSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleCheckoutClick = async () => {
    if (isEmpty || orderSuccess || saving) return
    setError("")
    setSaving(true)

    try {
      if (!user) {
        setError("Please sign in to place an order.")
        onNavigate?.("/login")
        return
      }

      // IMPORTANT:
      // - total should be a number (not string)
      // - await onCheckout so we only redirect after supabase insert succeeds
      await onCheckout?.({
        items: items.map((item) => ({
          slug: item.slug,
          product_id: item.id ?? null, // optional if you have product uuid
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: Number(formattedSubtotal),
      })

      setOrderSuccess(true)
    } catch (e) {
      console.error(e)
      setError(e?.message || "Checkout failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-panel cart-page">
      <p className="eyebrow">Cart preview</p>
      <h2>Your cart is ready</h2>

      <div className="cart-layout">
        <div className="cart-main">
          {user ? (
            <div className="guest-cta signed-in">
              <p>Signed in as</p>
              <p className="guest-detail">{profileName || user.email}</p>
              <div className="guest-actions">
                <button className="ghost-btn" type="button" onClick={() => onNavigate?.("/")}>
                  Keep shopping
                </button>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={isEmpty || orderSuccess || saving}
                >
                  {saving ? "Placing order..." : "Proceed to checkout"}
                </button>
              </div>
            </div>
          ) : (
            <div className="guest-cta">
              <p>Not signed in?</p>
              <div className="guest-actions">
                <button className="ghost-btn" type="button" onClick={() => onNavigate?.("/")}>
                  Continue as guest
                </button>
                <button className="primary-btn" type="button" onClick={() => onNavigate?.("/login")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <div className="cart-items">
            {isEmpty ? (
              <div className="empty-cart">
                <p>Your cart is empty. Add your favourite produce to get started.</p>
                <button
                  className="primary-btn zoom-on-hover"
                  type="button"
                  onClick={() => onNavigate?.("/")}
                >
                  Browse products
                </button>
              </div>
            ) : (
              items.map((item) => (
                <article key={item.slug} className="cart-item">
                  <div className="cart-item-main">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.name} className="cart-thumb" />
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <p>${item.price.toFixed(2)} each</p>
                    </div>
                    <span className="cart-line-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="cart-item-actions">
                    <div className="qty-group">
                      <button
                        type="button"
                        onClick={() => onQuantityChange?.(item.slug, item.quantity - 1)}
                        disabled={item.quantity <= 1 || saving || orderSuccess}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQuantityChange?.(item.slug, item.quantity + 1)}
                        disabled={saving || orderSuccess}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="ghost-btn danger"
                      type="button"
                      onClick={() => onRemove?.(item.slug)}
                      disabled={saving || orderSuccess}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="cart-summary-panel">
          <h3>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>${formattedSubtotal}</strong>
          </div>
          <div className="summary-row">
            <span>Promotions</span>
            <strong>Apply at checkout</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Calculated later</strong>
          </div>

          <button
            className="primary-btn zoom-on-hover"
            disabled={isEmpty || orderSuccess || saving}
            type="button"
            onClick={handleCheckoutClick}
          >
            {isEmpty ? "Add items to checkout" : saving ? "Placing order..." : "Checkout securely"}
          </button>

          {orderSuccess && (
            <p className="success-text">Order confirmed. You can review details below.</p>
          )}
        </aside>
      </div>

      {orderSuccess && (
        <div className="order-confirmation-overlay" role="dialog" aria-modal="true">
          <div className="order-confirmation-card">
            <div className="order-confirmation-icon" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="img" focusable="false">
                <circle cx="32" cy="32" r="30" fill="#dff5e6" />
                <path
                  d="M19 33.5l8 8 18-20"
                  fill="none"
                  stroke="#0a6c51"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3>Order confirmed</h3>
            <p>
              We received your order. You'll get a confirmation email at{" "}
              <strong>{user?.email || "your email"}</strong>.
            </p>
            <div className="order-confirmation-actions">
              <button
                className="ghost-btn"
                type="button"
                onClick={() => onNavigate?.("/history")}
              >
                View order details
              </button>
              <button
                className="primary-btn"
                type="button"
                onClick={() => {
                  setOrderSuccess(false)
                  onNavigate?.("/")
                }}
              >
                Continue shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default CartPage
