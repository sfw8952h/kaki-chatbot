import "./GroceryShowcase.css"
import { products } from "../data/products"

const categories = [
  { label: "Vegetable", hint: "Local market" },
  { label: "Snacks & Breads", hint: "In store delivery" },
  { label: "Fruits", hint: "Chemical free" },
  { label: "Chicken", hint: "Frozen meal" },
  { label: "Milk & Dairy", hint: "Process food" },
  { label: "See all", hint: "Browse aisles", highlight: true },
]

function GroceryShowcase({ onNavigate }) {
  return (
    <section className="grocery-showcase fade-in">
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

      <div className="grocery-grid">
        {products.map((product) => (
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
              <div>
                <h4>{product.name}</h4>
                <p>{product.desc}</p>
              </div>
              <div className="grocery-meta">
                <span className="grocery-price">${product.price}</span>
                <div className="grocery-cta">
                  <button className="qty-btn" aria-label="Decrease quantity">
                    −
                  </button>
                  <span className="qty-count">1</span>
                  <button className="qty-btn" aria-label="Increase quantity">
                    +
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default GroceryShowcase
