// supplier center page showing operational dashboards
import "./Pages.css"

const summary = [
  { label: "Open POs", value: "48" },
  { label: "Pending invoices", value: "12" },
  { label: "Avg. lead time", value: "2.8 days" },
]

const recentPOs = [
  { id: "#PO-2201", status: "Awaiting confirm", value: "$8,420" },
  { id: "#PO-2200", status: "Approved", value: "$12,310" },
  { id: "#PO-2199", status: "In transit", value: "$6,780" },
]

function SupplierCenterPage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">Supplier center</p>
      <h2>Supplier Dashboard</h2>
      <p>Manage catalogs, purchase orders, inventory, and invoices in one dashboard.</p>

      <div className="dashboard-shell">
        <aside className="dash-sidebar">
          <nav className="dash-nav">
            <a className="dash-nav-item active">Dashboard</a>
            <a className="dash-nav-item">Catalog</a>
            <a className="dash-nav-item">Purchase orders</a>
            <a className="dash-nav-item">Inventory</a>
            <a className="dash-nav-item">Invoices</a>
            <a className="dash-nav-item">Support</a>
          </nav>
        </aside>

        <div className="dash-main">
          <div className="dash-grid">
            {summary.map((card) => (
              <article key={card.label} className="dash-card">
                <p className="dash-label">{card.label}</p>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>

          <div className="dash-charts">
            <article className="dash-card dash-chart">
              <p className="dash-label">Fulfillment performance</p>
              <div className="chart-placeholder bar">Bar chart placeholder</div>
            </article>
            <article className="dash-card dash-chart">
              <p className="dash-label">Stock across DCs</p>
              <div className="chart-placeholder pie">Pie chart placeholder</div>
            </article>
          </div>

          <div className="dash-lists">
            <article className="dash-card">
              <p className="dash-label">Recent purchase orders</p>
              <ul className="dash-list">
                {recentPOs.map((po) => (
                  <li key={po.id}>
                    <div>
                      <strong>{po.id}</strong>
                      <p>{po.status}</p>
                    </div>
                    <span>{po.value}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="dash-card">
              <p className="dash-label">Invoice status</p>
              <ul className="dash-list">
                <li>
                  <div>
                    <strong>INV-1011</strong>
                    <p>Matching to PO-2200</p>
                  </div>
                  <span className="status ok">Approved</span>
                </li>
                <li>
                  <div>
                    <strong>INV-1010</strong>
                    <p>Matching to PO-2198</p>
                  </div>
                  <span className="status warn">Pending</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SupplierCenterPage
