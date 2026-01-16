// component: ProductPage
import { useEffect, useMemo, useState } from "react"
import "./Pages.css"
import { supabase } from "../lib/supabaseClient" // ✅ use your exported supabase instance

const comparisonSites = [
  { name: "FairPrice", baseUrl: "https://www.fairprice.com.sg/search?query=" },
  { name: "RedMart", baseUrl: "https://www.redmart.com/search/?q=" },
]

function ProductPage({ slug, products, onAddToCart, onNavigate }) {
  const product = useMemo(() => products?.find((p) => p.slug === slug), [products, slug])

  const stock = Number(product?.onlineStock ?? 0)
  const isOutOfStock = stock <= 0

  const [quantity, setQuantity] = useState(1)

  // ✅ save for later state
  const [savingLater, setSavingLater] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    if (!product) return
    setQuantity((prev) => Math.min(Math.max(1, prev), Math.max(1, stock)))
  }, [product, stock])

  // ✅ check if already saved (on load)
  useEffect(() => {
    const run = async () => {
      setSaveError("")
      setIsSaved(false)
      if (!product?.id) return

      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user
      if (!user) return

      const { data, error } = await supabase
        .from("saved_items")
        .select("id")
        .eq("profile_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle()

      if (!error && data) setIsSaved(true)
    }
    run()
  }, [product?.id])

  if (!product) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Product</p>
        <h2>Not found</h2>
        <p>We could not find that product. Please pick another item from the catalog.</p>
      </section>
    )
  }

  const comparisonTerm = encodeURIComponent((product.name || product.slug || "").trim())

  const handleAdd = () => {
    if (isOutOfStock) return
    const safeQty = Math.min(quantity, stock)
    if (safeQty <= 0) return
    onAddToCart?.(product, safeQty)
  }

  // ✅ Save / Unsave
  const handleSaveForLater = async () => {
    setSaveError("")
    if (!product?.id) {
      setSaveError("Product ID missing. Please refresh and try again.")
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (!user) {
      onNavigate?.("/login")
      return
    }

    setSavingLater(true)
    try {
      if (!isSaved) {
        const { error } = await supabase.from("saved_items").insert({
          profile_id: user.id,
          product_id: product.id,
          product_slug: product.slug,
        })
        if (error) throw error
        setIsSaved(true)
      } else {
        const { error } = await supabase
          .from("saved_items")
          .delete()
          .eq("profile_id", user.id)
          .eq("product_id", product.id)
        if (error) throw error
        setIsSaved(false)
      }
    } catch (e) {
      setSaveError(e?.message || "Unable to save item.")
    } finally {
      setSavingLater(false)
    }
  }

  return (
    <section className="page-panel product-page">
      <div className="product-gallery">
        <div className="product-main">
          <img src={product.image} alt={product.name} className="product-image" />
        </div>
        <div className="product-thumbs">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="thumb">
              <img src={product.image} alt={`${product.name} ${idx + 1}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="product-info">
        <p className="eyebrow">Kaki grocery</p>
        <h2>{product.name}</h2>
        <p className="rating-row">⭐ 4.5 Rating (15 reviews)</p>
        <p className="product-price">${Number(product.price).toFixed(2)}</p>

        <div className="stock-row">
          {isOutOfStock ? (
            <span className="stock-badge out">Out of stock</span>
          ) : (
            <span className="stock-badge in">In stock · {stock} left</span>
          )}
        </div>

        <div className="product-cta-row">
          <div className="qty-group-lg">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={isOutOfStock}>
              -
            </button>

            {/* ✅ manual input */}
            <input
              className="qty-input"
              type="number"
              min={isOutOfStock ? 0 : 1}
              max={stock}
              value={isOutOfStock ? 0 : quantity}
              onChange={(e) => {
                const v = Number(e.target.value || 0)
                if (isOutOfStock) return
                setQuantity(Math.min(Math.max(1, v), stock))
              }}
              disabled={isOutOfStock}
            />

            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
              disabled={isOutOfStock || quantity >= stock}
            >
              +
            </button>
          </div>

          <button className="pill-btn primary" type="button" onClick={handleAdd} disabled={isOutOfStock}>
            {isOutOfStock ? "Out of stock" : "Add to cart"}
          </button>

          <button
            className="pill-btn outline"
            type="button"
            onClick={handleSaveForLater}
            disabled={savingLater}
            title={isSaved ? "Remove from saved" : "Save this item"}
          >
            {savingLater ? "Saving..." : isSaved ? "Saved ✅" : "Save for later"}
          </button>
        </div>

        {saveError && <p className="auth-status error">{saveError}</p>}

        <div className="product-details">
          <p>
            {product.desc}
            {isOutOfStock ? " Currently out of stock." : " In stock and ready to ship."}
          </p>
        </div>

        <div className="compare-row">
          {comparisonSites.map((site) => (
            <a key={site.name} className="compare-link" href={`${site.baseUrl}${comparisonTerm}`} target="_blank" rel="noopener noreferrer">
              Compare on {site.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProductPage