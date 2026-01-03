import { useMemo, useState } from "react"
import "./MembershipPage.css"

const tiers = [
  {
    id: "bronze",
    label: "Bronze",
    headline: "Get started",
    minPoints: 0,
    maxPoints: 499,
    perks: ["Welcome bundle worth 200 pts", "Early access to weekly flyers", "Tiered points multiplier ×1"],
    accent: "linear-gradient(135deg, #fef3c7, #fde68a)",
  },
  {
    id: "silver",
    label: "Silver",
    headline: "Earn more rewards",
    minPoints: 500,
    maxPoints: 1499,
    perks: ["Free delivery on orders over $35", "Birthday double points", "Tiered multiplier ×1.5"],
    accent: "linear-gradient(135deg, #c7d2fe, #a5b4fc)",
  },
  {
    id: "gold",
    label: "Gold",
    headline: "Exclusive treatment",
    minPoints: 1500,
    maxPoints: Number.POSITIVE_INFINITY,
    perks: ["Priority support", "Complimentary samples each month", "Tiered multiplier ×2"],
    accent: "linear-gradient(135deg, #fde68a, #fb923c)",
  },
]

const benefits = [
  "Buy stuff get points and stuff. idk not finished yet",
]

const formatTier = (tierId) => tiers.find((tier) => tier.id === tierId) || tiers[0]

function MembershipPage({ user, profile, onNavigate = () => {}, onMembershipChange }) {
  const [updatingTier, setUpdatingTier] = useState("")
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  const activeTier = useMemo(() => formatTier(profile?.membership_tier), [profile?.membership_tier])
  const points = Number(profile?.membership_points ?? 0)

  const nextTier = useMemo(() => {
    const index = tiers.findIndex((tier) => tier.id === activeTier.id)
    return tiers[index + 1] || null
  }, [activeTier.id])

  const progress = useMemo(() => {
    if (!nextTier) return 100
    const range = nextTier.minPoints - activeTier.minPoints
    const progressPoints = Math.max(0, Math.min(points - activeTier.minPoints, range))
    return Math.min(100, Math.round((progressPoints / Math.max(range, 1)) * 100))
  }, [points, activeTier, nextTier])

  const handleSelectTier = async (tierId) => {
    if (!user) {
      setError("Please sign in to save your membership tier.")
      onNavigate?.("/login")
      return
    }
    if (!onMembershipChange || tierId === activeTier.id || updatingTier) return

    setNotice("")
    setError("")
    setUpdatingTier(tierId)

    try {
      const success = await onMembershipChange(tierId)
      if (success) {
        setNotice(`Your account is now linked to the ${formatTier(tierId).label} tier.`)
      } else {
        setError("We couldn't change your tier right now. Please try again.")
      }
    } catch (e) {
      console.error(e)
      setError(e?.message || "We couldn't change your tier right now. Please try again.")
    } finally {
      setUpdatingTier("")
    }
  }

  return (
    <section className="membership-page page-panel">
      <p className="eyebrow">Membership</p>
      <h2>Level up the rewards</h2>
      <p className="muted">
        Connect your FreshMart account to a tier, earn points, and unlock perks. Switching tiers is instant.
      </p>

      {!user ? (
        <div className="membership-alert">
          <p>Please sign in to save your membership tier to your account.</p>
          <button className="primary-btn" type="button" onClick={() => onNavigate?.("/login")}>
            Sign in
          </button>
        </div>
      ) : (
        <>
          <div className="membership-status">
            <div>
              <p className="label">Current tier</p>
              <h3>{activeTier.label}</h3>
              <p className="muted">{activeTier.headline}</p>
            </div>

            <div className="points-block">
              <strong>{points} pts</strong>
              <span>Earned</span>
              {nextTier && <small>{Math.max(0, nextTier.minPoints - points)} pts until {nextTier.label}</small>}
            </div>
          </div>

          {nextTier && (
            <div className="progress-row">
              <div className="progress-bar" aria-label="membership progress">
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>{progress}% to {nextTier.label}</small>
            </div>
          )}

          <div className="tier-grid">
            {tiers.map((tier) => {
              const isActive = tier.id === activeTier.id
              const isUpdatingThis = updatingTier === tier.id

              return (
                <article
                  key={tier.id}
                  className={`tier-card ${isActive ? "tier-card--active" : ""}`}
                  style={{ background: tier.accent }}
                >
                  <header>
                    <strong>{tier.label}</strong>
                    <span>{tier.headline}</span>
                  </header>

                  <ul>
                    {tier.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>

                  <button
                    className="ghost-btn"
                    type="button"
                    disabled={!user || isActive || Boolean(updatingTier)}
                    onClick={() => handleSelectTier(tier.id)}
                  >
                    {isActive ? "Active tier" : isUpdatingThis ? "Updating…" : `Join ${tier.label}`}
                  </button>
                </article>
              )
            })}
          </div>

          <div className="benefits-list">
            {benefits.map((benefit) => (
              <p key={benefit}>{benefit}</p>
            ))}
          </div>

          {(notice || error) && (
            <p className={notice ? "success-text" : "error-text"}>
              {notice || error}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default MembershipPage
