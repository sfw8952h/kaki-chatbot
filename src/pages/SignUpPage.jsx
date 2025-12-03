import "./Pages.css"

function SignUpPage({ onNavigate }) {
  return (
    <div className="page-panel">
      <p className="eyebrow">Create account</p>
      <h2>Join Kaki Membership </h2>
      <p>
        Get instant access to deals, chat-based shopping, and loyalty points.
      </p>
      <form className="signup-form" onSubmit={(event) => event.preventDefault()}>
        <label>
          Full name
          <input type="text" placeholder="Your name" />
        </label>
        <label>
          Email address
          <input type="email" placeholder="name@example.com" />
        </label>
        <label>
          Mobile number
          <input type="tel" placeholder="+65 1234 5678" />
        </label>
        <label>
          Set a password
          <input type="password" placeholder="Choose a secure password" />
        </label>
      </form>
      <button className="primary-btn zoom-on-hover">Create account</button>
      <div className="auth-helper-row">
        <span>Already a member?</span>
        <button
          className="ghost-btn zoom-on-hover"
          type="button"
          onClick={() => onNavigate?.("/login")}
        >
          Login
        </button>
      </div>
    </div>
  )
}

export default SignUpPage
