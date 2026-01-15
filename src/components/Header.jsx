import { useEffect, useState, useRef } from "react"
import "./Header.css"
import { FaSearch, FaShoppingCart } from "react-icons/fa"
import { MdLocationOn } from "react-icons/md"

function Header({
  onNavigate,
  onHomeReset,
  user,
  profileName,
  onLogout,
  searchTerm,
  onSearch,
  cartCount = 0,
  catalog = [],
}) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchTerm || "")
  const overlayRef = useRef(null)

  useEffect(() => {
    document.body.classList.remove("dark-mode")
  }, [])

  useEffect(() => {
    setLocalSearch(searchTerm || "")
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        setIsOverlayOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const displayName =
    profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email

  const filteredProducts = localSearch.trim()
    ? catalog
      .filter((p) => p.name.toLowerCase().includes(localSearch.toLowerCase()))
      .slice(0, 5)
    : []

  const suggestions = localSearch.trim()
    ? [
      `${localSearch.trim()} organic`,
      `Fresh ${localSearch.trim()}`,
      `Frozen ${localSearch.trim()}`,
    ]
    : []

  const handleCommitSearch = () => {
    onSearch?.(localSearch)
    setIsOverlayOpen(false)
    if (onNavigate) {
      // If we're not on home, go home to see results
      // (assuming search results are shown on home showcase)
    }
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
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          }}
          aria-label="Refresh home"
        >
          Kaki
        </button>

        <div className="search-container" ref={overlayRef}>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search for any product or brand"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value)
                setIsOverlayOpen(true)
              }}
              onFocus={() => {
                if (localSearch.trim()) setIsOverlayOpen(true)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCommitSearch()
                }
              }}
            />
            <button
              type="button"
              className="search-submit"
              aria-label="Search products"
              onClick={handleCommitSearch}
            >
              <FaSearch className="search-icon" />
            </button>
          </div>

          {isOverlayOpen && localSearch.trim() && (
            <div className="search-overlay-window">
              <div className="search-overlay-content">
                <div className="search-overlay-full">
                  <h5>Products</h5>
                  <div className="overlay-product-list">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id || p.slug}
                        className="overlay-product-item"
                        onClick={() => {
                          onNavigate?.(`/product/${p.slug}`)
                          setIsOverlayOpen(false)
                        }}
                      >
                        <img src={p.image} alt={p.name} />
                        <div className="item-details">
                          <span className="item-name">{p.name}</span>
                          <span className="item-price">${p.price}</span>
                        </div>
                      </div>
                    ))}
                    {!filteredProducts.length && <p className="muted">No matches found</p>}
                  </div>
                </div>
              </div>
              <div className="search-overlay-footer">
                <button
                  type="button"
                  className="view-all-results"
                  onClick={handleCommitSearch}
                >
                  View all results
                </button>
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
                onClick={() => onNavigate?.("/login")}
              >
                Login
              </button>
            )}
            <button
              className="header-btn outline-btn zoom-on-hover header-cart-btn"
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
        <button
          type="button"
          className="category-link"
          onClick={() => onNavigate?.("/recipes")}
        >
          Recipes
        </button>
      </nav>
    </header>
  )
}

export default Header
