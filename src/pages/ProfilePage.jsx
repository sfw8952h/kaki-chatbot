// component: ProfilePage
import { useMemo, useState, useEffect, useCallback } from "react"
import "./ProfilePage.css"
import { getSupabaseClient } from "../lib/supabaseClient"
import { getTierByPoints, tiers } from "../lib/appConstants"
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiPackage,
  FiAward,
  FiZap,
  FiCheckCircle,
  FiArrowRight,
  FiPlus,
  FiTrash2,
  FiClock,
  FiCreditCard
} from "react-icons/fi"

const navTabs = [
  { id: "personal", label: "Account profile", icon: <FiUser /> },
  { id: "membership", label: "Rewards & Points", icon: <FiAward /> },
  { id: "addresses", label: "Delivery addresses", icon: <FiMapPin /> },
  { id: "orders", label: "Order history", icon: <FiPackage /> },
]

function ProfilePage({ onNavigate, user, profile, onProfileUpdated, onLogout, orders = [] }) {
  const supabase = useMemo(() => {
    try {
      return getSupabaseClient()
    } catch (err) {
      console.error(err)
      return null
    }
  }, [])

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(navTabs[0].id)

  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressListError, setAddressListError] = useState("")
  const [addressActionState, setAddressActionState] = useState({ id: null, type: null })
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    details: "",
    instructions: "",
    isDefault: true,
  })
  const [addressFormStatus, setAddressFormStatus] = useState("")
  const [addressFormError, setAddressFormError] = useState("")
  const [savingAddress, setSavingAddress] = useState(false)

  const ensureSession = async () => {
    if (!supabase) throw new Error("Supabase is not configured.")
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (data?.session) return data.session

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) throw refreshError
    if (!refreshed?.session) throw new Error("Session expired. Please log in again.")
    return refreshed.session
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase || !user) return
      setError("")
      try {
        await ensureSession()

        if (profile) {
          setFullName(profile.full_name || "")
          setPhone(profile.phone || "")
          return
        }

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        const meta = user.user_metadata || {}
        const resolvedName = data?.full_name ?? meta.full_name ?? meta.name ?? ""
        const resolvedPhone = data?.phone ?? meta.phone ?? ""

        setFullName(resolvedName || "")
        setPhone(resolvedPhone || "")
      } catch (err) {
        console.error("Load profile error:", err)
        setError(err.message || "Unable to load profile right now.")
        const meta = user?.user_metadata || {}
        setFullName(meta.full_name || meta.name || "")
        setPhone(meta.phone || "")
      }
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user, profile])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "")
      setPhone(profile.phone || "")
    }
  }, [profile])

  const handleUpdate = async (event) => {
    event.preventDefault()
    setStatus("")
    setError("")

    if (!supabase) return setError("Supabase is not configured.")
    if (!user) return setError("You need to be logged in to update your profile.")

    setLoading(true)
    try {
      await ensureSession()

      const payload = {
        id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      }

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })

      if (upsertError) throw upsertError

      setStatus("Profile updated successfully.")
      onProfileUpdated?.(fullName.trim())
    } catch (err) {
      console.error("Update profile error:", err)
      setError(err.message || "Unable to update profile right now.")
    } finally {
      setLoading(false)
    }
  }

  const refreshAddresses = useCallback(async () => {
    if (!supabase || !user) {
      setAddresses([])
      return
    }
    setAddressListError("")
    setAddressesLoading(true)
    try {
      await ensureSession()
      const { data, error: fetchError } = await supabase
        .from("addresses")
        .select("id,label,details,instructions,is_default,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
      if (fetchError) throw fetchError
      setAddresses(data || [])
    } catch (fetchErr) {
      console.error("Load addresses error:", fetchErr)
      setAddressListError(fetchErr.message || "Unable to load addresses.")
      setAddresses([])
    } finally {
      setAddressesLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    refreshAddresses()
  }, [refreshAddresses])

  const handleAddAddress = async (event) => {
    event.preventDefault()
    setAddressFormStatus("")
    setAddressFormError("")

    if (!supabase) return setAddressFormError("Supabase is not configured.")
    if (!user) return setAddressFormError("You need to be logged in to save an address.")
    if (!addressForm.label.trim() || !addressForm.details.trim()) {
      return setAddressFormError("Label and full address are required.")
    }

    const shouldBeDefault = addressForm.isDefault || addresses.length === 0

    setSavingAddress(true)
    try {
      await ensureSession()

      if (shouldBeDefault) {
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id)
      }

      const { error: insertError } = await supabase.from("addresses").insert({
        user_id: user.id,
        label: addressForm.label.trim(),
        details: addressForm.details.trim(),
        instructions: addressForm.instructions.trim() || null,
        is_default: shouldBeDefault,
      })
      if (insertError) throw insertError

      if (shouldBeDefault) {
        try {
          await supabase.auth.updateUser({
            data: {
              address_label: addressForm.label.trim(),
              address: addressForm.details.trim(),
              instructions: addressForm.instructions.trim() || "",
            },
          })
        } catch (metaErr) {
          console.warn("Update user metadata address failed:", metaErr)
        }
      }

      setAddressForm({ label: "Home", details: "", instructions: "", isDefault: false })
      setAddressFormStatus("Address saved.")
      await refreshAddresses()
    } catch (err) {
      console.error("Save address error:", err)
      setAddressFormError(err.message || "Unable to save address right now.")
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId) => {
    if (!supabase || !user) return
    setAddressListError("")
    setAddressActionState({ id: addressId, type: "delete" })
    try {
      await ensureSession()
      const { error: deleteError } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", user.id)
      if (deleteError) throw deleteError
      await refreshAddresses()
    } catch (err) {
      console.error("Delete address error:", err)
      setAddressListError(err.message || "Unable to delete the address.")
    } finally {
      setAddressActionState({ id: null, type: null })
    }
  }

  const handleMakeDefault = async (addressId) => {
    if (!supabase || !user) return
    setAddressListError("")
    setAddressActionState({ id: addressId, type: "default" })
    try {
      await ensureSession()
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id)

      const { error: defaultError } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", user.id)

      if (defaultError) throw defaultError

      const selected = addresses.find((entry) => entry.id === addressId)
      if (selected) {
        try {
          await supabase.auth.updateUser({
            data: {
              address_label: selected.label || "Default",
              address: selected.details || "",
              instructions: selected.instructions || "",
            },
          })
        } catch (metaErr) {
          console.warn("Update user metadata address failed:", metaErr)
        }
      }

      await refreshAddresses()
    } catch (err) {
      console.error("Default address error:", err)
      setAddressListError(err.message || "Unable to set default address.")
    } finally {
      setAddressActionState({ id: null, type: null })
    }
  }

  const recentOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : [])
      .slice(0, 3)
      .map((order) => ({
        id: order.id,
        date: order.date || order.placed_at || order.created_at || "",
        total:
          typeof order.total === "number"
            ? `$${order.total.toFixed(2)}`
            : order.total || "$0.00",
        status: order.status || "Processing",
      }))
  }, [orders])

  const currentPoints = profile?.membership_points || 0
  const currentTier = useMemo(() => getTierByPoints(currentPoints), [currentPoints])
  const nextTier = useMemo(() => {
    const currentIndex = tiers.findIndex(t => t.id === currentTier.id)
    return tiers[currentIndex + 1] || null
  }, [currentTier])

  const progressPct = useMemo(() => {
    if (!nextTier) return 100
    const range = nextTier.minPoints - currentTier.minPoints
    const progress = currentPoints - currentTier.minPoints
    return Math.min(100, Math.max(0, Math.round((progress / range) * 100)))
  }, [currentPoints, currentTier, nextTier])

  if (!user) {
    return (
      <div className="profile-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <FiUser style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '24px' }} />
        <h2>Session Required</h2>
        <p className="muted">Please log in to view and manage your profile.</p>
        <button className="primary-btn" style={{ marginTop: '32px' }} onClick={() => onNavigate?.("/login")}>
          Go to login
        </button>
      </div>
    )
  }

  const renderPersonalTab = () => (
    <div className="profile-card">
      <div className="profile-card-head">
        <div>
          <p className="eyebrow">Personal Info</p>
          <h3>Profile details</h3>
          <p className="muted">Manage your identity and contact information across Kaki.</p>
        </div>
        <div className="profile-avatar-display">
          {/* Handled by CSS user-icon for consistency */}
        </div>
      </div>

      <form className="profile-form" onSubmit={handleUpdate}>
        <div className="form-row">
          <label>
            <div className="label-with-icon"><FiUser /> Full name</div>
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label>
            <div className="label-with-icon"><FiPhone /> Mobile number</div>
            <input
              type="tel"
              placeholder="+65 1234 5678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            <div className="label-with-icon"><FiMail /> Email</div>
            <input type="email" value={user.email} disabled />
          </label>
          <label>
            <div className="label-with-icon"><FiArrowRight /> Registered</div>
            <input type="text" value={new Date(user.created_at).toLocaleDateString()} disabled />
          </label>
        </div>

        {status && <p className="auth-status success"><FiCheckCircle /> {status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <div className="profile-actions">
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Saving changes..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  )

  const renderMembershipTab = () => (
    <div className="profile-card membership-view">
      <div className="profile-card-head">
        <div>
          <p className="eyebrow">Kaki Rewards</p>
          <h3>Points & status</h3>
          <p className="muted">Earn 1 point for every $1 spent. Unlock exclusive savings and perks as you level up.</p>
        </div>
        <div className="tier-badge" style={{ background: currentTier.accent }}>
          {currentTier.label}
        </div>
      </div>

      <div className="membership-stats-grid">
        <div className="membership-stat-card">
          <div className="stat-icon"><FiZap /></div>
          <div className="stat-content">
            <span className="stat-label">Wallet Balance</span>
            <span className="stat-value">{currentPoints.toLocaleString()} pts</span>
          </div>
        </div>
        <div className="membership-stat-card">
          <div className="stat-icon"><FiAward /></div>
          <div className="stat-content">
            <span className="stat-label">Current Tier</span>
            <span className="stat-value">{currentTier.label}</span>
          </div>
        </div>
      </div>

      <div className="tier-progress-section">
        <div className="progress-header">
          <span>{nextTier ? `Progress to ${nextTier.label}` : 'Maximum level reached'}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%`, background: currentTier.accent }}></div>
        </div>
        {nextTier && (
          <p className="progress-note">
            Earn another <strong>{(nextTier.minPoints - currentPoints).toLocaleString()} points</strong> to reach the {nextTier.label} tier.
          </p>
        )}
      </div>

      <div className="benefits-section">
        <h4 className="section-title">Active benefits</h4>
        <div className="perks-grid">
          {currentTier.perks.map((perk, i) => (
            <div key={i} className="perk-item">
              <FiCheckCircle className="perk-icon" />
              <span>{perk}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAddressesTab = () => (
    <div className="profile-card">
      <div className="profile-card-head">
        <div>
          <p className="eyebrow">Shipping</p>
          <h3>Delivery addresses</h3>
          <p className="muted">Saved locations for a smoother checkout experience.</p>
        </div>
        {/* Scroll action button */}
      </div>

      <div className="address-grid">
        {addresses.map((entry) => (
          <div key={entry.id} className={`address-card ${entry.is_default ? 'default' : ''}`}>
            <div className="address-card-body">
              <div className="address-header">
                <strong>{entry.label}</strong>
                {entry.is_default && <span className="default-pill">Default</span>}
              </div>
              <p className="address-text">{entry.details}</p>
              {entry.instructions && (
                <span className="address-instructions">
                  {entry.instructions}
                </span>
              )}
            </div>
            <div className="address-card-footer">
              {!entry.is_default && (
                <button
                  className="action-btn-text"
                  onClick={() => handleMakeDefault(entry.id)}
                >
                  Set as default
                </button>
              )}
              <button
                className="action-btn-text danger"
                onClick={() => handleDeleteAddress(entry.id)}
              >
                <FiTrash2 /> Remove
              </button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && <p className="muted">No addresses saved yet.</p>}
      </div>

      <div className="profile-card-divider" style={{ margin: '40px 0', borderTop: '1px solid var(--profile-border)' }} />

      <form id="new-address-form" className="profile-form" onSubmit={handleAddAddress}>
        <h4 className="section-title">Add a new address</h4>
        <div className="form-row">
          <label>
            <div className="label-with-icon"><FiMapPin /> Label (e.g. Home)</div>
            <input
              type="text"
              value={addressForm.label}
              placeholder="Home, Office, etc."
              onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', height: '100%', paddingTop: '32px' }}>
            <input
              type="checkbox"
              style={{ width: '20px', height: '20px' }}
              checked={addressForm.isDefault}
              onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
            />
            <span style={{ fontWeight: 700, color: '#334155' }}>Set as default</span>
          </label>
        </div>
        <div className="form-row">
          <label>
            <div className="label-with-icon"><FiMapPin /> Full Address</div>
            <textarea
              rows={2}
              value={addressForm.details}
              placeholder="Street name, unit number, postal code"
              onChange={(e) => setAddressForm({ ...addressForm, details: e.target.value })}
            />
          </label>
          <label>
            <div className="label-with-icon"><FiPlus /> Delivery Notes</div>
            <textarea
              rows={2}
              value={addressForm.instructions}
              placeholder="Drop with guard, call on arrival, etc."
              onChange={(e) => setAddressForm({ ...addressForm, instructions: e.target.value })}
            />
          </label>
        </div>
        {addressFormError && <p className="auth-status error">{addressFormError}</p>}
        {addressFormStatus && <p className="auth-status success">{addressFormStatus}</p>}
        <div className="profile-actions">
          <button className="primary-btn" type="submit" disabled={savingAddress}>
            {savingAddress ? "Saving..." : "Save Address"}
          </button>
        </div>
      </form>
    </div>
  )

  const renderOrdersTab = () => (
    <div className="profile-card">
      <div className="profile-card-head">
        <div>
          <p className="eyebrow">History</p>
          <h3>Recent activity</h3>
          <p className="muted">Track your most recent orders and their status.</p>
        </div>
        <button className="ghost-btn" onClick={() => onNavigate?.("/history")}>
          Full history <FiArrowRight />
        </button>
      </div>

      <div className="recent-orders-list">
        {recentOrders.length === 0 ? (
          <div className="empty-orders">
            <FiPackage style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px' }} />
            <p className="muted">You haven't placed any orders yet.</p>
          </div>
        ) : (
          recentOrders.map((order) => (
            <div key={order.id} className="order-item-compact">
              <div className="order-info">
                <span className="order-id">#{order.id.slice(0, 8)}</span>
                <span className="order-date"><FiClock /> {new Date(order.date).toLocaleDateString()}</span>
              </div>
              <div className="order-status-group">
                <span className="order-price">{order.total}</span>
                <span className={`status-tag ${order.status.toLowerCase()}`}>{order.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case "membership":
        return renderMembershipTab()
      case "addresses":
        return renderAddressesTab()
      case "orders":
        return renderOrdersTab()
      case "personal":
      default:
        return renderPersonalTab()
    }
  }

  const activeTabLabel = navTabs.find(t => t.id === activeTab)?.label || "Profile"

  return (
    <section className="profile-container">
      <div className="profile-layout">
        <aside className="profile-nav">
          <div className="user-summary">
            <div className="user-icon">
              {(fullName || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div className="user-text">
              <h4>{fullName || "User"}</h4>
              <p>{user.email}</p>
            </div>
          </div>
          <nav>
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="nav-footer">
            <button className="nav-item signout" onClick={onLogout}>
              <FiArrowRight />
              <span>Logout session</span>
            </button>
          </div>
        </aside>

        <main className="profile-main">
          <header className="main-header">
            <h2>{activeTabLabel}</h2>
            <p>Manage and track your FreshMart account profile.</p>
          </header>
          {renderContent()}
        </main>
      </div>
    </section>
  )
}

export default ProfilePage
