// component: MembershipPage
import "./Pages.css"

const perks = ["Free delivery above $50", "Birthday double points", "Priority support"]
const activity = [
  { id: "#1043", action: "Order", points: "+120", date: "Mar 10" },
  { id: "#1042", action: "Promo bonus", points: "+60", date: "Mar 2" },
  { id: "#1041", action: "Redemption", points: "-80", date: "Feb 25" },
]

function MembershipPage() {
  const tier = "Gold"
  const points = 1320
  const nextTierPoints = 1800
  const progress = Math.min(100, Math.round((points / nextTierPoints) * 100))

  return (
    <section className="page-panel">
      <p className="eyebrow">Membership</p>
      <h2>Your rewards</h2>
      <p>Track points, tier, and your most recent activity.</p>

      <div className="membership-grid">
        <article className="card-soft">
          <p className="label">Current tier</p>
          <h3>{tier}</h3>
          <p>{points} pts</p>
          <div className="progress-wrap">
            <div className="progress-bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <small>{points} / {nextTierPoints} pts to next tier</small>
          </div>
        </article>

        <article className="card-soft">
          <p className="label">Perks</p>
          <ul className="perk-list">
            {perks.map((perk) => (
              <li key={perk}>{perk}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="card-soft">
        <p className="label">Recent activity</p>
        <ul className="dash-list">
          {activity.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.action}</strong>
                <p>{row.id} • {row.date}</p>
              </div>
              <span>{row.points}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}

export default MembershipPage
