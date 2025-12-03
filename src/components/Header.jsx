import { useEffect } from "react"
import "./Header.css"
import { FaSearch, FaShoppingCart } from "react-icons/fa"
import { MdLocationOn } from "react-icons/md"

function Header({ onNavigate }) {
  useEffect(() => {
    document.body.classList.remove("dark-mode")
  }, [])

  return (
    <header className="header fade-in">
      <div className="header-inner">
        <button
          className="logo"
          type="button"
          onClick={() => onNavigate?.("/")}
          aria-label="Go to homepage"
        >
          Kaki
        </button>

        <div className="search-box">
          <input type="text" placeholder="Search for any product or brand" />
          <FaSearch className="search-icon" />
        </div>

        <div className="header-right">
          <div className="location">
            <MdLocationOn />
            <span>Delivering across Singapore</span>
          </div>

          <div className="split-buttons">
            <button
              className="header-btn zoom-on-hover"
              onClick={() => onNavigate?.("/login")}
            >
              Login
            </button>
            <button
              className="header-btn outline-btn zoom-on-hover header-cart-btn"
              onClick={() => onNavigate?.("/cart")}
              aria-label="View cart"
            >
              <FaShoppingCart />
            </button>
          </div>
        </div>
      </div>

      <nav className="category-nav fade-in" style={{ animationDelay: "0.2s" }}>
        <a href="#">All Categories</a>
        <a href="#">Fresh Produce</a>
        <a href="#">Pantry Staples</a>
        <a href="#">Beverages</a>
        <a href="#">Home Care</a>
        <a href="#">Snacks & Treats</a>
      </nav>
    </header>
  )
}

export default Header
