// purchase history page showing previous orders
import "./Pages.css"

const purchases = [
  { id: "#1024", item: " tomatoes", date: "Mar 3", total: "17.29", status: "Delivered" },
  { id: "#1025", item: " oranges", date: "Mar 8", total: "12.29", status: "Shipped" },
]

function PurchaseHistoryPage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">Purchase history</p>
      <h2>Your previous orders </h2>
      <div className="list-stack">
        {purchases.map((p) => (
          <article key={p.id} className="list-card">
            <div>
              <strong>{p.item}</strong>
              <p>{p.id} • {p.date}</p>
            </div>
            <div className="list-meta">
              <span>{p.status}</span>
              <strong>${p.total}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default PurchaseHistoryPage
