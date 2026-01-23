// component: CartPage
import { useState, useEffect } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

function CartPage({
  user,
  profileName,
  onNavigate,
  items = [],
  subtotal = 0,
  onRemove,
  onQuantityChange,
}) {
  const isEmpty = items.length === 0
  const formattedSubtotal = Number(subtotal || 0).toFixed(2)

  const [error, setError] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState(null)

  useEffect(() => {
    if (!user) {
      setDeliveryAddress(null)
      return
    }

    const loadAddress = async () => {
      try {
        const supabase = getSupabaseClient()
        // Try to get default address first
        const { data: defData } = await supabase
          .from("addresses")
          .select("details")
          .eq("user_id", user.id)
          .eq("is_default", true)
          .maybeSingle()

        if (defData) {
          setDeliveryAddress(defData.details)
        } else {
          // Fallback to any address
          const { data: anyData } = await supabase
            .from("addresses")
            .select("details")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle()
          if (anyData) setDeliveryAddress(anyData.details)
        }
      } catch (err) {
        console.warn("Failed to load cart address", err)
      }
    }
    loadAddress()
  }, [user])

  const goToCheckout = () => {
    if (isEmpty) return

    // require login before checkout
    if (!user) {
      setError("Please sign in to continue checkout.")
      onNavigate?.("/login")
      return
    }

    // product_id must exist for every cart item (uuid from products table)
    const missing = (items || []).find((x) => !x?.product_id)
    if (missing) {
      setError("Some cart items are missing product_id. Please refresh and try again.")
      return
    }

    setError("")
    onNavigate?.("/checkout")
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
                  onClick={goToCheckout}
                  disabled={isEmpty}
                >
                  Proceed to checkout
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
              items.map((item) => {
                const maxStock = Number(item.onlineStock ?? item.stock ?? item.maxStock ?? Infinity)
                const reachedMax = Number.isFinite(maxStock) && item.quantity >= maxStock

                return (
                  <article key={item.slug} className="cart-item">
                    <div className="cart-item-main">
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt={item.name} className="cart-thumb" />
                      )}
                      <div>
                        <strong>{item.name}</strong>
                        <p>${Number(item.price || 0).toFixed(2)} each</p>
                      </div>
                      <span className="cart-line-total">
                        ${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
                      </span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="qty-group">
                        <button
                          type="button"
                          onClick={() => onQuantityChange?.(item.slug, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() => {
                            if (reachedMax) return
                            onQuantityChange?.(item.slug, item.quantity + 1)
                          }}
                          disabled={reachedMax}
                          aria-label="Increase quantity"
                          title={reachedMax ? "Reached max stock" : ""}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="ghost-btn danger"
                        type="button"
                        onClick={() => onRemove?.(item.slug)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                )
              })
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

          {deliveryAddress && (
            <div className="summary-row" style={{ alignItems: "flex-start", marginTop: 8 }}>
              <span>Delivery to</span>
              <strong style={{ textAlign: "right", maxWidth: "140px", fontSize: "0.85rem", lineHeight: "1.3" }}>
                {deliveryAddress}
              </strong>
            </div>
          )}

          <button
            className="primary-btn zoom-on-hover"
            disabled={isEmpty}
            type="button"
            onClick={goToCheckout}
          >
            {isEmpty ? "Add items to checkout" : "Checkout securely"}
          </button>
        </aside>
      </div>
    </section>
  )
}

export default CartPage