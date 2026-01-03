// component: Chatbot (interacts with Groq or optional backend)
import { useCallback, useEffect, useMemo, useState } from "react"
import "./Chatbot.css"
import { FaComments } from "react-icons/fa"

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

const DEFAULT_ASSISTANT_PROMPT =
  "You are Kaki's friendly grocery concierge. Keep replies short, specific, and helpful about store products, stock, and services."

const FALLBACK_HISTORY_WINDOW = 12
const MAX_CONTEXT_PRODUCTS = 20
const MAX_CONTEXT_LOCATIONS = 3
const MAX_PRODUCT_NAV_LINKS = 24

const NAV_DIRECTIVE_REGEX = /\[\[NAV:([^\]\s]+)\]\]/gi

const STATIC_NAV_TARGETS = [
  { label: "Home", path: "/" },
  { label: "Sign up", path: "/signup" },
  { label: "Log in", path: "/login" },
  { label: "Cart", path: "/cart" },
  { label: "Admin Center", path: "/admin" },
  { label: "Supplier Center", path: "/supplier" },
  { label: "Purchase history", path: "/history" },
  { label: "Order tracking", path: "/tracking" },
  { label: "Feedback", path: "/feedback" },
  { label: "About", path: "/about" },
  { label: "Store locations", path: "/locations" },
  { label: "Membership", path: "/membership" },
  { label: "Terms", path: "/terms" },
  { label: "Privacy", path: "/privacy" },
  { label: "Profile", path: "/profile" },
]

const dayLabels = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

const parseNumeric = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const summarizeProduct = (product) => {
  if (!product) return ""
  const name = product.name || product.title || product.slug || "Unnamed item"
  const description =
    (product.desc || product.description || product.summary || "").toString().trim() ||
    "No description provided."
  const category = product.category || product.tag || "General"
  const parsedPrice = parseNumeric(product.price)
  const priceText =
    parsedPrice !== null
      ? `$${parsedPrice.toFixed(2)}`
      : typeof product.price === "string" && product.price.trim()
        ? product.price.trim()
        : ""
  const rawStock =
    product.onlineStock ??
    product.online_stock ??
    product.stock ??
    product.quantity ??
    null
  const stockNumber = parseNumeric(rawStock)
  const stockText = stockNumber !== null ? `${stockNumber}` : "Unknown"
  const stores =
    product.storeAvailability || product.store_availability || product.availability || []
  const storeSummary = Array.isArray(stores)
    ? stores
        .slice(0, MAX_CONTEXT_LOCATIONS)
        .map((entry) => {
          const storeName = entry.storeName || entry.store_name || entry.location || "Store"
          const storeStock =
            parseNumeric(entry.stock ?? entry.qty ?? entry.quantity) ??
            entry.stock ??
            entry.qty ??
            entry.quantity ??
            "?"
          return `${storeName}: ${storeStock}`
        })
        .join(", ")
    : ""
  const pieces = [
    `${name} — ${description}`,
    `Category: ${category}`,
    priceText ? `Price: ${priceText}` : "",
    `Online stock: ${stockText}`,
    storeSummary ? `Stores: ${storeSummary}` : "",
  ]
  return pieces.filter(Boolean).join(". ")
}

const summarizeCatalog = (catalog = []) => {
  if (!Array.isArray(catalog) || catalog.length === 0) return ""
  return catalog
    .filter(Boolean)
    .slice(0, MAX_CONTEXT_PRODUCTS)
    .map((product, index) => `${index + 1}. ${summarizeProduct(product)}`)
    .join("\n")
}

const summarizeLocation = (location) => {
  if (!location) return ""
  const name = location.name || location.title || "FreshMart Location"
  const address = location.address || "Address not listed"
  const phone = location.phone || ""
  const email = location.email || ""
  const hours = location.baseHours || location.base_hours || {}
  const hoursSummary = Object.entries(dayLabels)
    .map(([key, label]) => {
      const entry = hours[key]
      if (!entry) return null
      if (entry.closed) return `${label}: Closed`
      return `${label}: ${entry.open}-${entry.close}`
    })
    .filter(Boolean)
    .join(", ")
  const special =
    location.specialHours || location.special_hours || location.specialHoursNotes || []
  const specialSummary = Array.isArray(special)
    ? special
        .slice(0, 3)
        .map((entry) => {
          if (!entry) return ""
          const label = entry.label || "Special hours"
          if (entry.closed) return `${entry.date}: Closed (${label})`
          return `${entry.date}: ${entry.open}-${entry.close} (${label})`
        })
        .filter(Boolean)
        .join("; ")
    : ""
  const pieces = [
    `${name} — ${address}`,
    phone ? `Phone ${phone}` : "",
    email ? `Email ${email}` : "",
    hoursSummary ? `Hours ${hoursSummary}` : "",
    specialSummary ? `Upcoming ${specialSummary}` : "",
  ]
  return pieces.filter(Boolean).join(". ")
}

