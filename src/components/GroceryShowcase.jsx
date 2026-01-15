// component: GroceryShowcase (category chips and availability-aware product grid)
import { useState } from "react"
import "./GroceryShowcase.css"

function GroceryShowcase({ onNavigate, products, searchTerm, onSearch, onAddToCart }) {
  const hasQuery = !!searchTerm?.trim()
  const [quantities, setQuantities] = useState({})

  const handleQuantityChange = (slug, delta, maxQty = Infinity) => {
    setQuantities((prev) => {
      const current = prev[slug] || 1
      const next = Math.min(Math.max(1, current + delta), Math.max(1, maxQty))
      return { ...prev, [slug]: next }
    })
  }

  const getAvailability = (product) => {
    const onlineStock = Number(product.onlineStock) || 0
    const stores = Array.isArray(product.storeAvailability) ? product.storeAvailability : []

    const topStore = stores.reduce(
      (best, record) => {
        const stock = Number(record?.stock) || 0
        if (stock > best.stock) {
          return { stock, label: `${record.storeName} pickup` }
        }
        return best
      },
      { stock: onlineStock, label: "Online delivery" }
    )

    const stock = topStore.stock
    const label =
      stock <= 0
        ? "Out of stock"
        : stock < 5
          ? `${stock} left`
          : "In stock"
    const tone = stock <= 0 ? "out" : stock < 5 ? "low" : "in"
    const locationLabel = stock <= 0 ? "Unavailable" : topStore.label
    return { label, tone, locationLabel, stock }
  }

  const resultSummary = searchTerm?.trim()
    ? `Showing ${products.length} result${products.length === 1 ? "" : "s"} for "${searchTerm.trim()}"`
    : `Showing ${products.length} items`

  return (
    <section className="grocery-showcase fade-in">
      <div className="result-count standalone">{resultSummary}</div>

      {products.length === 0 ? (
        <div className="empty-search">
          <p className="eyebrow">No matches</p>
          <h3>
            {hasQuery
              ? `We could not find anything for "${searchTerm.trim()}".`
              : "We do not have items to show yet."}
          </h3>
          <p>
            {hasQuery
              ? "Try another keyword, or browse the featured categories above."
              : "Please check back soon or try refreshing the catalog."}
          </p>
          {hasQuery && (
            <button className="primary-btn" type="button" onClick={() => onSearch?.("")}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grocery-grid">
          {products.map((product) => {
            const availability = getAvailability(product)
            const stockLimit = availability.stock || 0
            const qty = Math.min(quantities[product.slug] || 1, Math.max(stockLimit, 1))
            return (
              <article
                key={product.slug}
                className="grocery-card zoom-on-hover"
                onClick={() => onNavigate?.(`/product/${product.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onNavigate?.(`/product/${product.slug}`)
                  }
                }}
              >
                <div className="grocery-media" style={{ background: product.accent }}>
                  {/* Premium Stock Indicator Overlay */}
                  <div className={`stock-indicator ${availability.tone === 'out' ? 'out-of-stock' : ''}`}>
                    <span className={`stock-dot stock-dot--${availability.tone}`} aria-hidden="true" />
                    <span>{availability.label}</span>
                  </div>
                  <img src={product.image} alt={product.name} className="grocery-media-image" />
                </div>
                <div className="grocery-text">
                  <div className="grocery-heading">
                    <h4>{product.name}</h4>
                    <p>{product.desc}</p>
                  </div>
                  <div className="grocery-meta">
                    <div className="price-block">
                      <span className="grocery-price">${product.price}</span>
                      {product.badge && <span className="stock-badge">{product.badge}</span>}
                    </div>
                  </div>
                  <div className="grocery-cta-row">
                    <div className="grocery-cta">
                      <button
                        className="qty-btn"
                        aria-label="Decrease quantity"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleQuantityChange(product.slug, -1)
                        }}
                        disabled={qty <= 1}
                      >
                        -
                      </button>
                      <span className="qty-count">{qty}</span>
                      <button
                        className="qty-btn"
                        aria-label="Increase quantity"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleQuantityChange(product.slug, 1)
                        }}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="add-cart-btn"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onAddToCart?.(product, qty)
                      }}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default GroceryShowcase
