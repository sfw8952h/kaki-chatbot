import "./Pages.css"

const loginMetrics = [
  { label: "Instant cart sync", detail: "All devices stay updated with one tap" },
  { label: "Freshness guarantee", detail: "Live stock, weather-aware replenishment" },
  { label: "Shopify-level trust", detail: "Secure tokens and one-touch checkout" },
]

function LoginPage({ onNavigate }) {
  return (
    <section className="page-panel login-panel">
      <div className="login-grid">
        <div className="login-hero">
          <p className="eyebrow">Member login</p>
          <h2>Sign in to Kaki</h2>
          <p className="hero-note">
            Login to checkout faster
          </p>
          <div className="hero-support">
            <span></span>
          </div>
        </div>

        <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Email address
            <input type="email" placeholder="name@gmail.com" />
          </label>
          <label>
            Password
            <input type="password" placeholder="Enter your password" />
          </label>
          <div className="auth-form-foot">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button className="ghost-btn zoom-on-hover" type="button">
              Forgot password?
            </button>
          </div>
          <div className="auth-form-actions">
            <button className="primary-btn zoom-on-hover" type="submit">
              Continue to dashboard
            </button>
            <button
              className="ghost-btn zoom-on-hover"
              type="button"
              onClick={() => onNavigate?.("/signup")}
            >
              Create an account
            </button>
          </div>
        </form>
      </div>

    </section>
  )
}

export default LoginPage
