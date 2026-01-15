// src/components/Header.jsx
import { useEffect } from "react"
import "./Header.css"
import { FaSearch, FaShoppingCart } from "react-icons/fa"
import { MdLocationOn } from "react-icons/md"

const CATEGORIES = [
  "All Categories",
  "Fresh Produce",
  "Pantry Staples",
  "Beverages",
  "Home Care",
  "Snacks & Treats",
]

function Header({
  onNavigate,
  onHomeReset,
  user,
  profileName,
  onLogout,
  searchTerm,
  onSearch,
  cartCount = 0,

  // ✅ category tabs support
  activeCategory = "All Categories",
  onCategoryChange,
}) {
  useEffect(() => {
    document.body.classList.remove("dark-mode")
  }, [])

  const displayName =
    profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email

  const handleCategoryClick = (label) => {
    onCategoryChange?.(label)
    onNavigate?.("/") // stay in-app, no href
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <header className="header fade-in">
      <div className="header-inner">
        <button
          className="logo"
          type="button"
          onClick={() => {
            if (onHomeReset) {
              onHomeReset()
            } else {
              onNavigate?.("/")
              onSearch?.("")
              onCategoryChange?.("All Categories")
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          }}
          aria-label="Refresh home"
        >
          Kaki
        </button>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search for any product or brand"
            value={searchTerm}
            onChange={(e) => onSearch?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch?.(e.currentTarget.value)
            }}
          />
          <button
            type="button"
            className="search-submit"
            aria-label="Search products"
            onClick={() => onSearch?.(searchTerm)}
          >
            <FaSearch className="search-icon" />
          </button>
        </div>

        <div className="header-right">
          <div className="location">
            <MdLocationOn />
            <span>Delivering across Singapore</span>
            <button
              className="location-link"
              type="button"
              onClick={() => onNavigate?.("/locations")}
            >
              Stores & hours
            </button>
          </div>

          <div className="split-buttons">
            {user ? (
              <div className="header-auth-pill">
                <button
                  className="header-btn zoom-on-hover"
                  type="button"
                  onClick={() => onNavigate?.("/profile")}
                  aria-label="View account"
                >
                  {displayName || "Account"}
                </button>
                <button
                  className="header-btn outline-btn zoom-on-hover"
                  type="button"
                  onClick={onLogout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                className="header-btn zoom-on-hover"
                type="button"
                onClick={() => onNavigate?.("/login")}
              >
                Login
              </button>
            )}

            <button
              className="header-btn outline-btn zoom-on-hover header-cart-btn"
              type="button"
              onClick={() => onNavigate?.("/cart")}
              aria-label="View cart"
            >
              <FaShoppingCart />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </div>

      <nav className="category-nav fade-in" style={{ animationDelay: "0.2s" }}>
        {CATEGORIES.map((label) => {
          const isActive = String(activeCategory) === label
          return (
            <button
              key={label}
              type="button"
              className={`category-link ${isActive ? "is-active" : ""}`}
              onClick={() => handleCategoryClick(label)}
            >
              {label}
            </button>
          )
        })}

        <button type="button" className="category-link" onClick={() => onNavigate?.("/recipes")}>
          Recipes
        </button>
      </nav>
    </header>
  )
}

export default Header