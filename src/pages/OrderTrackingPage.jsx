// component: OrderTrackingPage
import { useState, useEffect, useMemo, useCallback } from "react"
import "./OrderTrackingPage.css"
import { getSupabaseClient } from "../lib/supabaseClient"
import {
  FiMapPin,
  FiShoppingBag,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiPackage,
  FiMessageSquare,
  FiEdit3,
  FiArrowRight,
  FiActivity
} from "react-icons/fi"

const preferences = ["Leave at door", "Text on arrival", "No cutlery", "Eco packaging"]

const resolveFallbackAddress = (user) => {
  if (!user) return null
  const meta = user.user_metadata || {}
  if (!meta.address) return null
  return {
    label: meta.address_label || "Preferred",
    details: meta.address,
    instructions: meta.instructions || "",
  }
}

const getStatusStep = (status) => {
  const s = (status || "").toLowerCase()
  if (s.includes("process")) return 1
  if (s.includes("confirmed") || s.includes("preparing")) return 2
  if (s.includes("way") || s.includes("shipped") || s.includes("transit")) return 3
  if (s.includes("near") || s.includes("arriving") || s.includes("delivery")) return 4
  if (s.includes("delivered")) return 5
  return 1
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
    status: order.status || "Processing",
    step: getStatusStep(order.status),
    carrier: order.carrier || "FreshMart logistics",
    address:
      order.delivery_address ||
      order.address ||
      order.default_address ||
      order.address_label ||
      "",
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
          .select("label, details, instructions, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .limit(1)
        if (error) throw error
        if (data && data.length > 0) {
          const entry = data[0]
          setDefaultAddress({
            label: entry.label || resolveFallbackAddress(user)?.label || "Default",
            details: entry.details,
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
      <section className="order-tracking-container">
        <div className="empty-state">
          <FiUser className="empty-icon" />
          <h2>Authentication Required</h2>
          <p>Sign in to view your live orders and delivery status.</p>
          <button
            className="order-btn primary"
            style={{ maxWidth: '200px', margin: '24px auto' }}
            onClick={() => onNavigate?.("/login")}
          >
            Go to Login
          </button>
        </div>
      </section>
    )
  }

  const activeOrders = (Array.isArray(orders) ? orders : [])
    .filter((order) => !order.status || order.status.toLowerCase() !== "delivered")
    .map(normaliseOrder)

  return (
    <div className="order-tracking-container">
      <header className="tracking-header">
        <div className="tracking-header-content">
          <p className="address-label" style={{ background: 'transparent', padding: 0, color: 'var(--tracking-primary)' }}>Tracking Dashboard</p>
          <h1>Your Deliveries</h1>
          <p>Track and manage your active FreshMart orders</p>
        </div>
        <div className="tracking-stats-badge">
          <FiActivity />
          <span>{activeOrders.length} {activeOrders.length === 1 ? 'order' : 'orders'} in progress</span>
        </div>
      </header>

      <div className="tracking-grid-top">
        <article className="tracking-info-card">
          <h3><FiMapPin /> Default Address</h3>
          {addressLoading ? (
            <div className="address-content">
              <p className="muted">Synchronizing address data...</p>
            </div>
          ) : defaultAddress ? (
            <div className="address-content">
              <span className="address-label">{defaultAddress.label}</span>
              <p className="address-details">
                {defaultAddress.details}
              </p>
              {defaultAddress.instructions && (
                <p className="address-notes">
                  " {defaultAddress.instructions} "
                </p>
              )}
            </div>
          ) : (
            <div className="address-content">
              <p className="muted">No primary address set in your profile.</p>
            </div>
          )}
          {!!addressError && (
            <p className="muted" style={{ marginTop: 12 }}>
              Address sync issue: {addressError}
            </p>
          )}
          <button className="card-action-btn">
            <FiEdit3 /> Manage Locations
          </button>
        </article>

        <article className="tracking-info-card">
          <h3><FiCheckCircle /> Delivery Preferences</h3>
          <div className="preferences-chips">
            {preferences.map((pref) => (
              <span key={pref} className="pref-chip">
                {pref}
              </span>
            ))}
          </div>
          <button className="card-action-btn">
            Configure Preferences
          </button>
        </article>
      </div>

      <section className="active-orders-section">
        <div className="section-title-row">
          <h2>Active Deliveries</h2>
          <button className="card-action-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => onNavigate?.("/history")}>
            Full History <FiArrowRight />
          </button>
        </div>

        <div className="orders-list">
          {activeOrders.length === 0 ? (
            <div className="empty-state">
              <FiPackage className="empty-icon" />
              <h3>No Active Orders</h3>
              <p>When you place a new order, you'll see the live progress here.</p>
              <button
                className="order-btn primary"
                style={{ maxWidth: '200px', margin: '24px auto' }}
                onClick={() => onNavigate?.("/")}
              >
                Start Shopping
              </button>
            </div>
          ) : (
            activeOrders.map((order) => {
              const steps = [
                { label: 'Processing', icon: <FiPackage /> },
                { label: 'Confirmed', icon: <FiCheckCircle /> },
                { label: 'On the way', icon: <FiTruck /> },
                { label: 'Arriving', icon: <FiMapPin /> }
              ]

              return (
                <div key={order.id} className="order-tracking-card">
                  <div className="order-card-header">
                    <div className="order-id-group">
                      <h4>{order.title}</h4>
                      <p>#{order.id.replace('#', '')}</p>
                    </div>
                    <span className="carrier-badge">
                      <FiTruck /> {order.carrier}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-meta-info">
                      <div className="meta-item">
                        <span className="meta-item-label">Delivery To</span>
                        <span className="meta-item-value">
                          {order.address || defaultAddress?.details || "Address pending"}
                        </span>
                      </div>
                      <div className="meta-item" style={{ textAlign: 'right' }}>
                        <span className="meta-item-label">Estimated Delivery</span>
                        <span className="meta-item-value">{order.eta}</span>
                      </div>
                    </div>

                    <div className="delivery-progress">
                      <div className="progress-header">
                        <h4>Delivery Status</h4>
                        <span className="status-badge">{order.status}</span>
                      </div>

                      <div className="progress-timeline">
                        {steps.map((step, idx) => {
                          const stepNum = idx + 1
                          const isCompleted = order.step > stepNum
                          const isActive = order.step === stepNum

                          return (
                            <div key={step.label} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                              <div className="step-indicator">
                                <div className="step-dot">
                                  {isCompleted ? <FiCheckCircle /> : step.icon}
                                </div>
                                {idx < steps.length - 1 && <div className="step-line" />}
                              </div>
                              <div className="step-info">
                                <span className="step-title">{step.label}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="order-card-actions">
                      <button className="order-btn primary">
                        <FiMessageSquare /> Contact Support
                      </button>
                      <button className="order-btn secondary">
                        <FiEdit3 /> Edit Instructions
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export default OrderTrackingPage
