import "./Pages.css"

const cartItems = [
  { name: "Sample", qty: "1 crate", price: "54 SGD" },
  { name: "Sample", qty: "2 bottles", price: "28 SGD" },
  { name: "Sample", qty: "1 loaf", price: "12 SGD" },
]

function CartPage() {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price.replace(/[^\d.]/g, "")),
    0
  )

  return (
    <section className="page-panel cart-page">
      <p className="eyebrow">Cart preview</p>
      <h2>Your cart is ready</h2>

      <div className="cart-layout">
        <div className="cart-main">
          <div className="guest-cta">
            <p>Not signed in?</p>
            <p className="guest-detail">
            </p>
            <div className="guest-actions">
              <button className="ghost-btn">Continue as guest</button>
              <button className="primary-btn">Sign in</button>
            </div>
          </div>

          <div className="cart-items">
            {cartItems.map((item) => (
              <article key={item.name} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.qty}</p>
                </div>
                <span>{item.price}</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="cart-summary-panel">
          <h3>Order summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{subtotal} SGD</strong>
          </div>
          <div className="summary-row">
            <span>Promotions</span>
            <strong>Apply at checkout</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <strong>Calculated later</strong>
          </div>
          <button className="primary-btn zoom-on-hover">Checkout securely</button>
          <p className="summary-foot"></p>
        </aside>
      </div>
    </section>
  )
}

export default CartPage
