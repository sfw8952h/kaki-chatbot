// component: SavedItemsPage
import { useEffect, useMemo, useState } from "react"
import "./Pages.css"
import { supabase } from "../lib/supabaseClient"

function SavedItemsPage({ user, onNavigate, onAddToCart }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState(null)

  const loadSaved = async () => {
    if (!user) return
    setError("")
    setLoading(true)

    try {
      // ✅ join saved_items -> products using FK (product_id)
      const { data, error } = await supabase
        .from("saved_items")
        .select("id, created_at, product_id, product_slug, products(id, name, price, stock, image, description, category)")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setError(e?.message || "Unable to load saved items.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      // redirect if not logged in
      onNavigate?.("/login")
      return
    }
    loadSaved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const savedProducts = useMemo(() => {
    return (rows || [])
      .map((r) => ({
        saved_id: r.id,
        saved_at: r.created_at,
        product: r.products || null,
      }))
      .filter((x) => x.product)
  }, [rows])

  const handleRemove = async (savedId) => {
    if (!savedId) return
    setBusyId(savedId)
    setError("")
    try {
      const { error } = await supabase.from("saved_items").delete().eq("id", savedId)
      if (error) throw error
      setRows((prev) => prev.filter((r) => r.id !== savedId))
    } catch (e) {
      setError(e?.message || "Unable to remove saved item.")
    } finally {
      setBusyId(null)
    }
  }

  const handleMoveToCart = async (savedId, product) => {
    if (!savedId || !product) return
    const stock = Number(product.stock ?? 0)
    if (stock <= 0) return

    setBusyId(savedId)
    setError("")
    try {
      // ✅ add to cart (1 qty by default)
      onAddToCart?.(
        {
          id: product.id,
          slug: product.id, // fallback slug if you don’t have slug in DB row
          name: product.name,
          price: Number(product.price ?? 0),
          image: product.image,
          desc: product.description || "",
          category: product.category || "Grocery",
          onlineStock: stock,
        },
        1,
      )

      // ✅ remove from saved after moving to cart
      const { error } = await supabase.from("saved_items").delete().eq("id", savedId)
      if (error) throw error
      setRows((prev) => prev.filter((r) => r.id !== savedId))
    } catch (e) {
      setError(e?.message || "Unable to move to cart.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Wishlist</p>
      <h2>Saved for later</h2>
      <p className="muted">Items you saved will stay here until you remove them.</p>

      {error && <p className="auth-status error">{error}</p>}

      {loading ? (
        <p className="muted">Loading saved items…</p>
      ) : savedProducts.length === 0 ? (
        <div className="empty-cart">
          <p>You haven’t saved anything yet.</p>
          <button className="primary-btn" type="button" onClick={() => onNavigate?.("/")}>
            Browse products
          </button>
        </div>
      ) : (
        <div className="saved-grid">
          {savedProducts.map(({ saved_id, product }) => {
            const stock = Number(product.stock ?? 0)
            const out = stock <= 0

            return (
              <article key={saved_id} className="saved-card">
                <div className="saved-thumb-wrap">
                  <img
                    className="saved-thumb"
                    src={product.image || "https://via.placeholder.com/400x300.png?text=Product"}
                    alt={product.name}
                  />
                  <span className={`saved-badge ${out ? "out" : "in"}`}>
                    {out ? "Out of stock" : `In stock · ${stock}`}
                  </span>
                </div>

                <div className="saved-body">
                  <strong className="saved-title">{product.name}</strong>
                  <p className="saved-price">${Number(product.price ?? 0).toFixed(2)}</p>

                  <div className="saved-actions">
                    <button
                      className="primary-btn"
                      type="button"
                      disabled={out || busyId === saved_id}
                      onClick={() => handleMoveToCart(saved_id, product)}
                    >
                      {out ? "Out of stock" : busyId === saved_id ? "Working..." : "Move to cart"}
                    </button>

                    <button
                      className="ghost-btn danger"
                      type="button"
                      disabled={busyId === saved_id}
                      onClick={() => handleRemove(saved_id)}
                    >
                      {busyId === saved_id ? "Removing..." : "Remove"}
                    </button>
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

export default SavedItemsPage