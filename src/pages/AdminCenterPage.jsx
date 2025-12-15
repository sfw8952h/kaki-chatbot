// component: admincenterpage
// admin ui: metrics, products crud, proposals, store hours, complaints

import { useEffect, useMemo, useState } from "react"
import { FaBoxOpen, FaCog, FaClock, FaHome, FaList, FaSearch, FaSignOutAlt } from "react-icons/fa"
import { getSupabaseClient } from "../lib/supabaseClient"
import "./Pages.css"

// local fallback products
const initialProducts = [
  {
    id: "p1",
    name: "Heirloom tomatoes",
    price: 5.99,
    description: "Sweet, vine-ripened tomatoes perfect for salads",
    category: "Produce",
    createdAt: "2023-07-25",
    image: "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=200&h=200&fit=crop",
    stock: 32,
    outOfStock: false,
  },
  {
    id: "p2",
    name: "Artisan sourdough",
    price: 7.5,
    description: "Crusty loaf from our in-house bakery",
    category: "Bakery",
    createdAt: "2023-07-24",
    image: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200&h=200&fit=crop",
    stock: 4,
    outOfStock: false,
  },
  {
    id: "p3",
    name: "Almond milk",
    price: 3.99,
    description: "Unsweetened dairy-free almond milk",
    category: "Beverages",
    createdAt: "2023-07-23",
    image: "https://images.unsplash.com/photo-1582719478248-54e9f2af1c89?w=200&h=200&fit=crop",
    stock: 0,
    outOfStock: true,
  },
]

// sidebar tabs
const navLinks = [
  { label: "Dashboard", icon: <FaHome />, key: "dashboard" },
  { label: "Products", icon: <FaBoxOpen />, key: "products" },
  { label: "Inventory", icon: <FaList />, key: "inventory" },
  { label: "Stores", icon: <FaClock />, key: "stores" },
  { label: "Support", icon: <FaCog />, key: "support" },
]

// db row -> ui product
const mapDbProduct = (p) => ({
  id: p.id,
  name: p.name,
  price: Number(p.price) || 0,
  description: p.description,
  category: p.category,
  image: p.image,
  stock: p.stock ?? 0,
  outOfStock: p.status !== "approved" || (p.stock ?? 0) === 0,
  createdAt: p.created_at,
  slug: p.slug,
})

// store hours keys
const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

