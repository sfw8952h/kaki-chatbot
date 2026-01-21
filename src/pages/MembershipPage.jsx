import { useMemo, useState } from "react"
import "./MembershipPage.css"
import { benefits, tiers } from "../data/membershipTiers"
import { vouchers } from "../data/vouchers"
import { FiAward, FiTag, FiCheckCircle, FiStar, FiZap } from "react-icons/fi"

const formatTier = (tierId) => tiers.find((tier) => tier.id === tierId) || tiers[0]

function MembershipPage({ user, profile, onNavigate = () => { }, onMembershipChange, onRedeemVoucher }) {
  const [updatingTier, setUpdatingTier] = useState("")
  const [activeView, setActiveView] = useState("tiers") // 'tiers' or 'redeem'
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [redeemingId, setRedeemingId] = useState(null)

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

  const handleRedeem = async (voucher) => {
    if (!user) {
      setError("Please sign in to redeem rewards.")
      return
    }
    if (points < voucher.cost) {
      setError("You don't have enough points for this reward.")
      return
    }

    setNotice("")
    setError("")
    setRedeemingId(voucher.id)

    try {
      const success = await onRedeemVoucher?.(voucher.cost)
      if (success) {
        setNotice(`Successfully redeemed ${voucher.title}! It will be applied to your next checkout.`)
      } else {
        setError("Redemption failed. Please try again later.")
      }
    } catch (err) {
      console.error(err)
      setError("An error occurred during redemption.")
    } finally {
      setRedeemingId(null)
    }
  }

  return (
    <section className="membership-page page-panel">
      <div className="membership-header">
        <div>
          <p className="eyebrow">Membership & Rewards</p>
          <h2>Level up your shopping</h2>
          <p className="muted">
            Earn points with every purchase and unlock exclusive vouchers and perks.
          </p>
        </div>
        <div className="membership-tabs">
          <button
            className={`tab-btn ${activeView === 'tiers' ? 'active' : ''}`}
            onClick={() => setActiveView('tiers')}
          >
            <FiAward /> Membership Tiers
          </button>
          <button
            className={`tab-btn ${activeView === 'redeem' ? 'active' : ''}`}
            onClick={() => setActiveView('redeem')}
          >
            <FiTag /> Redeem Vouchers
          </button>
        </div>
      </div>

      {!user ? (
        <div className="membership-alert">
          <p>Please sign in to view your points and redeem rewards.</p>
          <button className="primary-btn" type="button" onClick={() => onNavigate?.("/login")}>
            Sign in
          </button>
        </div>
      ) : (
        <>
          <div className="membership-status-card">
            <div className="status-main">
              <div className="tier-info">
                <span className="tiny-label">Current Tier</span>
                <h3>{activeTier.label}</h3>
                <p>{activeTier.headline}</p>
              </div>
              <div className="points-display">
                <div className="points-value">
                  <FiZap /> {points.toLocaleString()}
                </div>
                <span>Available Points</span>
              </div>
            </div>

            {nextTier && (
              <div className="progress-section">
                <div className="progress-info">
                  <span>Progress to {nextTier.label}</span>
                  <strong>{progress}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%`, background: activeTier.accent }}></div>
                </div>
                <p className="remaining-points">
                  <strong>{Math.max(0, nextTier.minPoints - points)} points</strong> more to reach {nextTier.label}
                </p>
              </div>
            )}
          </div>

          {activeView === 'tiers' ? (
            <div className="tier-grid">
              {tiers.map((tier) => {
                const isActive = tier.id === activeTier.id
                const isUpdatingThis = updatingTier === tier.id

                return (
                  <article
                    key={tier.id}
                    className={`tier-card ${isActive ? "tier-card--active" : ""}`}
                    style={{ "--tier-accent": tier.accent }}
                  >
                    <div className="tier-card-glow" style={{ background: tier.accent }}></div>
                    <header>
                      <div className="tier-icon-wrap">
                        <FiStar className="tier-star" />
                      </div>
                      <strong>{tier.label}</strong>
                      <span className="tier-points-req">{tier.minPoints}+ pts</span>
                    </header>

                    <ul className="tier-perks">
                      {tier.perks.map((perk) => (
                        <li key={perk}><FiCheckCircle /> {perk}</li>
                      ))}
                    </ul>

                    <button
                      className={`tier-action-btn ${isActive ? 'active' : ''}`}
                      type="button"
                      disabled={!user || isActive || Boolean(updatingTier)}
                      onClick={() => handleSelectTier(tier.id)}
                    >
                      {isActive ? "Current Plan" : isUpdatingThis ? "Switching..." : "Switch to Tier"}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="vouchers-grid">
              {vouchers.map((v) => {
                const canAfford = points >= v.cost
                return (
                  <div key={v.id} className={`voucher-card ${!canAfford ? 'locked' : ''}`}>
                    <div className="voucher-icon">
                      <FiTag />
                    </div>
                    <div className="voucher-info">
                      <h4>{v.title}</h4>
                      <p>{v.description}</p>
                      <div className="voucher-cost">
                        <FiZap /> {v.cost} pts
                      </div>
                    </div>
                    <button
                      className="redeem-btn"
                      disabled={!canAfford || redeemingId === v.id}
                      onClick={() => handleRedeem(v)}
                    >
                      {redeemingId === v.id ? "Redeeming..." : canAfford ? "Redeem Now" : "Need more points"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {(notice || error) && (
            <div className={`membership-toast ${notice ? 'success' : 'error'}`}>
              {notice && <FiCheckCircle />}
              {notice || error}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default MembershipPage