const summarizeLocations = (locations = []) => {
  if (!Array.isArray(locations) || locations.length === 0) return ""
  return locations
    .filter(Boolean)
    .slice(0, MAX_CONTEXT_LOCATIONS)
    .map((location, index) => `${index + 1}. ${summarizeLocation(location)}`)
    .join("\n")
}

const GREETING_BY_LANG = {
  en: "Hi there! I'm Kaki's AI Chatbot. Ask me about stock, products, or what's fresh today.",
  zh: "你好！我是 Kaki 的 AI 聊天助手。可随时问我库存、产品或今日优惠。",
  ms: "Hai! Saya Chatbot AI Kaki. Tanyakan tentang stok, produk, atau promosi hari ini.",
  ta: "வணக்கம்! நான் காகியின் AI சொட்மேட். எப்போது வேண்டுமானாலும் பொருட்கள் மற்றும் தற்சமய சலுகைகள் பற்றி கேளுங்கள்.",
}

const initialMessages = [
  {
    id: 1,
    text: GREETING_BY_LANG.en,
    from: "bot",
  },
]

const languages = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "ta", label: "Tamil" },
]

function Chatbot({
  catalog = [],
  storeLocations = [],
  userProfile = null,
  orders = [],
  onNavigate = () => {},
  onAddToCart = () => {},
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [language, setLanguage] = useState(languages[0].code)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const greeting = GREETING_BY_LANG[language] || GREETING_BY_LANG.en
    setMessages((prev) => {
      if (!prev.length || prev[0].from !== "bot") return prev
      const updated = { ...prev[0], text: greeting }
      return [updated, ...prev.slice(1)]
    })
  }, [language])

  // optional backend (keep if you still want a server to proxy / log / enforce policies)
  const backendEndpoint = useMemo(() => import.meta.env.VITE_BACKEND_CHAT_URL || "", [])
  const backendAuthToken = useMemo(() => import.meta.env.VITE_BACKEND_AUTH_TOKEN || "", [])

  // groq only
  const groqSettings = useMemo(() => {
    const apiKey = (import.meta.env.VITE_GROQ_API_KEY || "").trim()
    if (!apiKey) return null
    return {
      apiKey,
      model: (import.meta.env.VITE_GROQ_MODEL || "llama-3.1-8b-instant").trim(),
      instructions:
        (import.meta.env.VITE_GROQ_SYSTEM_PROMPT || "").trim() || DEFAULT_ASSISTANT_PROMPT,
      historyWindow:
        Number(import.meta.env.VITE_GROQ_HISTORY_WINDOW || FALLBACK_HISTORY_WINDOW) ||
        FALLBACK_HISTORY_WINDOW,
    }
  }, [])

  const catalogSummary = useMemo(() => summarizeCatalog(catalog), [catalog])
  const locationSummary = useMemo(() => summarizeLocations(storeLocations), [storeLocations])

  const siteContext = useMemo(() => {
    const sections = []
    if (catalogSummary) sections.push(`Catalog:\n${catalogSummary}`)
    if (locationSummary) sections.push(`Store locations:\n${locationSummary}`)
    return sections.join("\n\n")
  }, [catalogSummary, locationSummary])

  const productNavigationTargets = useMemo(() => {
    if (!Array.isArray(catalog)) return []
    return catalog
      .filter((product) => product && product.slug)
      .slice(0, MAX_PRODUCT_NAV_LINKS)
      .map((product) => ({
        path: `/product/${product.slug}`,
        label: product.name || product.slug,
      }))
  }, [catalog])

  const allowedNavigationSet = useMemo(() => {
    const set = new Set()
    STATIC_NAV_TARGETS.forEach((target) => set.add(target.path))
    productNavigationTargets.forEach((target) => set.add(target.path))
    return set
  }, [productNavigationTargets])

  const navigationSummary = useMemo(() => {
    const staticLines = STATIC_NAV_TARGETS.map((target) => `- ${target.label}: ${target.path}`)
    const productLines = productNavigationTargets.map((target) => `- ${target.label}: ${target.path}`)
    return [...staticLines, ...productLines].join("\n")
  }, [productNavigationTargets])

  const stripNavigationDirectives = useCallback((text) => {
    if (typeof text !== "string") return { cleaned: "", directives: [] }
    const directives = []
    const cleaned = text.replace(NAV_DIRECTIVE_REGEX, (_, rawPath) => {
      const normalized = (rawPath || "").trim()
      if (normalized) {
        const ensured = normalized.startsWith("/") ? normalized : `/${normalized}`
        directives.push(ensured)
      }
      return ""
    })
    return { cleaned: cleaned.trim(), directives }
  }, [])

  const safeNavigate = useCallback(
    (rawPath) => {
      if (!rawPath) return
      const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
      if (!allowedNavigationSet.has(normalized)) return
      if (typeof onNavigate === "function") onNavigate(normalized)
    },
    [allowedNavigationSet, onNavigate],
  )

  const normalizeCommandText = useCallback((value) => {
    if (!value) return ""
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }, [])

  const findProductByName = useCallback(
    (hint) => {
      const normalizedHint = normalizeCommandText(hint)
      if (!normalizedHint) return null
      if (!Array.isArray(catalog)) return null

      const slugMatch = catalog.find(
        (product) => (product.slug || "").toLowerCase() === normalizedHint,
      )
      if (slugMatch) return slugMatch

      const nameMatch = catalog.find((product) =>
        (product.name || product.title || "").toLowerCase().includes(normalizedHint),
      )
      if (nameMatch) return nameMatch

      return catalog.find((product) =>
        (product.brand || product.tag || "").toLowerCase().includes(normalizedHint),
      )
    },
    [catalog, normalizeCommandText],
  )

  const handleAddToCartIntent = useCallback(
    (text) => {
      const match = text.match(/add\s+(\d+)?\s*(?:x|pcs?|pieces?)?\s*(.+?)\s+to\s+(?:my\s+)?cart/i)
      if (!match) return null
      const quantity = match[1] ? Math.max(1, Number(match[1])) : 1
      const productHint = match[2].trim()
      if (!productHint) return null
      const product = findProductByName(productHint)
      if (!product) {
        return `I couldn't find "${productHint}" in the catalog. Could you try another name?`
      }
      onAddToCart?.(product, quantity)
      return `Added ${quantity} × ${product.name || product.slug} to your cart.`
    },
    [findProductByName, onAddToCart],
  )

  const handleShowProductIntent = useCallback(
    (text) => {
      const match = text.match(/(?:show|view|open|find|tell me about)\s+(?:me\s+)?(.+?)(?:$|\?)/i)
      if (!match) return null
      const productHint = match[1].trim()
      const product = findProductByName(productHint)
      if (!product || !product.slug) return null
      safeNavigate(`/product/${product.slug}`)
      return `Opening ${product.name || product.slug} for you.`
    },
    [findProductByName, safeNavigate],
  )

  const handleSpecialIntent = useCallback(
    (text) => {
      if (!text) return null
      const normalized = normalizeCommandText(text)

      if (/(purchase history|order history|past orders|my orders)/.test(normalized)) {
        safeNavigate("/history")
        return "Taking you to your purchase history."
      }

      if (/(where.*order|order status|track.*order)/.test(normalized)) {
        safeNavigate("/tracking")
        const latest = Array.isArray(orders) ? orders[0] : null
        const orderSummary = latest
          ? `Your most recent order (${latest.id || "latest"}) is ${latest.status || "processing"}.`
          : "I don't see any orders yet."
        return `${orderSummary} I'll open the tracking page for you.`
      }

      if (/(membership|tier|loyalty|status)/.test(normalized)) {
        const tier = userProfile?.membership_tier || "FreshMart Member"
        const points = userProfile?.membership_points ?? 0
        return `You're currently on the ${tier} tier with ${points} point${points === 1 ? "" : "s"}.`
      }

      const addReply = handleAddToCartIntent(text)
      if (addReply) return addReply

      const showReply = handleShowProductIntent(text)
      if (showReply) return showReply

      return null
    },
    [
      handleAddToCartIntent,
      handleShowProductIntent,
      normalizeCommandText,
      orders,
      safeNavigate,
      userProfile,
    ],
  )

  const createGroundedPrompt = useCallback(
    (promptText) => {
      const basePrompt = (promptText || DEFAULT_ASSISTANT_PROMPT).trim() || DEFAULT_ASSISTANT_PROMPT
      const blocks = [basePrompt]

      if (siteContext) {
        blocks.push(`FreshMart reference data:\n${siteContext}`)
      }

      if (navigationSummary) {
        blocks.push(
          `Allowed navigation commands:\n${navigationSummary}\nWhen the shopper asks to open any section above, confirm in your reply and append [[NAV:/path]] using the exact path shown. Do not invent routes or slugs, and use at most one NAV token per response.`,
        )
      }

      blocks.push(
        'If the answer is not covered in the reference data, reply with: "I\'m not sure about that. Please check with a FreshMart associate."',
      )

      return blocks.filter(Boolean).join("\n\n")
    },
    [siteContext, navigationSummary],
  )

  const sendViaGroq = useCallback(
    async (conversationHistory) => {
      if (!groqSettings) throw new Error("Groq is not configured")

      const limitedHistory = conversationHistory.slice(-groqSettings.historyWindow)

      const messagesPayload = []
      const instructionBlock = createGroundedPrompt(groqSettings.instructions)
      if (instructionBlock) {
        messagesPayload.push({ role: "system", content: instructionBlock })
      }

      limitedHistory.forEach((message) => {
        messagesPayload.push({
          role: message.from === "user" ? "user" : "assistant",
          content: message.text,
        })
      })

      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqSettings.apiKey}`,
        },
        body: JSON.stringify({
          model: groqSettings.model,
          messages: messagesPayload,
          temperature: 0.6,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.text()
        throw new Error(`Groq replied with ${response.status}: ${errorPayload || "No response body"}`)
      }

      const payload = await response.json()
      const replyText =
        payload?.choices
          ?.map((choice) => choice?.message?.content || "")
          .find((entry) => entry && entry.trim())
          ?.trim() || ""

      const { cleaned, directives } = stripNavigationDirectives(replyText)
      directives.forEach(safeNavigate)

      return cleaned || replyText || "I wasn't able to get a response from Groq."
    },
    [groqSettings, createGroundedPrompt, safeNavigate, stripNavigationDirectives],
  )

  const sendMessage = async () => {
    if (!draft.trim()) return
    if (isSending) return

    setError("")

    const trimmed = draft.trim()
    const userMessage = { id: Date.now(), text: trimmed, from: "user" }
    setMessages((prev) => [...prev, userMessage])
    setDraft("")

    try {
      setIsSending(true)
      const intentReply = handleSpecialIntent(trimmed)
      if (intentReply) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: intentReply, from: "bot" },
        ])
        return
      }

      // if you set a backend endpoint, we call it; otherwise we go direct to groq
      const useBackend = Boolean(backendEndpoint)

      if (!useBackend) {
        if (!groqSettings) throw new Error("Groq API key is missing (VITE_GROQ_API_KEY)")
        const history = [...messages, userMessage]
        const replyText = await sendViaGroq(history)
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: replyText, from: "bot" },
        ])
        return
      }

      // backend flow (optional)
      const response = await fetch(backendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(backendAuthToken ? { Authorization: `Bearer ${backendAuthToken}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          language,
          sender_id: "freshmart-web-user",
        }),
      })

      if (!response.ok) throw new Error(`Chat service replied with ${response.status}`)

      const payload = await response.json()
      const replyText = payload?.reply || "I'm here, but I didn't receive a reply from the assistant."

      const { cleaned, directives } = stripNavigationDirectives(replyText)
      directives.forEach(safeNavigate)

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: cleaned || replyText, from: "bot" },
      ])
    } catch (err) {
      console.error(err)
      setError("Trouble reaching the chatbot service. Please try again.")
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "I couldn't reach the assistant. Check your connection or try again shortly.",
          from: "bot",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <button className="chatbot-toggle" onClick={() => setOpen(!open)}>
        <FaComments />
      </button>

      {open && (
        <div className="chatbot-box fade-in">
          <h4>AI Chatbot</h4>

          {/* keep language selector if your backend uses it; groq direct mode doesn't need it,
              but it doesn't hurt to keep it for future */}
          <div className="language-row">
            <label htmlFor="language-select">Language</label>
            <select
              id="language-select"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="messages">
            {messages.map((message) => (
              <p key={message.id} className={message.from}>
                {message.text}
              </p>
            ))}
            {isSending && <p className="bot subtle">Assistant is thinking...</p>}
          </div>

          {error && <p className="error-banner">{error}</p>}

          <div className="chat-input-wrapper">
            <input
              className="chat-input"
              placeholder="Type any question..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="send-btn" onClick={sendMessage} disabled={isSending}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot
