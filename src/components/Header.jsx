// src/components/Header.jsx
import { useEffect, useState, useRef } from "react"
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
  activeCategory = "All Categories",
  onCategoryChange,
  products = [], // Add products prop for search overlay
}) {
  const [showSearchOverlay, setShowSearchOverlay] = useState(false)
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const searchRef = useRef(null)

  useEffect(() => {
    document.body.classList.remove("dark-mode")
  }, [])

  // Close overlay when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchOverlay(false)
      }
    }

    if (showSearchOverlay) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSearchOverlay])

  const displayName =
    profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email

  const handleCategoryClick = (label) => {
    onCategoryChange?.(label)
    onNavigate?.("/")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Filter products based on search term with relevance ranking
  const searchResults = localSearchTerm.trim().length >= 1
    ? products
      .map((product) => {
        const term = localSearchTerm.toLowerCase()
        const name = (product.name || "").toLowerCase()
        const desc = (product.desc || "").toLowerCase()
        const category = (product.category || "").toLowerCase()
        const brand = (product.brand || "").toLowerCase()

        // Calculate relevance score
        let score = 0

        // Exact match (highest priority)
        if (name === term) score = 1000
        // Starts with search term (high priority)
        else if (name.startsWith(term)) score = 100
        // Contains in name (medium priority)
        else if (name.includes(term)) score = 50
        // Starts with in description
        else if (desc.startsWith(term)) score = 30
        // Contains in description
        else if (desc.includes(term)) score = 20
        // Contains in category or brand
        else if (category.includes(term) || brand.includes(term)) score = 10

        return { product, score }
      })
      .filter(({ score }) => score > 0) // Only keep matches
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .map(({ product }) => product) // Extract products
      .filter((product, index, self) =>
        // Remove duplicates by slug
        index === self.findIndex((p) => p.slug === product.slug)
      )
      .slice(0, 5) // Limit to 5 results
    : []

  const handleSearchChange = (value) => {
    setLocalSearchTerm(value)
    setShowSearchOverlay(value.trim().length >= 1)
  }

  const handleSearchSubmit = () => {
    if (localSearchTerm.trim()) {
      onSearch?.(localSearchTerm)
      setShowSearchOverlay(false)
      onNavigate?.("/")
    }
  }

  const handleProductClick = (slug) => {
    setShowSearchOverlay(false)
    setLocalSearchTerm("")
    onNavigate?.(`/product/${slug}`)
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

        <div className="search-container" ref={searchRef}>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search for any product or brand"
              value={localSearchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit()
              }}
              onFocus={() => {
                if (localSearchTerm.trim()) setShowSearchOverlay(true)
              }}
            />
            <button
              type="button"
              className="search-submit"
              aria-label="Search products"
              onClick={handleSearchSubmit}
            >
              <FaSearch className="search-icon" />
            </button>
          </div>

          {/* Search Overlay */}
          {showSearchOverlay && (
            <div className="search-overlay-window">
              <div className="search-overlay-content">
                {/* Products Section */}
                {searchResults.length > 0 && (
                  <div className="overlay-section">
                    <h5>Products</h5>
                    <div className="overlay-product-list">
                      {searchResults.map((product) => (
                        <div
                          key={product.slug}
                          className="overlay-product-item"
                          onClick={() => handleProductClick(product.slug)}
                        >
                          <img src={product.image} alt={product.name} />
                          <div className="overlay-product-info">
                            <span className="item-name">{product.name}</span>
                            <span className="item-price">${product.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {localSearchTerm.trim() && searchResults.length === 0 && (
                  <div className="overlay-section">
                    <p className="no-results">No products found for "{localSearchTerm}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-right">
          <div className="location">
            <MdLocationOn />
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