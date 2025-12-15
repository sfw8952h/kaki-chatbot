// component: GroceryShowcase (category chips and availability-aware product grid)
import "./GroceryShowcase.css"

const categories = [
  { label: "Vegetable", hint: "Local market" },
  { label: "Snacks & Breads", hint: "In store delivery" },
  { label: "Fruits", hint: "Chemical free" },
  { label: "Chicken", hint: "Frozen meal" },
  { label: "Milk & Dairy", hint: "Process food" },
  { label: "See all", hint: "Browse aisles", highlight: true },
]

function GroceryShowcase({ onNavigate, products, searchTerm, onSearch }) {
  const hasQuery = !!searchTerm?.trim()

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
          ? `Low stock (${stock} left)`
          : `In stock (${stock} available)`
    const tone = stock <= 0 ? "out" : stock < 5 ? "low" : "in"
    return { label, tone, locationLabel: stock <= 0 ? "Currently unavailable" : topStore.label }
  }

  const resultSummary = searchTerm?.trim()
    ? `Showing ${products.length} result${products.length === 1 ? "" : "s"} for "${searchTerm.trim()}"`
    : `Showing ${products.length} items`

  return (
    <section className="grocery-showcase fade-in">
      <div className="result-count standalone">{resultSummary}</div>

      <section className="category-panel">
        <div className="category-grid">
          {categories.map((category) => (
            <article
              key={category.label}
              className={`category-chip ${category.highlight ? "category-chip--highlight" : ""}`}
            >
              <div>
                <strong>{category.label}</strong>
                <p>{category.hint}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

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
                  <span aria-hidden="true">{product.icon}</span>
                  <small>{product.tag}</small>
                </div>
                <div className="grocery-text">
                  <div className="grocery-heading">
                    <h4>{product.name}</h4>
                    <p>{product.desc}</p>
                  </div>
                  <div className="grocery-meta">
                    <div className="price-block">
                      <span className="grocery-price">${product.price}</span>
                      <span className="stock-badge">{product.badge}</span>
                    </div>
                    <div className="grocery-cta">
                      <button className="qty-btn" aria-label="Decrease quantity">
                        -
                      </button>
                      <span className="qty-count">1</span>
                      <button className="qty-btn" aria-label="Increase quantity">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="availability-row">
                    <span className={`stock-dot stock-dot--${availability.tone}`} aria-hidden="true" />
                    <div className="availability-copy">
                      <strong>{availability.label}</strong>
                      <small>{availability.locationLabel}</small>
                    </div>
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
