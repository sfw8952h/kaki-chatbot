// component: SupplierCenterPage
import { useState } from "react"
import "./Pages.css"

const summary = [
  { label: "Open POs", value: "48" },
  { label: "Pending invoices", value: "12" },
  { label: "Avg. lead time", value: "2.8 days" },
]

const navItems = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "inventory", label: "Inventory" },
  { key: "support", label: "Support" },
]

// renders supplier proposal submission and dashboards
function SupplierCenterPage({ onSubmitProposal, proposals = [] }) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    image: "",
    stock: "",
  })
  const [statusMsg, setStatusMsg] = useState("")
  const [activeTab, setActiveTab] = useState("dashboard")

  const handleSubmit = (event) => {
    event.preventDefault()
    setStatusMsg("")
    if (!form.name.trim() || !form.price) {
      setStatusMsg("Name and price are required.")
      return
    }
    onSubmitProposal?.({
      name: form.name.trim(),
      price: parseFloat(form.price),
      category: form.category.trim(),
      image: form.image.trim(),
      stock: parseInt(form.stock || "0", 10) || 0,
    })
    setStatusMsg("Proposal submitted for admin review.")
    setForm({ name: "", price: "", category: "", image: "", stock: "" })
  }

  return (
    <section className="page-panel">
      <div className="supplier-hero">
        <div>
          <p className="eyebrow">Supplier center</p>
          <h2>Supplier Dashboard</h2>
          <p>Submit product proposals for admin approval. Approved items go live to customers.</p>
        </div>
        <div className="supplier-stat-grid">
          {summary.map((card) => (
            <article key={card.label} className="pill-card soft">
              <p className="dash-label">{card.label}</p>
              <strong>{card.value}</strong>
            </article>
          ))}
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
            <article className="dash-card">
              <div className="dash-card-head">
                <div>
                  <p className="dash-label">Overview & analytics</p>
                  <strong>Performance snapshot</strong>
                </div>
              </div>
              <p className="muted">
                Track your current orders, invoices, and lead times at a glance. (Placeholder content)
              </p>
            </article>
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
                    Image URL
                    <input
                      type="url"
                      value={form.image}
                      onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                  </label>
                  <div className="auth-helper-row">
                    <button className="primary-btn" type="submit">
                      Submit proposal
                    </button>
                  </div>
                </form>
              </article>

              <article className="dash-card proposal-list">
                <div className="dash-card-head">
                  <div>
                    <p className="dash-label">My proposals</p>
                    <strong>Status of submissions</strong>
                  </div>
                </div>
                {proposals.length === 0 && <p>No proposals yet.</p>}
                <ul className="proposal-items">
                  {proposals.map((p) => (
                    <li key={p.id}>
                      <div className="proposal-title">
                        <strong>{p.name}</strong>
                        <p>
                          ${p.price?.toFixed ? p.price.toFixed(2) : p.price} · {p.category || "Uncategorized"}
                        </p>
                      </div>
                      <span className={p.status === "approved" ? "status ok" : p.status === "rejected" ? "status warn" : "status"}>
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          )}

          {activeTab === "inventory" && (
            <article className="dash-card">
              <p className="dash-label">Inventory</p>
              <p className="muted">Track stock across your proposed items (placeholder).</p>
              {proposals.length > 0 ? (
                <ul className="dash-list">
                  {proposals.map((p) => (
                    <li key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <p>Stock: {p.stock ?? 0}</p>
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
            <article className="dash-card">
              <p className="dash-label">Support</p>
              <p className="muted">Need help? Reach out to the admin team.</p>
              <div className="auth-helper-row">
                <button className="primary-btn" type="button">
                  Contact support
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

export default SupplierCenterPage
