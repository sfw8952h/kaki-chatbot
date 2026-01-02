// component: OrderTrackingPage
import { useState, useEffect, useMemo, useCallback } from "react"
import "./Pages.css"
import { getSupabaseClient } from "../lib/supabaseClient"

const preferences = ["Leave at door", "Text on arrival", "No cutlery", "Eco packaging"]

const resolveFallbackAddress = (user) => {
  if (!user) return null
  const meta = user.user_metadata || {}
  if (!meta.address) return null
  return {
    label: meta.address_label || "Preferred",
    details: meta.address,
    city: meta.city || "",
    postal: meta.postal_code || "",
    instructions: meta.instructions || "",
  }
}

const normaliseOrder = (order) => {
  const items = order.order_items ?? order.items ?? []
  const summary = items
    .slice(0, 3)
    .map((item) => `${item.quantity ?? 1}× ${item.product_name || item.name || "item"}`)
    .join(", ")

  const eta =
    order.delivery_eta ||
    order.eta ||
    (order.placed_at ? `Placed ${new Date(order.placed_at).toLocaleString("en-US", { dateStyle: "medium" })}` : "ETA unavailable")

  return {
    id: order.id || order.order_number || `#${Math.random().toString(36).slice(2, 6)}`,
    title: summary || order.title || "FreshMart order",
    eta,
    step: order.status || "Processing",
    carrier: order.carrier || "FreshMart logistics",
    address:
      order.delivery_address ||
      order.address ||
      order.default_address ||
      order.address_label ||
      "Address pending",
  }
}

function OrderTrackingPage({ user, onNavigate, orders = [] }) {
  const supabase = useMemo(() => {
    try {
      return getSupabaseClient()
    } catch (err) {
      console.error("Order tracking supabase init failure:", err)
      return null
    }
  }, [])

  const [defaultAddress, setDefaultAddress] = useState(resolveFallbackAddress(user))
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState("")

  const ensureSession = useCallback(async () => {
    if (!supabase) throw new Error("Supabase client is unavailable.")
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (data?.session) return data.session
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr) throw refreshErr
    if (refreshed?.session) return refreshed.session
    throw new Error("Session expired. Please log in again.")
  }, [supabase])

  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!supabase || !user) return
      setAddressError("")
      setAddressLoading(true)
      try {
        await ensureSession()
        const { data, error } = await supabase
          .from("addresses")
          .select("label, details, instructions, city, postal_code, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .limit(1)
        if (error) throw error
        if (data && data.length > 0) {
          const entry = data[0]
          setDefaultAddress({
            label: entry.label || resolveFallbackAddress(user)?.label || "Default",
            details: entry.details,
            city: entry.city || "",
            postal: entry.postal_code || "",
            instructions: entry.instructions || "",
          })
        } else {
          setDefaultAddress(resolveFallbackAddress(user))
        }
      } catch (err) {
        console.error("Default address failed:", err)
        setAddressError(err.message || "Unable to load default address.")
      } finally {
        setAddressLoading(false)
      }
    }

    loadDefaultAddress()
  }, [supabase, user, ensureSession])

  if (!user) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Tracking</p>
        <h2>Login required</h2>
        <p className="guest-detail">Sign in to view your active deliveries and update instructions.</p>
        <button className="primary-btn" type="button" onClick={() => onNavigate?.("/login")}>
          Go to login
        </button>
      </section>
    )
  }

  const activeOrders = (Array.isArray(orders) ? orders : [])
    .filter((order) => !order.status || order.status.toLowerCase() !== "delivered")
    .map(normaliseOrder)

  return (
    <section className="page-panel profile-shell">
      <header className="profile-head">
        <div>
          <p className="eyebrow">Delivery & tracking</p>
          <h2>Manage deliveries with your profile</h2>
          <p className="guest-detail">
            Saved addresses and delivery preferences are shared with the chatbot for faster checkout and updates.
          </p>
        </div>
        <div className="pill-chip">Live updates</div>
      </header>

      <div className="tracking-grid">
        <article className="card-slab">
          <p className="dash-label">Delivery preferences</p>
          <div className="chip-row">
            {preferences.map((pref) => (
              <span key={pref} className="pill pill-soft">
                {pref}
              </span>
            ))}
          </div>
          <button className="ghost-btn" type="button">
            Edit preferences
          </button>
        </article>

        <article className="card-slab">
          <p className="dash-label">Default address</p>
          {addressLoading ? (
            <p className="muted">Loading address...</p>
          ) : defaultAddress ? (
            <>
              <h4>{defaultAddress.label}</h4>
              <p className="muted">{defaultAddress.details}</p>
              {defaultAddress.city && <p className="muted">{defaultAddress.city}</p>}
              {defaultAddress.postal && <p className="muted">{defaultAddress.postal}</p>}
              {defaultAddress.instructions && <p className="muted">Notes: {defaultAddress.instructions}</p>}
            </>
          ) : (
            <p className="muted">No default address saved yet.</p>
          )}
          {addressError && <p className="auth-status error">{addressError}</p>}
          <button className="ghost-btn" type="button">
            Switch address
          </button>
        </article>
      </div>

      <article className="card-slab">
        <div className="board-top">
          <div>
            <p className="dash-label">Active orders</p>
            <strong>Live tracking</strong>
            <p className="guest-detail">Real-time delivery status with profile-linked addresses.</p>
          </div>
          <button className="primary-btn" type="button" onClick={() => onNavigate?.("/history")}>
            View full history
          </button>
        </div>

        <div className="tracking-list">
          {activeOrders.length === 0 ? (
            <p className="muted">You have no active orders right now.</p>
          ) : (
            activeOrders.map((order) => (
              <div key={order.id} className="tracking-card">
                <div className="tracking-head">
                  <div>
                    <p className="dash-label">{order.id}</p>
                    <strong>{order.title}</strong>
                    <p className="muted">{order.address}</p>
                  </div>
                  <span className="pill pill-neutral">{order.carrier}</span>
                </div>
                <div className="tracking-meta">
                  <span className="pill pill-soft">{order.step}</span>
                  <span className="pill pill-soft">{order.eta}</span>
                </div>
                <div className="action-badges">
                  <button className="badge-btn primary">Contact rider</button>
                  <button className="badge-btn">Change instructions</button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  )
}

export default OrderTrackingPage
