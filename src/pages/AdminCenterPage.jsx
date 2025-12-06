// admin center page for store management dashboards
import "./Pages.css"

const summary = [
  { label: "SKUs live", value: "2,456" },
  { label: "Sales this month", value: "678", trend: "up" },
  { label: "Revenue this month", value: "$234,550" },
]

const topProducts = [
  { name: "Heirloom tomatoes", sales: "123 orders", revenue: "$15,450" },
  { name: "Petal peel oranges", sales: "98 orders", revenue: "$12,120" },
  { name: "Artisan sourdough", sales: "74 orders", revenue: "$9,810" },
]

function AdminCenterPage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">Admin center</p>
      <h2>Manage store operations</h2>
      <p>Oversee orders, listings, and promotions from one clean dashboard.</p>

      <div className="dashboard-shell">
        <aside className="dash-sidebar">
          <nav className="dash-nav">
            <a className="dash-nav-item active">Dashboard</a>
            <a className="dash-nav-item">Orders</a>
            <a className="dash-nav-item">Listings</a>
            <a className="dash-nav-item">Promotions</a>
            <a className="dash-nav-item">Customers</a>
            <a className="dash-nav-item">Support</a>
          </nav>
        </aside>

        <div className="dash-main">
          <div className="dash-grid">
            {summary.map((card) => (
              <article key={card.label} className="dash-card">
                <p className="dash-label">{card.label}</p>
                <div className="dash-value-row">
                  <strong>{card.value}</strong>
                  {card.trend === "up" && <span className="trend up">▲</span>}
                  {card.trend === "down" && <span className="trend down">▼</span>}
                </div>
              </article>
            ))}
          </div>

          <div className="dash-charts">
            <article className="dash-card dash-chart">
              <p className="dash-label">Sales by category</p>
              <div className="chart-placeholder pie">Pie chart placeholder</div>
            </article>
            <article className="dash-card dash-chart">
              <p className="dash-label">Sales by discount</p>
              <div className="chart-placeholder pie">Pie chart placeholder</div>
            </article>
          </div>

          <div className="dash-lists">
            <article className="dash-card">
              <p className="dash-label">Top selling products</p>
              <ul className="dash-list">
                {topProducts.map((item) => (
                  <li key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.sales}</p>
                    </div>
                    <span>{item.revenue}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="dash-card">
              <p className="dash-label">Low stock alerts</p>
              <ul className="dash-list">
                <li>
                  <div>
                    <strong>Fresh mint bundles</strong>
                    <p>Stock: 5</p>
                  </div>
                  <span className="status warn">Restock</span>
                </li>
                <li>
                  <div>
                    <strong>Artisan sourdough</strong>
                    <p>Stock: 8</p>
                  </div>
                  <span className="status warn">Restock</span>
                </li>
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AdminCenterPage