function AdminCenterPage({
  proposals = [],
  onProposalDecision,
  localFeedback = [],
  onProductUpsert,
  onProductDelete,
  storeLocations = [],
  onStoreUpsert,
}) {
  const [products, setProducts] = useState(initialProducts)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  // product form
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    image: "",
    stock: "",
    outOfStock: false,
  })

  const [flash, setFlash] = useState("")
  const [query, setQuery] = useState("")
  const [feedback, setFeedback] = useState([])
  const [feedbackStatus, setFeedbackStatus] = useState("")
  const [productStatus, setProductStatus] = useState("")
  const [storeDrafts, setStoreDrafts] = useState(storeLocations || [])
  const [storeMessages, setStoreMessages] = useState({})
  const [storeSaving, setStoreSaving] = useState({})
  const [storeQuery, setStoreQuery] = useState("")
  const [expandedStoreId, setExpandedStoreId] = useState(null)

  // low stock list
  const lowStock = useMemo(() => products.filter((p) => p.stock <= 5 && !p.outOfStock), [products])

  // dashboard metrics
  const metrics = useMemo(() => {
    const total = products.length
    const outCount = products.filter((p) => p.outOfStock || p.stock === 0).length
    const lowCount = lowStock.length
    const avgPrice =
      total > 0
        ? (
            products.reduce((sum, p) => sum + (Number.isFinite(p.price) ? p.price : 0), 0) / total
          ).toFixed(2)
        : "0.00"
    const stockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0)
    return { total, outCount, lowCount, avgPrice, stockUnits }
  }, [products, lowStock])

  // clear form + exit edit
  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      description: "",
      category: "",
      brand: "",
      store: "",
      image: "",
      stock: "",
      outOfStock: false,
    })
    setEditingId(null)
  }

  // add/update product (db + ui)
  const handleSubmit = async (event) => {
    event.preventDefault()
    setFlash("")
    setProductStatus("")

    const cleanPrice = parseFloat(formData.price)
    const cleanStock = parseInt(formData.stock || "0", 10)

    if (!formData.name.trim() || Number.isNaN(cleanPrice)) {
      setFlash("Name and price are required.")
      return
    }

    // build slug
    const slug = formData.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")

    // get client
    let supabase
    try {
      supabase = getSupabaseClient()
    } catch (clientErr) {
      setProductStatus("Supabase is not configured. Check env keys.")
      return
    }

    try {
      const payload = {
        name: formData.name.trim(),
        price: cleanPrice,
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        image: formData.image.trim() || null,
        stock: cleanStock,
        status: "approved",
        slug,
      }

      if (editingId) {
        // update
        const { data, error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single()
        if (error) throw error

        const updated = mapDbProduct(data)
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)))
        setFlash("Product updated.")
        onProductUpsert?.(updated)
      } else {
        // insert
        const { data, error } = await supabase.from("products").insert(payload).select().single()
        if (error) throw error

        const created = mapDbProduct(data)
        setProducts((prev) => [created, ...prev])
        setFlash("Product added.")
        onProductUpsert?.(created)
      }

      resetForm()
      setActiveTab("products")
    } catch (err) {
      console.error("Error saving product:", err)
      setFlash(err.message || "Could not save product.")
    }
  }

  // load product into form
  const handleEdit = (product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      image: product.image,
      stock: product.stock,
      outOfStock: product.outOfStock,
      createdAt: product.createdAt,
    })
    setFlash("")
    setActiveTab("add")
  }

  // delete locally
  const handleDelete = async (id) => {
    if (!id) return
    setFlash("")
    setProductStatus("")

    let supabase
    try {
      supabase = getSupabaseClient()
    } catch (clientErr) {
      setFlash("Supabase is not configured. Unable to delete product.")
      return
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error

      setProducts((prev) => prev.filter((p) => p.id !== id))
      onProductDelete?.(id)
      if (editingId === id) resetForm()
      setFlash("Product deleted.")
    } catch (err) {
      console.error("Unable to delete product", err)
      setFlash(err.message || "Could not delete product.")
    }
  }

  // adjust stock locally
  const adjustStock = (id, delta) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const nextStock = Math.max(0, (p.stock || 0) + delta)
        return { ...p, stock: nextStock, outOfStock: nextStock === 0 || p.outOfStock }
      })
    )
  }

  // toggle oos locally
  const toggleOutOfStock = (id, forceOut) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const outOfStock = forceOut ?? !p.outOfStock
        return { ...p, outOfStock, stock: outOfStock ? 0 : p.stock }
      })
    )
  }

  // filter products by query
  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const term = query.toLowerCase()
    return products.filter((p) =>
      [p.name, p.category].some((field) => (field || "").toLowerCase().includes(term))
    )
  }, [products, query])

  // filter stores by query
  const filteredStores = useMemo(() => {
    if (!storeQuery.trim()) return storeDrafts
    const term = storeQuery.toLowerCase()
    return storeDrafts.filter((s) =>
      [s.name, s.address, s.email, s.phone].some((field) => (field || "").toLowerCase().includes(term))
    )
  }, [storeDrafts, storeQuery])

  // today hours label
  const summarizeToday = (store) => {
    const todayKey = dayKeys[new Date().getDay()]
    const entry = (store.baseHours || {})[todayKey] || {}
    if (entry.closed || !entry.open || !entry.close) return "Closed today"
    return `${entry.open} – ${entry.close}`
  }

  // open days count
  const countOpenDays = (store) =>
    dayKeys.filter((d) => {
      const entry = (store.baseHours || {})[d] || {}
      return entry.open && entry.close && !entry.closed
    }).length

  // special entries count
  const specialCount = (store) => (store.specialHours || []).length

  // approve proposal -> add product locally + callbacks
  const approveProposal = async (proposal) => {
    setProducts((prev) => [
      {
        id: `p-${Date.now()}`,
        name: proposal.name,
        price: proposal.price,
        description: proposal.description || "",
        category: proposal.category,
        image: proposal.image,
        stock: proposal.stock,
        outOfStock: proposal.stock === 0,
        createdAt: proposal.createdAt || new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ])
    onProposalDecision?.(proposal.id, "approved")
    onProductUpsert?.({
      name: proposal.name,
      price: proposal.price,
      description: proposal.description || "",
      category: proposal.category,
      image: proposal.image,
      stock: proposal.stock,
      outOfStock: proposal.stock === 0,
      createdAt: proposal.createdAt || new Date().toISOString().slice(0, 10),
    })
  }

  // reject proposal via callback
  const rejectProposal = (proposal) => {
    onProposalDecision?.(proposal.id, "rejected")
  }

  // refresh drafts when props change
  useEffect(() => {
    setStoreDrafts(storeLocations || [])
  }, [storeLocations])

  // edit store field in drafts
  const handleStoreFieldChange = (id, field, value) => {
    setStoreDrafts((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  // edit base hours in drafts
  const handleBaseHourChange = (id, day, field, value) => {
    setStoreDrafts((prev) =>
      prev.map((store) => {
        if (store.id !== id) return store
        const baseHours = { ...(store.baseHours || {}) }
        const dayEntry = { ...(baseHours[day] || {}) }
        if (field === "closed") {
          const closed = !!value
          baseHours[day] = closed ? { closed: true } : { open: "09:00", close: "18:00" }
        } else {
          dayEntry[field] = value
          dayEntry.closed = false
          baseHours[day] = dayEntry
        }
        return { ...store, baseHours }
      })
    )
  }

  // add special hour entry
  const addSpecialHour = (id) => {
    setStoreDrafts((prev) =>
      prev.map((store) => {
        if (store.id !== id) return store
        const specialHours = [...(store.specialHours || [])]
        specialHours.push({ date: "", open: "09:00", close: "18:00", label: "", closed: false })
        return { ...store, specialHours }
      })
    )
  }

  // edit special entry
  const handleSpecialChange = (id, index, field, value) => {
    setStoreDrafts((prev) =>
      prev.map((store) => {
        if (store.id !== id) return store
        const specialHours = [...(store.specialHours || [])]
        const entry = { ...(specialHours[index] || {}) }
        if (field === "closed") {
          entry.closed = !!value
          if (entry.closed) {
            entry.open = null
            entry.close = null
          }
        } else {
          entry[field] = value
        }
        specialHours[index] = entry
        return { ...store, specialHours }
      })
    )
  }

  // remove special entry
  const removeSpecial = (id, index) => {
    setStoreDrafts((prev) =>
      prev.map((store) => {
        if (store.id !== id) return store
        const specialHours = [...(store.specialHours || [])]
        specialHours.splice(index, 1)
        return { ...store, specialHours }
      })
    )
  }

  // save store via callback
  const saveStore = async (store) => {
    if (!onStoreUpsert) {
      setStoreMessages((prev) => ({ ...prev, [store.id]: "Connect Supabase to save changes." }))
      return
    }
    setStoreSaving((prev) => ({ ...prev, [store.id]: true }))
    setStoreMessages((prev) => ({ ...prev, [store.id]: "" }))
    try {
      await onStoreUpsert(store)
      setStoreMessages((prev) => ({ ...prev, [store.id]: "Saved to database." }))
    } catch (err) {
      console.error("Unable to save store hours", err)
      setStoreMessages((prev) => ({ ...prev, [store.id]: err.message || "Unable to save store hours." }))
    } finally {
      setStoreSaving((prev) => ({ ...prev, [store.id]: false }))
    }
  }

  // load complaints (note: runs only if tab === "feedback")
  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("complaints")
          .select("id, subject, details, created_at")
          .order("created_at", { ascending: false })
        if (error) throw error
        setFeedback(data || [])
        setFeedbackStatus("")
      } catch (err) {
        console.warn("Unable to load feedback", err)
        setFeedbackStatus("Unable to load feedback.")
      }
    }
    if (activeTab === "feedback") loadFeedback()
  }, [activeTab])

  // load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        let supabase
        try {
          supabase = getSupabaseClient()
        } catch (clientErr) {
          setProductStatus("Supabase is not configured. Check env keys.")
          return
        }
        const { data, error } = await supabase
          .from("products")
          .select("id, name, slug, description, category, image, price, stock, status, created_at")
          .order("created_at", { ascending: false })
        if (error) throw error
        setProducts((data || []).map(mapDbProduct))
        setProductStatus("")
      } catch (err) {
        console.warn("Unable to load products", err)
        setProductStatus(err.message || "Unable to load products from database; showing local data.")
      }
    }
    loadProducts()
  }, [])

  // merge db + local feedback
  const combinedFeedback = useMemo(() => {
    const existingIds = new Set((feedback || []).map((f) => f.id))
    const extras = (localFeedback || []).filter((f) => !f.id || !existingIds.has(f.id))
    return [...(feedback || []), ...extras]
  }, [feedback, localFeedback])

  // top heading per tab
  const heading =
    activeTab === "products"
      ? { eyebrow: "Products", title: "Products", detail: "Manage listings and visibility." }
      : activeTab === "inventory"
        ? { eyebrow: "Inventory", title: "Inventory", detail: "Track stock and supplier approvals." }
        : activeTab === "stores"
          ? { eyebrow: "Store network", title: "Store hours", detail: "Edit base hours and holiday overrides for each location." }
          : activeTab === "support"
            ? { eyebrow: "Support", title: "Feedback", detail: "Review customer complaints." }
            : { eyebrow: "Dashboard", title: "Overview", detail: "Metrics and health of the store." }

  return (
    <section className="admin-shell">
      <aside className="admin-nav">
        <div className="nav-brand">
          <FaBoxOpen />
          <span>Admin Center</span>
        </div>

        <nav className="nav-links">
          {navLinks.map((link) => (
            <button
              key={link.label}
              className={`nav-link ${link.key && activeTab === link.key ? "active" : ""}`}
              type="button"
              onClick={() => link.key && setActiveTab(link.key)}
            >
              {link.icon}
              <span>{link.label}</span>
            </button>
          ))}
        </nav>

        <button className="nav-link logout" type="button">
          <FaSignOutAlt />
          <span>Log out</span>
        </button>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">{heading.eyebrow}</p>
            <h2>{heading.title}</h2>
            <p className="muted">{heading.detail}</p>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <div className="metric-grid">
            <article className="metric-card">
              <p>Total SKUs</p>
              <strong>{metrics.total}</strong>
              <span className="metric-pill success">Active</span>
            </article>
            <article className="metric-card">
              <p>Units on hand</p>
              <strong>{metrics.stockUnits}</strong>
              <span className="metric-pill neutral">Current</span>
            </article>
            <article className="metric-card">
              <p>Out of stock</p>
              <strong>{metrics.outCount}</strong>
              <span className="metric-pill warn">Needs restock</span>
            </article>
            <article className="metric-card">
              <p>Low stock</p>
              <strong>{metrics.lowCount}</strong>
              <span className="metric-pill warn">Monitor</span>
            </article>
            <article className="metric-card">
              <p>Avg price</p>
              <strong>${metrics.avgPrice}</strong>
              <span className="metric-pill neutral">Blended</span>
            </article>
          </div>
        )}

        {activeTab === "products" && (
          <article className="dash-card product-board">
            <div className="board-top">
              <div>
                <p className="dash-label">Products</p>
                <strong>Inventory overview</strong>
              </div>
              <div className="board-actions">
                <div className="board-search">
                  <FaSearch />
                  <input
                    type="text"
                    placeholder="Search products"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button className="primary-btn" type="button" onClick={() => setActiveTab("add")}>
                  Add New
                </button>
              </div>
            </div>

            {productStatus && <span className="status warn">{productStatus}</span>}

            <div className="product-table">
              <div className="product-header">
                <span>#</span>
                <span>Image</span>
                <span>Title</span>
                <span>Category</span>
                <span>Price</span>
                <span>Stock</span>
                <span>Status</span>
                <span>Created</span>
                <span>Actions</span>
              </div>

              <div className="product-rows">
                {filtered.map((product, index) => (
                  <div key={product.id} className="product-row">
                    <span>{index + 1}</span>
                    <span>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="thumb thumb-round" />
                      ) : (
                        "—"
                      )}
                    </span>
                    <div className="row-title">
                      <strong>{product.name}</strong>
                    </div>
                    <span className="pill pill-soft">{product.category || "Uncategorized"}</span>
                    <span className="price-chip">${product.price.toFixed(2)}</span>
                    <span className="pill pill-neutral">{product.stock} units</span>
                    <span className={product.outOfStock || product.stock === 0 ? "status warn" : "status success"}>
                      {product.outOfStock || product.stock === 0 ? "Inactive" : "Active"}
                    </span>
                    <span className="muted">{product.createdAt ? String(product.createdAt).slice(0, 10) : "—"}</span>
                    <div className="action-badges">
                      <button className="badge-btn primary" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button className="badge-btn danger" onClick={() => handleDelete(product.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="table-foot">
                <span>
                  Showing {filtered.length} of {products.length} entries
                </span>
              </div>
            </div>
          </article>
        )}

        {activeTab === "add" && (
          <article className="dash-card form-card">
            <div className="dash-card-head">
              <div>
                <p className="dash-label">{editingId ? "Edit product" : "Add product"}</p>
                <strong>{editingId ? "Update details" : "Create a listing"}</strong>
              </div>
              <button className="ghost-btn" type="button" onClick={() => setActiveTab("products")}>
                Back to products
              </button>
            </div>

            <form className="signup-form" onSubmit={handleSubmit}>
              <div className="dash-duo">
                <label>
                  Name
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Organic berries"
                  />
                </label>
                <label>
                  Price
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="4.99"
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short product description"
                />
              </label>

              <div className="dash-duo">
                <label>
                  Category
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="Produce"
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </label>
              </div>

              <label>
                Image URL
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </label>

              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={formData.outOfStock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, outOfStock: e.target.checked }))}
                />
                <span>Mark as out of stock</span>
              </label>

              <div className="auth-helper-row">
                <button className="primary-btn" type="submit">
                  {editingId ? "Save changes" : "Add product"}
                </button>
                {editingId && (
                  <button className="ghost-btn" type="button" onClick={resetForm}>
                    Cancel edit
                  </button>
                )}
              </div>

              {flash && <p className="status ok">{flash}</p>}
            </form>
          </article>
        )}

        {activeTab === "inventory" && (
          <article className="dash-card">
            <div className="dash-card-head">
              <div>
                <p className="dash-label">Supplier proposals</p>
                <strong>Awaiting admin approval</strong>
              </div>
            </div>

            {proposals?.length === 0 && <p>No proposals submitted yet.</p>}

            <div className="dash-table">
              <div className="dash-table-head">
                <span>Name</span>
                <span>Category</span>
                <span>Price</span>
                <span>Stock</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              <div className="dash-table-body">
                {proposals?.map((p) => (
                  <div key={p.id} className="dash-table-row">
                    <span>{p.name}</span>
                    <span>{p.category || "Uncategorized"}</span>
                    <span className="price-chip">{p.price?.toFixed ? `$${p.price.toFixed(2)}` : p.price}</span>
                    <span>{p.stock ?? 0}</span>
                    <span className={p.status === "approved" ? "status success" : p.status === "rejected" ? "status warn" : "status"}>
                      {p.status}
                    </span>
                    <div className="dash-actions">
                      <button className="ghost-btn" disabled={p.status === "approved"} onClick={() => approveProposal(p)}>
                        Approve
                      </button>
                      <button className="ghost-btn danger" disabled={p.status === "rejected"} onClick={() => rejectProposal(p)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        )}

        {activeTab === "stores" && (
          <article className="dash-card product-board">
            <div className="board-top">
              <div>
                <p className="dash-label">Stores</p>
                <strong>Opening hours overview</strong>
                <p className="muted small-note">Use “Edit hours” to manage base hours and holiday overrides. Saving syncs to Supabase.</p>
              </div>
              <div className="board-actions">
                <div className="board-search">
                  <FaSearch />
                  <input type="text" placeholder="Search stores" value={storeQuery} onChange={(e) => setStoreQuery(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="store-table">
              <div className="store-header">
                <span>#</span>
                <span>Store</span>
                <span>Today</span>
                <span>Specials</span>
                <span>Contact</span>
                <span>Actions</span>
              </div>

              <div className="store-rows">
                {filteredStores.map((store, index) => (
                  <div key={store.id} className="store-row-wrap">
                    <div className="store-row">
                      <span>{index + 1}</span>
                      <div className="row-title">
                        <strong>{store.name || "Untitled store"}</strong>
                        <p className="muted">{store.address || "No address set"}</p>
                        <div className="store-chip-row">
                          <span className="pill pill-soft">{countOpenDays(store)} open days</span>
                          <span className="pill pill-neutral">
                            {specialCount(store)} special{specialCount(store) === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>

                      <span className="pill pill-soft">{summarizeToday(store)}</span>
                      <span className="muted">{specialCount(store) > 0 ? "Configured" : "None"}</span>

                      <span className="contact-stack">
                        <span>{store.phone || "No phone"}</span>
                        <span className="muted">{store.email || "No email"}</span>
                      </span>

                      <div className="action-badges">
                        <button
                          className="badge-btn primary"
                          onClick={() => setExpandedStoreId((prev) => (prev === store.id ? null : store.id))}
                        >
                          {expandedStoreId === store.id ? "Close" : "Edit hours"}
                        </button>

                        <button className="badge-btn" onClick={() => saveStore(store)} disabled={storeSaving[store.id]}>
                          {storeSaving[store.id] ? "Saving..." : "Save"}
                        </button>

                        {storeMessages[store.id] && <span className="status ok">{storeMessages[store.id]}</span>}
                      </div>
                    </div>

                    {expandedStoreId === store.id && (
                      <div className="store-row-expanded">
                        <div className="store-layout">
                          <div className="store-fields card-slab">
                            <p className="dash-label">Details</p>
                            <label>
                              Name
                              <input type="text" value={store.name || ""} onChange={(e) => handleStoreFieldChange(store.id, "name", e.target.value)} />
                            </label>
                            <label>
                              Address
                              <input type="text" value={store.address || ""} onChange={(e) => handleStoreFieldChange(store.id, "address", e.target.value)} />
                            </label>
                            <div className="dash-duo">
                              <label>
                                Phone
                                <input type="text" value={store.phone || ""} onChange={(e) => handleStoreFieldChange(store.id, "phone", e.target.value)} />
                              </label>
                              <label>
                                Email
                                <input type="email" value={store.email || ""} onChange={(e) => handleStoreFieldChange(store.id, "email", e.target.value)} />
                              </label>
                            </div>
                          </div>

                          <div className="store-hours-panel card-slab">
                            <div className="panel-head">
                              <p className="dash-label">Base hours</p>
                              <span className="muted small-note">Toggle “Closed” to skip a day.</span>
                            </div>

                            <div className="hours-grid">
                              {dayKeys.map((day) => {
                                const entry = (store.baseHours || {})[day] || {}
                                const closed = !!entry.closed
                                return (
                                  <div key={day} className="day-card">
                                    <div className="day-head">
                                      <span className="dash-label">{day.toUpperCase()}</span>
                                      <label className="remember-me">
                                        <input
                                          type="checkbox"
                                          checked={closed}
                                          onChange={(e) => handleBaseHourChange(store.id, day, "closed", e.target.checked)}
                                        />
                                        <span>Closed</span>
                                      </label>
                                    </div>
                                    <div className="dash-duo">
                                      <label>
                                        Open
                                        <input
                                          type="time"
                                          value={entry.open || ""}
                                          disabled={closed}
                                          onChange={(e) => handleBaseHourChange(store.id, day, "open", e.target.value)}
                                        />
                                      </label>
                                      <label>
                                        Close
                                        <input
                                          type="time"
                                          value={entry.close || ""}
                                          disabled={closed}
                                          onChange={(e) => handleBaseHourChange(store.id, day, "close", e.target.value)}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            <div className="special-section">
                              <div className="special-head">
                                <div>
                                  <p className="dash-label">Holiday / special hours</p>
                                  <span className="muted small-note">Leave open/close blank if “Closed” is ticked.</span>
                                </div>
                                <button className="ghost-btn" type="button" onClick={() => addSpecialHour(store.id)}>
                                  Add date
                                </button>
                              </div>

                              {(store.specialHours || []).length === 0 && <p className="muted">No special hours set.</p>}

                              <div className="special-grid">
                                {(store.specialHours || []).map((entry, index) => (
                                  <div key={`${store.id}-special-${index}`} className="special-row">
                                    <div className="dash-duo">
                                      <label>
                                        Date
                                        <input type="date" value={entry.date || ""} onChange={(e) => handleSpecialChange(store.id, index, "date", e.target.value)} />
                                      </label>
                                      <label>
                                        Label
                                        <input type="text" value={entry.label || ""} onChange={(e) => handleSpecialChange(store.id, index, "label", e.target.value)} />
                                      </label>
                                    </div>

                                    <div className="dash-duo">
                                      <label>
                                        Open
                                        <input type="time" value={entry.open || ""} disabled={entry.closed} onChange={(e) => handleSpecialChange(store.id, index, "open", e.target.value)} />
                                      </label>
                                      <label>
                                        Close
                                        <input type="time" value={entry.close || ""} disabled={entry.closed} onChange={(e) => handleSpecialChange(store.id, index, "close", e.target.value)} />
                                      </label>
                                    </div>

                                    <div className="special-actions">
                                      <label className="remember-me">
                                        <input type="checkbox" checked={!!entry.closed} onChange={(e) => handleSpecialChange(store.id, index, "closed", e.target.checked)} />
                                        <span>Closed</span>
                                      </label>
                                      <button className="ghost-btn danger" type="button" onClick={() => removeSpecial(store.id, index)}>
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </article>
        )}

        {activeTab === "support" && (
          <article className="dash-card">
            <div className="dash-card-head">
              <div>
                <p className="dash-label">Customer feedback</p>
                <strong>Complaints submitted via feedback</strong>
              </div>
              {feedbackStatus && <span className="status warn">{feedbackStatus}</span>}
            </div>

            <div className="dash-table">
              <div className="dash-table-head">
                <span>Subject</span>
                <span>Details</span>
                <span>Created</span>
              </div>

              <div className="dash-table-body">
                {combinedFeedback.map((item) => (
                  <div key={item.id} className="dash-table-row">
                    <span>{item.subject}</span>
                    <span>{item.details}</span>
                    <span className="muted">{item.created_at?.slice(0, 10) || "—"}</span>
                  </div>
                ))}

                {combinedFeedback.length === 0 && (
                  <div className="dash-table-row">
                    <span>No feedback yet</span>
                    <span />
                    <span />
                  </div>
                )}
              </div>
            </div>
          </article>
        )}

        {activeTab === "inventory" && (
          <article className="dash-card">
            <p className="dash-label">Low stock alerts</p>
            {lowStock.length === 0 && <p>All items are healthy on stock.</p>}
            <ul className="dash-list">
              {lowStock.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>Stock: {item.stock}</p>
                  </div>
                  <span className="status warn">Restock</span>
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </section>
  )
}

export default AdminCenterPage
