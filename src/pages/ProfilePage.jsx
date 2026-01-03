// component: ProfilePage
import { useMemo, useState, useEffect, useCallback } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

const navTabs = [
  { id: "personal", label: "Personal information" },
  { id: "membership", label: "Membership points" },
  { id: "addresses", label: "Saved delivery address" },
  { id: "orders", label: "Recent orders" },
]

const membershipSnapshot = {
  tier: "Emerald",
  points: 1265,
  nextRewardAt: 1500,
  benefits: ["5% off produce", "Priority chat support", "Free delivery on weekends"],
}

const fallbackOrders = [
  { id: "FM-10423", date: "Dec 12, 2025", total: "$82.40", status: "On the way" },
  { id: "FM-10388", date: "Dec 5, 2025", total: "$56.10", status: "Delivered" },
  { id: "FM-10342", date: "Nov 24, 2025", total: "$41.80", status: "Delivered" },
]

function ProfilePage({ onNavigate, user, profileName, onProfileUpdated }) {
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
  const [address, setAddress] = useState("")
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

  // ensures the user session is valid before db updates
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

  // 1) load profile data from public.profiles (source of truth)
  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase || !user) return
      setError("")
      try {
        await ensureSession()

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        // prefer db profile, but fall back to props / auth metadata for first-time users
        const meta = user.user_metadata || {}
        const resolvedName = data?.full_name ?? profileName ?? meta.full_name ?? meta.name ?? ""
        const resolvedPhone = data?.phone ?? meta.phone ?? ""

        setFullName(resolvedName || "")
        setPhone(resolvedPhone || "")
      } catch (err) {
        console.error("Load profile error:", err)
        // don’t block the whole page, just show a warning
        setError(err.message || "Unable to load profile right now.")
        const meta = user?.user_metadata || {}
        setFullName(profileName || meta.full_name || meta.name || "")
        setPhone(meta.phone || "")
      }
    }

    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, user])

  // keep address textbox initialised from user metadata only if present
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata || {}
    setAddress(meta.address || "")
  }, [user])

  // 2) update profile in public.profiles (NOT auth metadata)
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
        // role is not touched here (keeps existing role)
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
      setAddressListError(fetchErr.message || "Unable to load addresses. Please try again in a moment.")
      setAddresses([])
    } finally {
      setAddressesLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    refreshAddresses()
  }, [refreshAddresses])

  useEffect(() => {
    if (!address && addresses.length > 0) {
      const defaultEntry = addresses.find((entry) => entry.is_default) || addresses[0]
      if (defaultEntry?.details) setAddress(defaultEntry.details)
    }
  }, [addresses, address])

  useEffect(() => {
    const ensureDefault = async () => {
      if (!supabase || !user) return
      if (addresses.length === 0) return
      const hasDefault = addresses.some((entry) => entry.is_default)
      if (!hasDefault) {
        try {
          await ensureSession()
          await supabase
            .from("addresses")
            .update({ is_default: true })
            .eq("id", addresses[0].id)
            .eq("user_id", user.id)
          refreshAddresses()
        } catch (err) {
          console.error("Ensure default address error:", err)
        }
      }
    }
    ensureDefault()
  }, [addresses, refreshAddresses, supabase, user])

  useEffect(() => {
    if (addresses.length === 0) setAddressForm((prev) => ({ ...prev, isDefault: true }))
  }, [addresses.length])

  const orders = fallbackOrders

  const handleAddressInputChange = (field, value) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddAddress = async (event) => {
    event.preventDefault()
    setAddressFormStatus("")
    setAddressFormError("")

    if (!supabase) return setAddressFormError("Supabase is not configured.")
    if (!user) return setAddressFormError("You need to be logged in to save an address.")
    if (!addressForm.label.trim() || !addressForm.details.trim()) {
      return setAddressFormError("Label and full address are required.")
    }

    const shouldBeDefault = addressForm.isDefault || addresses.every((entry) => !entry.is_default)

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
      await refreshAddresses()
    } catch (err) {
      console.error("Default address error:", err)
      setAddressListError(err.message || "Unable to set default address.")
    } finally {
      setAddressActionState({ id: null, type: null })
    }
  }

  const isAddressActionPending = (addressId, type) =>
    addressActionState.id === addressId && addressActionState.type === type

  if (!user) {
    return (
      <section className="page-panel profile-empty">
        <h2>Profile</h2>
        <p>You need to log in to manage your profile.</p>
        <button className="primary-btn zoom-on-hover" onClick={() => onNavigate?.("/login")}>
          Go to login
        </button>
      </section>
    )
  }

  const renderPersonalTab = () => (
    <div className="profile-card">
      <div className="profile-card-head">
        <div>
          <p className="eyebrow">Account overview</p>
          <h3>Personal information</h3>
          <p className="muted">
            Update your name and contact details. Email is used for sign-in and can be changed from
            the security portal.
          </p>
        </div>
        <div className="profile-avatar">
          <span>{(fullName || user.email || "?").charAt(0).toUpperCase()}</span>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleUpdate}>
        <div className="form-row">
          <label>
            Full name
            <input
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label>
            Mobile number
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
            Email (sign-in)
            <input type="email" value={user.email} disabled />
          </label>
          <label>
            Preferred language
            <input type="text" value="English" disabled />
          </label>
        </div>

        {status && <p className="auth-status success">{status}</p>}
        {error && <p className="auth-status error">{error}</p>}

        <div className="profile-actions">
          <button className="primary-btn zoom-on-hover" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </button>
          <button className="ghost-btn zoom-on-hover" type="button" onClick={() => onNavigate?.("/")}>
            Back to home
          </button>
        </div>
      </form>
    </div>
  )

  const renderMembershipTab = () => {
    const progressPct = Math.min(
      100,
      Math.round((membershipSnapshot.points / membershipSnapshot.nextRewardAt) * 100),
    )
    return (
      <div className="profile-card">
        <div className="profile-card-head">
          <div>
            <p className="eyebrow">Rewards</p>
            <h3>Membership points</h3>
            <p className="muted">
              Stay active to unlock perks. Every dollar spent adds more credit to your FreshMart
              wallet.
            </p>
          </div>
          <div className="tier-chip">{membershipSnapshot.tier} tier</div>
        </div>

        <div className="membership-summary">
          <div className="membership-stat">
            <span className="label">Current points</span>
            <strong>{membershipSnapshot.points.toLocaleString()}</strong>
          </div>
          <div className="membership-stat">
            <span className="label">Next reward</span>
            <strong>{membershipSnapshot.nextRewardAt.toLocaleString()} pts</strong>
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-bar">
            <span style={{ width: `${progressPct}%` }} />
          </div>
          <p className="muted">{progressPct}% of the next reward unlocked.</p>
        </div>

        <div className="membership-perks">
          <p className="label">Benefits</p>
          <ul>
            {membershipSnapshot.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const renderAddressesTab = () => (
    <div className="profile-card">
      <div className="profile-card-head">
        <div>
          <p className="eyebrow">Logistics</p>
          <h3>Saved delivery address</h3>
          <p className="muted">
            Keep multiple drop-off locations handy for faster checkout. Your default address is used
            for express slots.
          </p>
        </div>
      </div>

      {addressListError && <p className="auth-status error">{addressListError}</p>}
      {addressesLoading ? (
        <p className="muted">Loading addresses...</p>
      ) : (
        <div className="address-list">
          {addresses.map((entry) => (
            <div key={entry.id} className="address-tile">
              <div>
                <p className="tile-title">
                  {entry.label} {entry.is_default && <span className="pill-chip ghost">Default</span>}
                </p>
                <p className="tile-body">{entry.details}</p>
                {entry.instructions && <p className="tile-note">{entry.instructions}</p>}
              </div>

              <div className="address-row-actions">
                {!entry.is_default && (
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => handleMakeDefault(entry.id)}
                    disabled={isAddressActionPending(entry.id, "default")}
                  >
                    {isAddressActionPending(entry.id, "default") ? "Setting..." : "Make default"}
                  </button>
                )}
                <button
                  className="ghost-btn danger"
                  type="button"
                  onClick={() => handleDeleteAddress(entry.id)}
                  disabled={isAddressActionPending(entry.id, "delete")}
                >
                  {isAddressActionPending(entry.id, "delete") ? "Removing..." : "Remove"}
                </button>
              </div>
            </div>
          ))}

          {addresses.length === 0 && (
            <p className="muted">No saved addresses yet. Add one to speed up checkout.</p>
          )}
        </div>
      )}

      <form className="address-form" onSubmit={handleAddAddress}>
        <h4>Add new address</h4>
        <div className="address-field-row">
          <label>
            Label
            <input
              type="text"
              placeholder="Home, Office, Parents"
              value={addressForm.label}
              onChange={(event) => handleAddressInputChange("label", event.target.value)}
            />
          </label>

          <label className="address-checkbox">
            <input
              type="checkbox"
              checked={addressForm.isDefault}
              onChange={(event) => handleAddressInputChange("isDefault", event.target.checked)}
            />
            Set as default
          </label>
        </div>

        <label>
          Full address
          <textarea
            rows={3}
            placeholder="Street, unit, postal code"
            value={addressForm.details}
            onChange={(event) => handleAddressInputChange("details", event.target.value)}
          />
        </label>

        <label>
          Delivery instructions (optional)
          <textarea
            rows={2}
            placeholder="Drop with concierge, call on arrival..."
            value={addressForm.instructions}
            onChange={(event) => handleAddressInputChange("instructions", event.target.value)}
          />
        </label>

        {addressFormStatus && <p className="auth-status success">{addressFormStatus}</p>}
        {addressFormError && <p className="auth-status error">{addressFormError}</p>}

        <div className="address-actions">
          <button className="primary-btn zoom-on-hover" type="submit" disabled={savingAddress}>
            {savingAddress ? "Saving..." : "Save address"}
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
          <h3>Recent orders</h3>
          <p className="muted">Track your latest deliveries and download receipts.</p>
        </div>
        <button className="ghost-btn" onClick={() => onNavigate?.("/history")}>
          View all orders
        </button>
      </div>

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-row">
            <div>
              <p className="tile-title">{order.id}</p>
              <p className="tile-note">{order.date}</p>
            </div>
            <div className="order-meta">
              <span className="order-total">{order.total}</span>
              <span className="status-pill">{order.status}</span>
            </div>
          </div>
        ))}
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

  return (
    <section className="profile-page-panel">
      <div className="profile-header">
        <div>
          <p className="eyebrow">User profile management</p>
          <h2>Welcome back, {fullName || user.email}</h2>
          <p className="muted">
            Manage everything about your FreshMart account from one place - contact details,
            membership, addresses, and orders.
          </p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => onNavigate?.("/")}>
          Return to shopping
        </button>
      </div>

      <div className="profile-dashboard">
        <aside className="profile-sidebar">
          <ul>
            {navTabs.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`sidebar-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="profile-content">{renderContent()}</div>
      </div>
    </section>
  )
}

export default ProfilePage
