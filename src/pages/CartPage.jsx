// component: CartPage
import "./Pages.css"

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
  const formattedSubtotal = subtotal.toFixed(2)
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
                <button className="ghost-btn" onClick={() => onNavigate?.("/")}>
                  Keep shopping
                </button>
                <button className="primary-btn">Proceed to checkout</button>
              </div>
            </div>
          ) : (
            <div className="guest-cta">
              <p>Not signed in?</p>
              <div className="guest-actions">
                <button className="ghost-btn">Continue as guest</button>
                <button className="primary-btn" onClick={() => onNavigate?.("/login")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          <div className="cart-items">
            {isEmpty ? (
              <div className="empty-cart">
                <p>Your cart is empty. Add your favourite produce to get started.</p>
                <button className="primary-btn zoom-on-hover" onClick={() => onNavigate?.("/")}>
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
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQuantityChange?.(item.slug, item.quantity + 1)}
                        aria-label="Increase quantity"
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
            disabled={isEmpty}
            type="button"
          >
            {isEmpty ? "Add items to checkout" : "Checkout securely"}
          </button>
        </aside>
      </div>
    </section>
  )
}

export default CartPage
