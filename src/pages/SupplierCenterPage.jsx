// component: SupplierCenterPage
// ✅ Works when order_items.product_id is NOT NULL
// ✅ Works even BEFORE created_at exists (orders by id)
// ✅ Automatically uses created_at if you add it later (no more edits needed)
// ✅ Realtime updates revenue when new order_items are inserted

import { useEffect, useMemo, useState } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"


const normalizeRole = (role) => String(role || "").trim().toLowerCase()

const navItems = [
  { key: "dashboard", label: "📊 Dashboard" },
  { key: "products", label: "📦 Products" },
  { key: "inventory", label: "📈 Inventory" },
  { key: "support", label: "💬 Support" },
]

function SupplierCenterPage({ onNavigate }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    stock: "",
    description: "",
  })
  const [statusMsg, setStatusMsg] = useState("")
  const [activeTab, setActiveTab] = useState("dashboard")

  // Handle incoming tab requests
  useEffect(() => {
    if (window.activeSupplierTab) {
      setActiveTab(window.activeSupplierTab)
      window.activeSupplierTab = null
    }
  }, [])

  // Support form state
  const [supportSubject, setSupportSubject] = useState("")
  const [supportDetails, setSupportDetails] = useState("")
  const [supportStatus, setSupportStatus] = useState("")
  const [supportSending, setSupportSending] = useState(false)

  // Data state
  const [myProducts, setMyProducts] = useState([])
  const [mySales, setMySales] = useState([])
  const [loadingData, setLoadingData] = useState(false)

  // Auth/Role gate
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [gateError, setGateError] = useState("")
  const [userId, setUserId] = useState(null)

  // Detect if order_items.created_at exists (so we can order by it safely)
  const [hasOrderItemsCreatedAt, setHasOrderItemsCreatedAt] = useState(false)

  // -------------------------
  // 1) Guard supplier access
  // -------------------------
  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseClient()

    const guard = async () => {
      setGateError("")
      setCheckingAuth(true)

      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) throw sessionErr

        const uid = sessionData?.session?.user?.id
        if (!uid) {
          if (!cancelled) onNavigate?.("/supplier-login")
          return
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single()

        if (profileErr || !profile || normalizeRole(profile.role) !== "supplier") {
          await supabase.auth.signOut()
          if (!cancelled) {
            setGateError("Supplier access only. Please sign in with a supplier account.")
            onNavigate?.("/supplier-login")
          }
          return
        }

        if (!cancelled) setUserId(uid)
      } catch (e) {
        try {
          await supabase.auth.signOut()
        } catch { }
        if (!cancelled) {
          setGateError(e?.message || "Unable to verify supplier access.")
          onNavigate?.("/supplier-login")
        }
      } finally {
        if (!cancelled) setCheckingAuth(false)
      }
    }

    guard()
    return () => {
      cancelled = true
    }
  }, [onNavigate])

  // ---------------------------------------------------
  // 2) Detect whether order_items.created_at exists
  //    (so .order("created_at") won't crash your query)
  // ---------------------------------------------------
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    const supabase = getSupabaseClient()

    const detectCreatedAt = async () => {
      try {
        // We attempt a tiny select ordering by created_at.
        // If the column doesn't exist, PostgREST returns an error.
        const { error } = await supabase
          .from("order_items")
          .select("id", { head: true, count: "exact" })
          .order("created_at", { ascending: false })
          .limit(1)

        if (!cancelled) setHasOrderItemsCreatedAt(!error)
      } catch {
        if (!cancelled) setHasOrderItemsCreatedAt(false)
      }
    }

    detectCreatedAt()
    return () => {
      cancelled = true
    }
  }, [userId])

  // -----------------------------------------
  // 3) Fetch products + sales + realtime
  // -----------------------------------------
  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseClient()
    let channel = null

    const fetchProducts = async () => {
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("*")
        .eq("supplier_id", userId)
        .order("created_at", { ascending: false })

      if (prodErr) throw prodErr
      const list = products || []
      setMyProducts(list)
      return list
    }

    const fetchSalesForSupplier = async (productsList) => {
      // If we don't have a products list yet, we need those IDs to filter order_items
      // (Assuming order_items doesn't have supplier_id directly)
      let activeProducts = productsList
      if (!activeProducts || activeProducts.length === 0) {
        const { data: pData } = await supabase
          .from("products")
          .select("id")
          .eq("supplier_id", userId)
        activeProducts = pData || []
      }

      const productIds = activeProducts.map((p) => p.id).filter(Boolean)
      if (productIds.length === 0) {
        setMySales([])
        return
      }

      let q = supabase.from("order_items").select("*").in("product_id", productIds)

      if (hasOrderItemsCreatedAt) {
        q = q.order("created_at", { ascending: false })
      } else {
        q = q.order("id", { ascending: false })
      }

      const { data: sales, error: salesErr } = await q
      if (salesErr) throw salesErr

      setMySales(sales || [])
    }

    const fetchAll = async () => {
      setLoadingData(true)
      setStatusMsg("")
      try {
        const pList = await fetchProducts()
        await fetchSalesForSupplier(pList)
      } catch (err) {
        console.error("[Supplier] fetchAll failed:", err)
        setStatusMsg("Could not load data: " + (err?.message || "Unknown error"))
      } finally {
        setLoadingData(false)
      }
    }

    fetchAll()

    channel = supabase
      .channel("supplier-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, () => {
        // Just re-fetch sales when a new order comes in
        fetchSalesForSupplier()
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId, hasOrderItemsCreatedAt]) // removed myProducts to fix infinite loop

  // -------------------------
  // Create new product
  // -------------------------
  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatusMsg("")

    if (!form.name.trim() || !form.price) {
      setStatusMsg("Name and price are required.")
      return
    }

    if (!userId) {
      setStatusMsg("You must be logged in.")
      return
    }

    try {
      const supabase = getSupabaseClient()
      const slugBase = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      const payload = {
        supplier_id: userId,
        name: form.name.trim(),
        slug: `${slugBase}-${Date.now()}`,
        price: parseFloat(form.price),
        category: form.category.trim() || "Uncategorized",
        image: form.image.trim() || "https://via.placeholder.com/420x520.png?text=Product",
        stock: parseInt(form.stock || "0", 10) || 0,
        status: "pending",
        description: form.description.trim() || `Supplier product: ${form.name}`,
      }

      const { data, error } = await supabase.from("products").insert(payload).select().single()
      if (error) throw error

      setMyProducts((prev) => [data, ...prev])
      setStatusMsg("Product submitted successfully!")
      setForm({ name: "", price: "", category: "", image: "", stock: "", description: "" })
    } catch (err) {
      console.error("Submission failed:", err)
      setStatusMsg("Failed to submit product. " + (err?.message || "Unknown error"))
    }
  }

  // -------------------------
  // Metrics
  // -------------------------
  const metrics = useMemo(() => {
    const revenue = mySales.reduce((sum, item) => {
      const unit = Number(item.unit_price || 0)
      const qty = Number(item.quantity || 1)
      return sum + unit * qty
    }, 0)

    const unitsSold = mySales.reduce((sum, item) => sum + Number(item.quantity || 1), 0)

    const inventoryValue = myProducts
      .filter((p) => p.status !== "rejected")
      .reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0)

    const lowStockCount = myProducts.filter(
      (p) => (Number(p.stock) || 0) < 10 && p.status === "approved"
    ).length

    const pendingCount = myProducts.filter((p) => p.status === "pending").length
    const approvedCount = myProducts.filter((p) => p.status === "approved").length

    return { revenue, unitsSold, inventoryValue, lowStockCount, pendingCount, approvedCount }
  }, [mySales, myProducts])

  // -------------------------
  // Delete rejected product
  // -------------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rejected product?")) return

    // optimistic remove
    setMyProducts((prev) => prev.filter((p) => p.id !== id))

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      setStatusMsg("Product deleted.")
    } catch (err) {
      console.error("Delete failed:", err)
      setStatusMsg("Could not delete product. " + (err?.message || "Unknown error"))
    }
  }

  // -------------------------
  // Contact Support
  // -------------------------
  const handleSupportSubmit = async (e) => {
    e.preventDefault()
    setSupportStatus("")
    if (!supportSubject.trim() || !supportDetails.trim()) {
      setSupportStatus("Please fill in all fields.")
      return
    }

    setSupportSending(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("complaints").insert({
        user_id: userId,
        subject: supportSubject.trim(),
        details: supportDetails.trim(),
      })

      if (error) throw error

      setSupportStatus("Message sent to admin.")
      setSupportSubject("")
      setSupportDetails("")
    } catch (err) {
      console.error("Support send failed:", err)
      setSupportStatus("Failed to send: " + err.message)
    } finally {
      setSupportSending(false)
    }
  }

  if (checkingAuth) {
    return (
      <section className="page-panel">
        <p className="muted">Checking supplier access...</p>
      </section>
    )
  }

  if (gateError) {
    return (
      <section className="page-panel">
        <p className="auth-status error">{gateError}</p>
      </section>
    )
  }

  return (
    <section className="page-panel">
      <div className="supplier-hero">
        <div>
          <p className="eyebrow">Supplier center</p>
          <h2>Supplier Dashboard</h2>
          <p>Manage your catalog, track real-time sales, and monitor stock levels.</p>
          {statusMsg && <p className="status" style={{ marginTop: 10 }}>{statusMsg}</p>}
        </div>

      </div>

      <div className="dashboard-shell">
        <aside className="dash-sidebar">
          <nav className="nav-links">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`nav-link ${activeTab === item.key ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="dash-main supplier-main">
          {activeTab === "dashboard" && (
            <div className="analytics-dashboard">
              <div className="analytics-grid">
                <article className="stat-card">
                  <div className="stat-head">
                    <span className="stat-label">💰 Total Revenue</span>
                    <span className="stat-trend positive">Real-time</span>
                  </div>
                  <div className="stat-value">
                    ${metrics.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="stat-footer">Lifetime sales</div>
                </article>

                <article className="stat-card">
                  <div className="stat-head">
                    <span className="stat-label">🛒 Units Sold</span>
                  </div>
                  <div className="stat-value">{metrics.unitsSold}</div>
                  <div className="stat-footer">Across {metrics.approvedCount} active products</div>
                </article>

                <article className="stat-card">
                  <div className="stat-head">
                    <span className="stat-label">💎 Inventory Value</span>
                  </div>
                  <div className="stat-value">
                    ${metrics.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="stat-footer">Total list price value</div>
                </article>

                <article className="stat-card">
                  <div className="stat-head">
                    <span className="stat-label">⚠️ Low Stock Alerts</span>
                    {metrics.lowStockCount > 0 && <span className="stat-trend negative">Attention</span>}
                  </div>
                  <div className="stat-value">{metrics.lowStockCount}</div>
                  <div className="stat-footer">Items below 10 units</div>
                </article>
              </div>

              <div className="analytics-split">
                {/* Sales Table */}
                <article className="dash-card">
                  <div className="dash-card-head">
                    <div>
                      <h3 className="dash-label">Recent Sales</h3>
                      <p className="muted">Latest items sold from your catalog</p>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="analytics-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mySales.length > 0 ? (
                          mySales.slice(0, 8).map((sale) => (
                            <tr key={sale.id}>
                              <td>
                                {sale.created_at
                                  ? new Date(sale.created_at).toLocaleDateString()
                                  : "—"}
                              </td>
                              <td>{sale.product_name || "Unknown"}</td>
                              <td>{sale.quantity}</td>
                              <td>
                                $
                                {(Number(sale.unit_price || 0) * Number(sale.quantity || 1)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="empty-table">
                              No sales recorded yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>

                {/* Product Status Overview */}
                <article className="dash-card">
                  <h3 className="dash-label">Catalog Status</h3>
                  <ul className="activity-list">
                    <li className="activity-item">
                      <div className="activity-icon payout">📦</div>
                      <div>
                        <strong>{metrics.approvedCount} Active Products</strong>
                        <p className="muted">Visible in store</p>
                      </div>
                    </li>
                    <li className="activity-item">
                      <div className="activity-icon alert">⏳</div>
                      <div>
                        <strong>{metrics.pendingCount} Pending Review</strong>
                        <p className="muted">Awaiting admin approval</p>
                      </div>
                    </li>
                  </ul>

                  {metrics.lowStockCount > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h3 className="dash-label" style={{ color: "#b91c1c" }}>Low Stock Warning</h3>
                      <ul className="activity-list">
                        {myProducts
                          .filter((p) => (Number(p.stock) || 0) < 10 && p.status === "approved")
                          .slice(0, 3)
                          .map((p) => (
                            <li key={p.id} className="activity-item">
                              <div
                                className="activity-icon negative"
                                style={{ background: "#fee2e2", color: "#b91c1c" }}
                              >
                                ⚠️
                              </div>
                              <div>
                                <strong>{p.name}</strong>
                                <p className="muted">Only {p.stock} left</p>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </article>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="proposal-board">
              <article className="dash-card form-card">
                <div className="dash-card-head">
                  <div>
                    <p className="dash-label">New product proposal</p>
                    <strong>Submit for admin approval</strong>
                  </div>
                  {statusMsg && <span className="status">{statusMsg}</span>}
                </div>

                <form className="signup-form" onSubmit={handleSubmit}>
                  <label>
                    Product name
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Organic berries"
                    />
                  </label>

                  <div className="dash-duo">
                    <label>
                      Price
                      <input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="4.99"
                      />
                    </label>
                    <label>
                      Stock
                      <input
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                        placeholder="0"
                        min="0"
                      />
                    </label>
                  </div>

                  <label>
                    Category
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      placeholder="Produce"
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Fresh organic chicken breast..."
                    />
                  </label>

                  <label>
                    Image URL
                    <input
                      type="url"
                      value={form.image}
                      onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </label>

                  <div className="auth-helper-row">
                    <button className="primary-btn" type="submit" disabled={loadingData}>
                      {loadingData ? "Processing..." : "Submit proposal"}
                    </button>
                  </div>
                </form>
              </article>

              <article className="dash-card proposal-list">
                <div className="dash-card-head">
                  <div>
                    <p className="dash-label">My Catalog</p>
                    <strong>{myProducts.length} items</strong>
                  </div>
                  <button className="ghost-btn compact" onClick={() => window.location.reload()}>
                    Refresh
                  </button>
                </div>

                {myProducts.length === 0 && (
                  <p className="muted" style={{ padding: 20 }}>
                    No products found.
                  </p>
                )}

                <ul className="proposal-items">
                  {myProducts.map((p) => (
                    <li key={p.id} className="proposal-item-row">
                      <div className="proposal-title">
                        <strong>{p.name}</strong>
                        <p>${Number(p.price).toFixed(2)} · Stock: {p.stock}</p>
                      </div>
                      <div className="proposal-actions-right">
                        <span
                          className={
                            p.status === "approved"
                              ? "status ok"
                              : p.status === "rejected"
                                ? "status warn"
                                : "status"
                          }
                        >
                          {p.status}
                        </span>
                        {p.status === "rejected" && (
                          <button
                            className="text-btn danger-text"
                            onClick={() => handleDelete(p.id)}
                            style={{ marginLeft: 12, fontSize: "0.85rem" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          )}

          {activeTab === "inventory" && (
            <article className="dash-card">
              <p className="dash-label">Inventory Management</p>
              <p className="muted">Live stock levels (updated automatically after sales).</p>
              {myProducts.length > 0 ? (
                <ul className="dash-list">
                  {myProducts.map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <div className="stock-row-sm">
                          <span className={`stock-dot ${p.stock > 0 ? "green" : "red"}`}></span>
                          <span className="muted">Current Stock:</span>
                          <strong>{p.stock}</strong>
                        </div>
                      </div>
                      <span className="status">{p.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No items yet.</p>
              )}
            </article>
          )}

          {activeTab === "support" && (
            <article className="dash-card form-card">
              <div className="dash-card-head">
                <div>
                  <p className="dash-label">Support</p>
                  <strong>Contact Admin</strong>
                  <p className="muted">Need help? Send a message directly to the admin team.</p>
                </div>
              </div>

              <form className="signup-form" onSubmit={handleSupportSubmit}>
                <label>
                  Subject
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="Inquiry about payments..."
                  />
                </label>

                <label>
                  Message
                  <textarea
                    rows={4}
                    value={supportDetails}
                    onChange={(e) => setSupportDetails(e.target.value)}
                    placeholder="Describe your issue..."
                  />
                </label>

                {supportStatus && (
                  <p className={`status ${supportStatus.includes("sent") ? "ok" : "warn"}`}>
                    {supportStatus}
                  </p>
                )}

                <div className="auth-helper-row">
                  <button className="primary-btn" type="submit" disabled={supportSending}>
                    {supportSending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </form>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

export default SupplierCenterPage
