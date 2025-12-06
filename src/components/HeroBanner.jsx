// hero banner showcasing top features and cta
import "./HeroBanner.css"

const heroFeatures = [
  { label: "Fresh produce", detail: "Daily harvest, chilled and crisp" },
  { label: "Same-day delivery", detail: "Order now, get it in hours" },
  { label: "Member perks", detail: "Loyalty that stacks every cart" },
]

function HeroBanner() {
  return (
    <section className="hero-banner fade-in">
      <div className="hero-text">
        <p className="eyebrow">Groceries to your door</p>
        <h1>Cheapest Prices</h1>
        <p className="hero-subhead">
          Get groceries at a cheapest price.
        </p>
        <div className="hero-actions">
          <button className="primary-btn zoom-on-hover">Shop now</button>
          
        </div>
        <div className="hero-feature-row">
          {heroFeatures.map((feature) => (
            <div key={feature.label} className="hero-feature">
              <strong>{feature.label}</strong>
              <p>{feature.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-bag">
          <span role="img" aria-label="groceries">
            🛍️
          </span>
          <div className="bag-shadow" />
        </div>
      </div>
    </section>
  )
}

export default HeroBanner
