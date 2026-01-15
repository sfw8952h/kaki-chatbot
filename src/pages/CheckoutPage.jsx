// component: CheckoutPage
import { useEffect, useMemo, useState } from "react"
import "./CheckoutPage.css"
import { QRCodeCanvas } from "qrcode.react"

const SHIPPING_FEE = 4.9

function CheckoutPage({
  user,
  profileName,
  onNavigate,
  items = [],
  subtotal = 0,
  onCheckout, // async place order (also send email inside your onCheckout logic)
}) {
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("") // "" | card | paynow | grabpay | applepay

  // Card demo fields
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const isEmpty = (items || []).length === 0
  const [payNowRef] = useState(() => `KAKI-${Date.now().toString().slice(-6)}`)

  useEffect(() => {
    if (!user) onNavigate?.("/login")
  }, [user, onNavigate])

  // Reset state when switching payment method
  useEffect(() => {
    setError("")
    setSuccess(false)
  }, [paymentMethod])

  const computedSubtotal = useMemo(() => Number(subtotal || 0), [subtotal])
  const shipping = useMemo(() => (isEmpty ? 0 : SHIPPING_FEE), [isEmpty])
  const total = useMemo(() => computedSubtotal + shipping, [computedSubtotal, shipping])

  // PayNow demo QR payload (not a real SGQR banking string)
  const payNowQrValue = useMemo(() => {
    return JSON.stringify({
      type: "PAYNOW_DEMO",
      merchant: "Kaki",
      currency: "SGD",
      amount: Number(total || 0).toFixed(2),
      reference: payNowRef,
    })
  }, [total, payNowRef])

  // Helpers for demo formatting
  const formatCardNumber = (value) =>
    String(value || "")
      .replace(/[^\d]/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim()

  const formatExpiry = (value) => {
    const digits = String(value || "").replace(/[^\d]/g, "").slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const isCardDetailsValid = useMemo(() => {
    if (paymentMethod !== "card") return true
    const clean = cardNumber.replace(/\s/g, "")
    const expiryOk = /^\d{2}\/\d{2}$/.test(cardExpiry)
    const cvvOk = /^\d{3,4}$/.test(cardCvv)
    return clean.length === 16 && expiryOk && cvvOk
  }, [paymentMethod, cardNumber, cardExpiry, cardCvv])

  // ✅ Must select payment method first. Also must have address. Card needs valid fields.
  const canConfirmAndPay = useMemo(() => {
    if (!user) return false
    if (isEmpty) return false
    if (!address.trim()) return false
    if (!paymentMethod) return false
    if (paymentMethod === "card" && !isCardDetailsValid) return false
    return true
  }, [user, isEmpty, address, paymentMethod, isCardDetailsValid])

  const handleConfirmAndPay = async () => {
    if (!canConfirmAndPay || saving || success) return
    setSaving(true)
    setError("")

    try {
      // Simulate payment processing delay
      await new Promise((r) => setTimeout(r, 700))

      const payloadItems = (items || []).map((item) => ({
        slug: item.slug,
        product_id: item.product_id ?? null,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))

      const missing = payloadItems.find((x) => !x.product_id)
      if (missing) {
        throw new Error("Some items are missing product_id. Please refresh and try again.")
      }

      // ✅ After payment success -> order automatically placed
      await onCheckout?.({
        items: payloadItems,
        total,
        address: address.trim(),
        notes: notes.trim(),
        payment_method: paymentMethod,
        payment_confirmed: true,
        paynow_reference: paymentMethod === "paynow" ? payNowRef : null,
      })

      setSuccess(true)
      setShowConfirmation(true) // ✅ show popup instead of instant redirect
    } catch (e) {
      console.error(e)
      setError(e?.message || "Payment failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-panel checkout-page">
      <div className="checkout-head">
        <div>
          <p className="eyebrow">Secure checkout</p>
          <h2>Confirm delivery & payment</h2>
          <p className="muted">Your details are used only for fulfilling this order.</p>
        </div>

        <button className="ghost-btn" type="button" onClick={() => onNavigate?.("/cart")}>
          Back to cart
        </button>
      </div>

      <div className="checkout-layout">
        {/* LEFT */}
        <div className="checkout-main">
          <div className="checkout-card">
            <div className="checkout-signedin">
              <p className="muted">Signed in as</p>
              <p className="checkout-user">{profileName || user?.email}</p>
            </div>

            <div className="field">
              <label className="field-label">Delivery address</label>
              <textarea
                className="field-input field-textarea"
                placeholder="Block / Street / Unit number, Singapore"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="field">
              <label className="field-label">Add optional delivery notes</label>
              <input
                className="field-input"
                placeholder="e.g. leave at guardhouse, call on arrival"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Payment */}
          <div className="checkout-card">
            <div className="checkout-section-title">
              <h3>Payment method</h3>
              <span className="pill pill-soft">Encrypted</span>
            </div>

            <div className="pay-grid">
              <button
                type="button"
                className={`pay-option ${paymentMethod === "card" ? "is-active" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                <div className="pay-top">
                  <strong>Card</strong>
                  <span className="pay-badges">
                    <span className="payment-pill">Visa</span>
                    <span className="payment-pill">Mastercard</span>
                  </span>
                </div>
                <p className="muted">Pay with debit/credit card.</p>
              </button>

              <button
                type="button"
                className={`pay-option ${paymentMethod === "paynow" ? "is-active" : ""}`}
                onClick={() => setPaymentMethod("paynow")}
              >
                <div className="pay-top">
                  <strong>PayNow</strong>
                  <span className="payment-pill">SG</span>
                </div>
                <p className="muted">Scan QR with your banking app.</p>
              </button>

              <button
                type="button"
                className={`pay-option ${paymentMethod === "grabpay" ? "is-active" : ""}`}
                onClick={() => setPaymentMethod("grabpay")}
              >
                <div className="pay-top">
                  <strong>GrabPay</strong>
                  <span className="payment-pill">Wallet</span>
                </div>
                <p className="muted">Fast checkout with GrabPay.</p>
              </button>

              <button
                type="button"
                className={`pay-option ${paymentMethod === "applepay" ? "is-active" : ""}`}
                onClick={() => setPaymentMethod("applepay")}
              >
                <div className="pay-top">
                  <strong>Apple Pay</strong>
                  <span className="payment-pill">Tap</span>
                </div>
                <p className="muted">Pay quickly using Apple Pay.</p>
              </button>
            </div>

            {/* Method details */}
            {paymentMethod === "card" && (
              <div className="card-mini">
                <div className="field">
                  <label className="field-label">Card number</label>
                  <input
                    className="field-input"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  />
                </div>
                <div className="card-row">
                  <div className="field">
                    <label className="field-label">Expiry</label>
                    <input
                      className="field-input"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">CVV</label>
                    <input
                      className="field-input"
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) =>
                        setCardCvv(String(e.target.value || "").replace(/[^\d]/g, "").slice(0, 4))
                      }
                    />
                  </div>
                </div>
                <p className="muted small">
                  Demo flow — confirming payment will automatically place the order.
                </p>
              </div>
            )}

            {paymentMethod === "paynow" && (
              <div className="card-mini">
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: 14,
                      padding: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <QRCodeCanvas value={payNowQrValue} size={170} includeMargin />
                  </div>

                  <div style={{ minWidth: 240 }}>
                    <p className="muted small" style={{ marginBottom: 6 }}>
                      Scan with your bank app (demo)
                    </p>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <p className="muted small" style={{ marginBottom: 2 }}>
                          Amount
                        </p>
                        <strong>${Number(total || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <p className="muted small" style={{ marginBottom: 2 }}>
                          Reference
                        </p>
                        <strong>{payNowRef}</strong>
                      </div>
                      <p className="muted small" style={{ marginTop: 4 }}>
                        After you’ve paid, click <strong>Place Order</strong> to place your order.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "grabpay" && (
              <div className="card-mini">
                <p className="muted small">
                  Demo flow — confirming payment will automatically place the order.
                </p>
              </div>
            )}

            {paymentMethod === "applepay" && (
              <div className="card-mini">
                <p className="muted small">
                  Demo flow — confirming payment will automatically place the order.
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="checkout-card">
            <div className="checkout-section-title">
              <h3>Items ({items.length})</h3>
              <button className="ghost-btn" type="button" onClick={() => onNavigate?.("/")}>
                Add more
              </button>
            </div>

            <div className="checkout-items">
              {items.map((item) => (
                <div className="checkout-item" key={item.slug}>
                  <div className="checkout-item-left">
                    {item.thumbnail && (
                      <img className="checkout-thumb" src={item.thumbnail} alt={item.name} />
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <p className="muted">
                        ${Number(item.price || 0).toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <strong>${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="checkout-summary">
          <div className="checkout-summary-card">
            <h3>Order summary</h3>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>${computedSubtotal.toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <strong>${shipping.toFixed(2)}</strong>
            </div>

            <div className="summary-divider" />

            <div className="summary-row summary-total">
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>

            {/* ✅ ONE REAL-WORLD BUTTON: confirm payment -> auto place order */}
            <button
              className="primary-btn checkout-pay-btn"
              type="button"
              onClick={handleConfirmAndPay}
              disabled={!canConfirmAndPay || saving || success}
              title={
                !paymentMethod
                  ? "Please select a payment method"
                  : !address.trim()
                  ? "Please enter delivery address"
                  : paymentMethod === "card" && !isCardDetailsValid
                  ? "Please enter valid card details"
                  : ""
              }
            >
              {saving ? "Processing..." : success ? "Order placed!" : "Place Order"}
            </button>

            {!paymentMethod && (
              <p className="checkout-hint">Please select a payment method to continue.</p>
            )}

            {!address.trim() && (
              <p className="checkout-hint">Please enter a delivery address to continue.</p>
            )}

            {paymentMethod === "card" && !isCardDetailsValid && (
              <p className="checkout-hint">Please enter valid card details to continue.</p>
            )}

            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">Success! Redirecting to your orders…</p>}
          </div>
        </aside>

        {showConfirmation && (
          <div className="confirm-overlay">
            <div className="confirm-popup confirm-popup--new">
              <div className="confirm-icon-wrap">
                <span className="confirm-icon confirm-check">✓</span>
              </div>

              <h3 className="confirm-title">Order confirmed</h3>

              <p className="confirm-text">
                We received your order. You’ll get a confirmation email at{" "}
                <strong>{user?.email}</strong>.
              </p>

              <div className="confirm-actions">
                <button className="outline-btn" onClick={() => onNavigate?.("/history")}>
                  View order details
                </button>
                <button className="primary-btn" onClick={() => onNavigate?.("/")}>
                  Continue shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default CheckoutPage