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

// Greeting-only rule
const GREETING_ONLY_REGEX =
  /^(hi|hello|hey|yo|hiya|good morning|good afternoon|good evening|gm|ga|ge)$/i

// Contact agent / WhatsApp / Email
const CONTACT_AGENT_REGEX =
  /(agent|human|support|customer\s*service|customer\s*support|help\s*desk|operator|representative|staff|contact|whatsapp|phone|call|hotline|email|talk\s*to\s*someone|speak\s*to\s*someone)/i

// Supplier intent
const SUPPLIER_INTENT_REGEX =
  /(supplier|vendor|seller|restock|inventory|stock\s*update|supply|upload\s*product|product\s*listing)/i

// Sourcing intent
const SOURCING_INTENT_REGEX =
  /(source|sourcing|bulk|wholesale|for\s+event|for\s+party|for\s+office|for\s+catering|for\s+school|large\s+order|quotation|quote)/i

const CHAT_SESSION_KEY = "kaki_chat_session_v1"

const loadChatFromSession = () => {
  try {
    const raw = sessionStorage.getItem(CHAT_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const saveChatToSession = (messages) => {
  try {
    sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(messages))
  } catch {}
}

const RECIPE_IDEAS = [
  {
    keywords: ["soup", "broth", "stew", "ramen"],
    title: "Hearty vegetable soup",
    description: "A warming soup with aromatics and tender vegetables.",
    ingredients: ["Onion", "Carrots", "Garlic", "Celery", "Tomatoes", "Vegetable stock", "Fresh herbs"],
  },
  {
    keywords: ["stir fry", "stir-fry", "fried rice", "noodles"],
    title: "Quick stir-fry",
    description: "Fast, high-heat veggies with a savory sauce.",
    ingredients: ["Garlic", "Ginger", "Mixed vegetables", "Soy sauce", "Sesame oil", "Rice or noodles"],
  },
  {
    keywords: ["salad", "greens", "grain bowl"],
    title: "Fresh salad bowl",
    description: "Crisp greens with bright, crunchy toppings.",
    ingredients: ["Mixed greens", "Cucumber", "Tomatoes", "Avocado", "Lemon", "Olive oil"],
  },
  {
    keywords: ["curry", "curry rice"],
    title: "Simple curry",
    description: "Comforting curry with a creamy, spiced base.",
    ingredients: ["Onion", "Garlic", "Curry paste", "Coconut milk", "Protein or vegetables", "Rice"],
  },
]

const STATIC_NAV_TARGETS = [
  { label: "Home", path: "/" },
  { label: "Sign up", path: "/signup" },
  { label: "Log in", path: "/login" },
  { label: "Supplier login", path: "/supplier-login" },
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
  { label: "Recipes", path: "/recipes" },
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

const GREETING_BY_LANG = {
  en: "Hi there! I'm Kaki's AI Chatbot. Ask me about stock, products, or what's fresh today.",
  zh: "你好！我是 Kaki 的 AI 聊天助手。可随时问我库存、产品或今日优惠。",
  ms: "Hai! Saya Chatbot AI Kaki. Tanyakan tentang stok, produk, atau promosi hari ini.",
  ta: "வணக்கம்! நான் காகியின் AI சொட்மேட். எப்போது வேண்டுமானாலும் பொருட்கள் மற்றும் தற்சமய சலுகைகள் பற்றி கேளுங்கள்.",
}

const initialMessages = [{ id: 1, text: GREETING_BY_LANG.en, from: "bot" }]

const languages = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "ta", label: "Tamil" },
]

// Variants
const MILO_VARIANTS = [
  { label: "Milo 3-in-1 (sachet)", keywords: ["3 in 1", "3-in-1", "3in1", "sachet"] },
  { label: "Milo Kosong (no sugar)", keywords: ["kosong", "no sugar", "less sugar", "sugar free"] },
  { label: "Milo Tin / Powder", keywords: ["tin", "powder", "original"] },
  { label: "Milo UHT / Ready-to-drink", keywords: ["uht", "ready", "bottle", "pack", "drink"] },
]

const CARROT_VARIANTS = [
  { label: "Local carrot (standard)", keywords: ["local", "standard"] },
  { label: "Imported carrot — Australia", keywords: ["australia", "aus"] },
  { label: "Imported carrot — China", keywords: ["china"] },
  { label: "Imported carrot — USA", keywords: ["us", "usa", "america"] },
  { label: "Baby carrots", keywords: ["baby"] },
  { label: "Organic carrots", keywords: ["organic"] },
]

// WhatsApp helpers
const normalizePhoneForWhatsApp = (value = "") => String(value).replace(/[^\d]/g, "")
const isJustNumber = (text = "") => /^\s*\d+\s*$/.test(String(text))
const isLikelyNewIntentText = (text = "") => {
  const t = String(text).trim().toLowerCase()
  if (!t) return false
  if (/^\d+$/.test(t)) return false
  return /(want|wnt|need|buy|looking|find|show|add|cart|coffee|tissue|milo|carrot|price|stock|login|signup|history|track|nearest|closest|nearby|outlet|location)/i.test(
    t,
  )
}

const NEAREST_LOCATION_REGEX =
  /(nearest|closest|near me|nearby|nearest outlet|closest outlet|nearest store|closest store|which branch|which outlet|nearest location)/i

const SG_AREA_COORDS = [
  { key: "jurong east", lat: 1.3328, lng: 103.7436 },
  { key: "jurong west", lat: 1.3400, lng: 103.7070 },
  { key: "tampines", lat: 1.3496, lng: 103.9568 },
  { key: "pasir ris", lat: 1.3733, lng: 103.9493 },
  { key: "bedok", lat: 1.3240, lng: 103.9302 },
  { key: "punggol", lat: 1.4052, lng: 103.9023 },
  { key: "sengkang", lat: 1.3917, lng: 103.8950 },
  { key: "hougang", lat: 1.3713, lng: 103.8927 },
  { key: "woodlands", lat: 1.4360, lng: 103.7865 },
  { key: "yishun", lat: 1.4293, lng: 103.8350 },
  { key: "bishan", lat: 1.3508, lng: 103.8485 },
  { key: "toa payoh", lat: 1.3320, lng: 103.8470 },
  { key: "ang mo kio", lat: 1.3691, lng: 103.8454 },
  { key: "clementi", lat: 1.3151, lng: 103.7649 },
  { key: "bukit batok", lat: 1.3490, lng: 103.7490 },
  { key: "bukit panjang", lat: 1.3770, lng: 103.7710 },
  { key: "orchard", lat: 1.3048, lng: 103.8318 },
  { key: "somerset", lat: 1.3006, lng: 103.8384 },
  { key: "bugis", lat: 1.3009, lng: 103.8556 },
  { key: "city hall", lat: 1.2932, lng: 103.8520 },
  { key: "marina bay", lat: 1.2821, lng: 103.8589 },
]

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(x))
}

const extractUserCoordsFromText = (text) => {
  const t = String(text || "").toLowerCase()

  // longest first so "jurong east" matches before "jurong"
  const sorted = [...SG_AREA_COORDS].sort((a, b) => b.key.length - a.key.length)
  const hit = sorted.find((x) => t.includes(x.key))
  if (!hit) return null
  return { lat: hit.lat, lng: hit.lng, label: hit.key }
}

const ensureStoreCoords = (storeLocations = []) => {
  return (Array.isArray(storeLocations) ? storeLocations : []).map((loc) => {
    const lat = Number(loc?.lat)
    const lng = Number(loc?.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { ...loc, lat, lng }

    const hay = `${loc?.name || ""} ${loc?.address || ""}`.toLowerCase()
    const guess = SG_AREA_COORDS.find((x) => hay.includes(x.key))
    if (!guess) return loc

    return { ...loc, lat: guess.lat, lng: guess.lng, approx: true }
  })
}

const findNearestStore = (userCoords, locationsWithCoords) => {
  const valid = (locationsWithCoords || []).filter(
    (l) => Number.isFinite(Number(l?.lat)) && Number.isFinite(Number(l?.lng)),
  )
  if (!valid.length) return null

  let best = null
  for (const loc of valid) {
    const dist = haversineKm(userCoords, { lat: Number(loc.lat), lng: Number(loc.lng) })
    if (!best || dist < best.distanceKm) best = { loc, distanceKm: dist }
  }
  return best
}

/* ======================= */

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
  const rawStock = product.onlineStock ?? product.online_stock ?? product.stock ?? product.quantity ?? null
  const stockNumber = parseNumeric(rawStock)
  const stockText = stockNumber !== null ? `${stockNumber}` : "Unknown"
  const stores = product.storeAvailability || product.store_availability || product.availability || []
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

  return [
    `${name} — ${description}`,
    `Category: ${category}`,
    priceText ? `Price: ${priceText}` : "",
    `Online stock: ${stockText}`,
    storeSummary ? `Stores: ${storeSummary}` : "",
  ].filter(Boolean).join(". ")
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
  const name = location.name || location.title || "Kaki Location"
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
  const special = location.specialHours || location.special_hours || location.specialHoursNotes || []
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
  return [
    `${name} — ${address}`,
    phone ? `Phone ${phone}` : "",
    email ? `Email ${email}` : "",
    hoursSummary ? `Hours ${hoursSummary}` : "",
    specialSummary ? `Upcoming ${specialSummary}` : "",
  ].filter(Boolean).join(". ")
}

const summarizeLocations = (locations = []) => {
  if (!Array.isArray(locations) || locations.length === 0) return ""
  return locations
    .filter(Boolean)
    .slice(0, MAX_CONTEXT_LOCATIONS)
    .map((location, index) => `${index + 1}. ${summarizeLocation(location)}`)
    .join("\n")
}

// ---- Local cart fallback (so "Add to cart" really works even without your cart wiring) ----
const CART_STORAGE_KEY = "kaki_cart"

const readLocalCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeLocalCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

const addToLocalCart = (product, qty) => {
  const cart = readLocalCart()
  const id = product?.id ?? product?._id ?? product?.slug ?? product?.name ?? String(Date.now())
  const existing = cart.find((x) => x.id === id)
  if (existing) existing.quantity += qty
  else cart.push({ id, product, quantity: qty })
  writeLocalCart(cart)
  return cart
}

const notifyCartChanged = () => {
  try {
    window.dispatchEvent(new CustomEvent("kaki:cart-changed", { detail: { source: "chatbot" } }))
  } catch {}
}

function Chatbot({
  catalog = [],
  storeLocations = [],
  userProfile = null,
  orders = [],
  onNavigate = () => {},
  onAddToCart = null, // IMPORTANT: may be null if not wired
  onRecipeSuggestion = () => {},
  onSupplierAction = () => {},
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    const saved = loadChatFromSession()
    return saved && saved.length ? saved : initialMessages
  })
  const [draft, setDraft] = useState("")
  const [language, setLanguage] = useState(languages[0].code)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [pendingCartChoice, setPendingCartChoice] = useState(null)
  const [pendingFlow, setPendingFlow] = useState(null)
  const [mode, setMode] = useState("customer") // internal only (not shown)

  // Support contacts
  const supportWhatsAppRaw = useMemo(() => (import.meta.env.VITE_SUPPORT_WHATSAPP || "").trim(), [])
  const supportEmail = useMemo(() => (import.meta.env.VITE_SUPPORT_EMAIL || "").trim(), [])
  const supportWhatsAppDigits = useMemo(() => normalizePhoneForWhatsApp(supportWhatsAppRaw), [supportWhatsAppRaw])

  const whatsappLink = useMemo(() => {
    if (!supportWhatsAppDigits) return ""
    const msg = encodeURIComponent("Hi Kaki team, I need help with:")
    return `https://wa.me/${supportWhatsAppDigits}?text=${msg}`
  }, [supportWhatsAppDigits])

  useEffect(() => {
    const greeting = GREETING_BY_LANG[language] || GREETING_BY_LANG.en
    setMessages((prev) => {
      if (!prev.length || prev[0].from !== "bot") return prev
      const updated = { ...prev[0], text: greeting }
      return [updated, ...prev.slice(1)]
    })
  }, [language])

  useEffect(() => {
    saveChatToSession(messages)
  }, [messages])

  // optional backend
  const backendEndpoint = useMemo(() => import.meta.env.VITE_BACKEND_CHAT_URL || "", [])
  const backendAuthToken = useMemo(() => import.meta.env.VITE_BACKEND_AUTH_TOKEN || "", [])

  // groq
  const groqSettings = useMemo(() => {
    const apiKey = (import.meta.env.VITE_GROQ_API_KEY || "").trim()
    if (!apiKey) return null
    return {
      apiKey,
      model: (import.meta.env.VITE_GROQ_MODEL || "llama-3.1-8b-instant").trim(),
      instructions: (import.meta.env.VITE_GROQ_SYSTEM_PROMPT || "").trim() || DEFAULT_ASSISTANT_PROMPT,
      historyWindow: Number(import.meta.env.VITE_GROQ_HISTORY_WINDOW || FALLBACK_HISTORY_WINDOW) || FALLBACK_HISTORY_WINDOW,
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
      .map((product) => ({ path: `/product/${product.slug}`, label: product.name || product.slug }))
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
      if (normalized) directives.push(normalized.startsWith("/") ? normalized : `/${normalized}`)
      return ""
    })
    return { cleaned: cleaned.trim(), directives }
  }, [])

  const safeNavigate = useCallback(
    (rawPath) => {
      if (!rawPath) return
      const normalized = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
      if (!allowedNavigationSet.has(normalized)) return
      onNavigate?.(normalized)
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

  const buildGreetingOnlyReply = useCallback(() => {
    const replies = {
      en: "Hi! 😊 How can I help you today?",
      zh: "你好！😊 我可以帮你什么吗？",
      ms: "Hai! 😊 Saya boleh bantu apa hari ini?",
      ta: "வணக்கம்! 😊 நான் எப்படி உதவலாம்?",
    }
    return replies[language] || replies.en
  }, [language])

  const buildAgentContactReply = useCallback(() => {
    const lines = []
    lines.push("Sure — you can contact our team directly:")
    if (supportWhatsAppDigits) lines.push(`WhatsApp: ${supportWhatsAppRaw}`)
    if (supportEmail) lines.push(`Email: ${supportEmail}`)

    if (!supportWhatsAppDigits && !supportEmail) {
      lines.push("Support contact is not configured yet.")
      lines.push("Set VITE_SUPPORT_WHATSAPP and/or VITE_SUPPORT_EMAIL in your .env file.")
      return lines.join("\n")
    }

    lines.push("")
    lines.push("Please include:")
    lines.push("- your name")
    lines.push("- your order ID (if any)")
    lines.push("- what you need help with")

    if (whatsappLink) {
      lines.push("")
      lines.push(`WhatsApp link: ${whatsappLink}`)
    }
    return lines.join("\n")
  }, [supportEmail, supportWhatsAppDigits, supportWhatsAppRaw, whatsappLink])

  const shouldEscalateToAgent = useCallback((text) => CONTACT_AGENT_REGEX.test(text || ""), [])
  const shouldEnterSupplierMode = useCallback((text) => SUPPLIER_INTENT_REGEX.test(text || ""), [])
  const isSourcingIntent = useCallback((text) => SOURCING_INTENT_REGEX.test(text || ""), [])

// ✅ real add-to-cart that actually updates something
const reallyAddToCart = useCallback(
  (product, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1)

    // 1) try your real app handler
    try {
      if (typeof onAddToCart === "function") onAddToCart(product, qty)
    } catch {}

    // 2) broadcast event (parent can listen)
    try {
      window.dispatchEvent(new CustomEvent("kaki:add-to-cart", { detail: { product, quantity: qty } }))
    } catch {}

    // 3) localStorage fallback (so cart is not empty)
    addToLocalCart(product, qty)

    // ✅ NEW: tell UI to refresh cart
    notifyCartChanged()
  },
  [onAddToCart],
)

  // Variant detection (Milo/Carrot)
  const detectVariantNeed = useCallback(
    (text) => {
      const normalized = normalizeCommandText(text)

      if (normalized.includes("milo")) {
        const isSpecific = MILO_VARIANTS.some((v) =>
          v.keywords.some((k) => normalized.includes(normalizeCommandText(k))),
        )
        if (!isSpecific) return { type: "variant", base: "Milo", options: MILO_VARIANTS }
      }

      if (normalized.includes("carrot") || normalized.includes("carrots")) {
        const isSpecific = CARROT_VARIANTS.some((v) =>
          v.keywords.some((k) => normalized.includes(normalizeCommandText(k))),
        )
        if (!isSpecific) return { type: "variant", base: "Carrots", options: CARROT_VARIANTS }
      }

      return null
    },
    [normalizeCommandText],
  )

  const buildVariantQuestion = useCallback((baseName, variantList) => {
    const lines = []
    lines.push(`${baseName} has a few types. Which one do you want?`)
    variantList.forEach((v, idx) => lines.push(`${idx + 1}) ${v.label}`))
    lines.push("Reply with the option number (or type a new item to search).")
    return lines.join("\n")
  }, [])

  const findCatalogMatchesByKeyword = useCallback(
    (keyword) => {
      const normalized = normalizeCommandText(keyword)
      if (!normalized || !Array.isArray(catalog)) return []
      const tokens = normalized.split(" ").filter((t) => t.length >= 3)
      return catalog
        .filter((p) => {
          const hay = [p.name, p.slug, p.brand, p.category, p.tag, p.desc]
            .filter(Boolean)
            .map((v) => normalizeCommandText(v))
            .join(" ")
          if (hay.includes(normalized)) return true
          return tokens.some((t) => hay.includes(t))
        })
        .slice(0, 8)
    },
    [catalog, normalizeCommandText],
  )

  // ✅ cancelable variant choice
  const handleVariantChoice = useCallback(
    (text) => {
      if (!pendingFlow || pendingFlow.type !== "variant") return null

      // user changed topic -> cancel
      if (!isJustNumber(text) && isLikelyNewIntentText(text)) {
        setPendingFlow(null)
        return null
      }

      const trimmed = String(text || "").trim()
      const idx = Number(trimmed.match(/^\d+/)?.[0])
      if (!Number.isFinite(idx) || idx < 1 || idx > pendingFlow.options.length) {
        return "Please reply with the option number (or type a new item to search)."
      }

      const chosen = pendingFlow.options[idx - 1]
      setPendingFlow(null)

      const catalogMatches = findCatalogMatchesByKeyword(`${pendingFlow.base} ${chosen.label}`)
      if (catalogMatches.length === 1) {
        const p = catalogMatches[0]
        if (p?.slug) safeNavigate(`/product/${p.slug}`)
        return `Got it — ${chosen.label}. Opening it for you.`
      }
      if (catalogMatches.length > 1) {
        const list = catalogMatches.map((p, i) => `${i + 1}) ${p.name || p.slug}`).join("\n")
        setPendingFlow({ type: "productPick", options: catalogMatches })
        return `I found a few matches for ${chosen.label}. Which one?\n${list}\nReply with the number (or type a new item).`
      }

      return `Got it — ${chosen.label}. Tell me your preferred pack size and quantity.`
    },
    [pendingFlow, findCatalogMatchesByKeyword, safeNavigate],
  )

  const handleProductPickChoice = useCallback(
    (text) => {
      if (!pendingFlow || pendingFlow.type !== "productPick") return null

      if (!isJustNumber(text) && isLikelyNewIntentText(text)) {
        setPendingFlow(null)
        return null
      }

      const trimmed = String(text || "").trim()
      const idx = Number(trimmed.match(/^\d+/)?.[0])
      if (!Number.isFinite(idx) || idx < 1 || idx > pendingFlow.options.length) {
        return "Please reply with the option number (or type a new item to search)."
      }

      const product = pendingFlow.options[idx - 1]
      setPendingFlow(null)
      if (product?.slug) safeNavigate(`/product/${product.slug}`)
      return `Opening ${product.name || product.slug} for you.`
    },
    [pendingFlow, safeNavigate],
  )

  // Product matching
  const findProductMatches = useCallback(
    (hint) => {
      const normalizedHint = normalizeCommandText(hint)
      if (!normalizedHint) return []
      if (!Array.isArray(catalog)) return []
      const tokens = normalizedHint.split(" ").filter((token) => token.length >= 3)
      return catalog
        .filter((product) => {
          const haystack = [product.name, product.slug, product.tag, product.category, product.brand, product.desc]
            .filter(Boolean)
            .map((value) => normalizeCommandText(value))
            .join(" ")
          if (haystack.includes(normalizedHint)) return true
          return tokens.some((token) => haystack.includes(token))
        })
        .slice(0, 6)
    },
    [catalog, normalizeCommandText],
  )

  const handlePendingCartChoice = useCallback(
    (text) => {
      if (!pendingCartChoice) return null

      // cancel if user changes topic
      if (!isJustNumber(text) && isLikelyNewIntentText(text)) {
        setPendingCartChoice(null)
        return null
      }

      const trimmed = String(text || "").trim()
      const choiceIndex = Number(trimmed.match(/^\d+/)?.[0])

      if (!Number.isFinite(choiceIndex) || choiceIndex < 1 || choiceIndex > pendingCartChoice.options.length) {
        return "Please reply with the number of the item you want (or type a new item)."
      }

      const product = pendingCartChoice.options[choiceIndex - 1]
      const qty = pendingCartChoice.quantity || 1
      setPendingCartChoice(null)

      reallyAddToCart(product, qty)
      safeNavigate("/cart")
      return `Added ${qty} x ${product.name || product.slug} to your cart. Opening your cart now.`
    },
    [pendingCartChoice, reallyAddToCart, safeNavigate],
  )

  const handleAddToCartIntent = useCallback(
    (text) => {
      const match = text.match(
  /(?:add|put|insert|place)\s*(\d+)?\s*(?:x|pcs?|pieces?)?\s*(.+?)\s*(?:to|into|in)\s*(?:my\s*)?(cart|basket)/i,
)
      if (!match) return null

      const quantity = match[1] ? Math.max(1, Number(match[1])) : 1
      const productHint = match[2].trim()
      if (!productHint) return null

      const variantNeed = detectVariantNeed(productHint)
      if (variantNeed) {
        setPendingFlow(variantNeed)
        return buildVariantQuestion(variantNeed.base, variantNeed.options)
      }

      const matches = findProductMatches(productHint)
      if (matches.length === 0) {
        if (isSourcingIntent(text)) {
          setPendingFlow({ type: "sourcingDetails" })
          return "I can help source that. Is this for personal use or bulk (event/office)? What quantity and budget range?"
        }
        return `I couldn't find "${productHint}". What brand/size do you prefer (or do you want a substitute)?`
      }

      if (matches.length === 1) {
        const product = matches[0]
        reallyAddToCart(product, quantity)
        safeNavigate("/cart")
        return `Added ${quantity} x ${product.name || product.slug} to your cart. Opening your cart now.`
      }

      setPendingCartChoice({ options: matches, quantity })
      const list = matches.map((item, index) => `${index + 1}) ${item.name || item.slug}`).join("\n")
      return `I found multiple items. Which one do you want?\n${list}\nReply with the number (or type a new item).`
    },
    [buildVariantQuestion, detectVariantNeed, findProductMatches, isSourcingIntent, reallyAddToCart, safeNavigate],
  )

  const handleShowProductIntent = useCallback(
    (text) => {
      const match = text.match(/(?:show|view|open|find|tell me about)\s+(?:me\s+)?(.+?)(?:$|\?)/i)
      if (!match) return null
      const productHint = match[1].trim()
      if (!productHint) return null

      const variantNeed = detectVariantNeed(productHint)
      if (variantNeed) {
        setPendingFlow(variantNeed)
        return buildVariantQuestion(variantNeed.base, variantNeed.options)
      }

      const matches = findProductMatches(productHint)
      if (!matches.length) return `I couldn’t find "${productHint}". Can you tell me brand/size?`
      const product = matches[0]
      if (product?.slug) {
        safeNavigate(`/product/${product.slug}`)
        return `Opening ${product.name || product.slug} for you.`
      }
      return `I found ${product.name || "that item"}, but it has no product page slug.`
    },
    [buildVariantQuestion, detectVariantNeed, findProductMatches, safeNavigate],
  )

  // Sales-style proactive prompts
  const buildProactiveCustomerPrompt = useCallback(() => {
    const latest = Array.isArray(orders) ? orders[0] : null
    if (!userProfile && !latest) {
      return "Are you shopping for yourself or for an office/event? I can recommend the best options."
    }
    const name = userProfile?.name ? `${userProfile.name}` : "there"
    if (latest) {
      const id = latest.id || "your latest order"
      const status = latest.status || "processing"
      return `Welcome back, ${name}! Want me to help you reorder items from ${id} (status: ${status})?`
    }
    return `Welcome back, ${name}! Want recommendations based on your usual purchases?`
  }, [orders, userProfile])

  // Supplier helpers (simple)
  const buildSupplierMenu = useCallback(() => {
    return [
      "Supplier mode ✅ What would you like to do?",
      "1) View low-stock items",
      "2) Go to Supplier Center",
      "3) Update stock (tell me item + new quantity)",
      "4) Upload/list a new product (tell me name + price + stock)",
      "5) Contact support",
      "Reply with 1–5.",
    ].join("\n")
  }, [])

  const getLowStockItems = useCallback(() => {
    if (!Array.isArray(catalog)) return []
    return catalog
      .filter((p) => {
        const raw = p.onlineStock ?? p.online_stock ?? p.stock ?? p.quantity ?? null
        const n = parseNumeric(raw)
        return n !== null && n <= 5
      })
      .slice(0, 8)
  }, [catalog])

  const handleSupplierMenuChoice = useCallback(
    (text) => {
      if (!pendingFlow || pendingFlow.type !== "supplierMenu") return null

      if (!isJustNumber(text) && isLikelyNewIntentText(text)) {
        setPendingFlow(null)
        return null
      }

      const trimmed = String(text || "").trim()
      const idx = Number(trimmed.match(/^\d+/)?.[0])
      if (!Number.isFinite(idx) || idx < 1 || idx > 5) return "Please reply with 1–5 (or type a new request)."
      setPendingFlow(null)

      if (idx === 1) {
        const low = getLowStockItems()
        if (!low.length) return "No low-stock items detected right now."
        return `Low-stock items:\n${low.map((p) => `- ${p.name || p.slug}: ${p.stock ?? p.quantity ?? p.onlineStock ?? "?"}`).join("\n")}`
      }

      if (idx === 2) {
        safeNavigate("/supplier")
        return "Opening Supplier Center."
      }

      if (idx === 3) {
        setPendingFlow({ type: "supplierStockUpdate" })
        return "Tell me: item name + new quantity (example: 'Milo 3-in-1 30')."
      }

      if (idx === 4) {
        setPendingFlow({ type: "supplierNewProduct" })
        return "Tell me: name, price, stock (example: 'Baby Carrots $2.50 40')."
      }

      return buildAgentContactReply()
    },
    [buildAgentContactReply, getLowStockItems, pendingFlow, safeNavigate],
  )

  const handleSupplierStockUpdate = useCallback(
    (text) => {
      if (!pendingFlow || pendingFlow.type !== "supplierStockUpdate") return null

      if (isLikelyNewIntentText(text) && !/\d+\s*$/.test(text)) {
        setPendingFlow(null)
        return null
      }

      const trimmed = String(text || "").trim()
      const qtyMatch = trimmed.match(/(\d+)\s*$/)
      if (!qtyMatch) return "Please include the new quantity at the end (example: 'Milo 3-in-1 30')."
      const qty = Number(qtyMatch[1])
      const name = trimmed.replace(qtyMatch[0], "").trim()
      if (!name) return "Please include the item name too."

      setPendingFlow(null)
      try { onSupplierAction?.({ type: "update_stock", name, quantity: qty }) } catch {}
      return `Noted ✅ Stock update request: "${name}" → ${qty}. (Connect backend to apply changes.)`
    },
    [onSupplierAction, pendingFlow],
  )

  const handleSupplierNewProduct = useCallback(
    (text) => {
      if (!pendingFlow || pendingFlow.type !== "supplierNewProduct") return null

      const trimmed = String(text || "").trim()
      const stockMatch = trimmed.match(/(\d+)\s*$/)
      const priceMatch = trimmed.match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:sgd)?/i)
      if (!stockMatch) return "Please include stock quantity at the end (example: 'Baby Carrots $2.50 40')."
      if (!priceMatch) return "Please include a price (example: '$2.50')."

      const stock = Number(stockMatch[1])
      const price = Number(priceMatch[1])
      let name = trimmed.replace(stockMatch[0], "").trim()
      name = name.replace(priceMatch[0], "").trim()
      if (!name) return "Please include the product name (example: 'Baby Carrots $2.50 40')."

      setPendingFlow(null)
      try { onSupplierAction?.({ type: "new_product", name, price, stock }) } catch {}
      return `Noted ✅ New product request: "${name}" ($${price.toFixed(2)}) stock ${stock}. (Connect backend to publish.)`
    },
    [onSupplierAction, pendingFlow],
  )

  // Recipes (simple local)
  const handleRecipeIntent = useCallback(
    (text) => {
      const normalized = normalizeCommandText(text)
      const idea = RECIPE_IDEAS.find((i) => i.keywords.some((k) => normalized.includes(k)))
      if (!idea) return null
      onRecipeSuggestion?.({ title: idea.title, description: idea.description, ingredients: idea.ingredients })
      safeNavigate("/")
      return `I added the ingredients for ${idea.title} to the home page.`
    },
    [normalizeCommandText, onRecipeSuggestion, safeNavigate],
  )

  // Special intent handler
  const handleSpecialIntent = useCallback(
    (text) => {
      if (!text) return null

      // ✅ if a menu is pending but user changes topic, cancel and continue
      if ((pendingFlow || pendingCartChoice) && !isJustNumber(text) && isLikelyNewIntentText(text)) {
        setPendingFlow(null)
        setPendingCartChoice(null)
      }

      /* =======================
         ✅ NEW: Nearest location flow
      ======================= */

      // If bot asked for user area previously
      if (pendingFlow?.type === "askUserLocation") {
        const userCoords = extractUserCoordsFromText(text)
        if (!userCoords) {
          return "Sorry — I didn’t catch that. Try: Tampines / Jurong East / Orchard / Woodlands."
        }

        setPendingFlow(null)

        const withCoords = ensureStoreCoords(storeLocations)
        const nearest = findNearestStore(userCoords, withCoords)

        if (!nearest) {
          safeNavigate("/locations")
          return "I can’t calculate nearest store yet (no store coordinates). Opening store locations."
        }

        const name = nearest.loc?.name || nearest.loc?.title || "Kaki Store"
        const address = nearest.loc?.address || "Address not listed"
        const km = Number(nearest.distanceKm).toFixed(1)

        safeNavigate("/locations")
        return `Nearest store to ${userCoords.label}: ${name} — ${address} (~${km} km). Opening store locations now.`
      }

      // If user asks nearest/closest
      if (NEAREST_LOCATION_REGEX.test(text)) {
        const userCoords = extractUserCoordsFromText(text)
        if (!userCoords) {
          setPendingFlow({ type: "askUserLocation" })
          return "Sure — which area are you at (e.g., Tampines, Jurong East, Orchard, Woodlands)?"
        }

        const withCoords = ensureStoreCoords(storeLocations)
        const nearest = findNearestStore(userCoords, withCoords)

        if (!nearest) {
          safeNavigate("/locations")
          return "I can’t calculate nearest store yet (no store coordinates). Opening store locations."
        }

        const name = nearest.loc?.name || nearest.loc?.title || "Kaki Store"
        const address = nearest.loc?.address || "Address not listed"
        const km = Number(nearest.distanceKm).toFixed(1)

        safeNavigate("/locations")
        return `Nearest store to ${userCoords.label}: ${name} — ${address} (~${km} km). Opening store locations now.`
      }

      /* ======================= */

      const variantReply = handleVariantChoice(text)
      if (variantReply) return variantReply

      const productPickReply = handleProductPickChoice(text)
      if (productPickReply) return productPickReply

      const supplierMenuReply = handleSupplierMenuChoice(text)
      if (supplierMenuReply) return supplierMenuReply

      const supplierStockReply = handleSupplierStockUpdate(text)
      if (supplierStockReply) return supplierStockReply

      const supplierNewProductReply = handleSupplierNewProduct(text)
      if (supplierNewProductReply) return supplierNewProductReply

      const cartChoiceReply = handlePendingCartChoice(text)
      if (cartChoiceReply) return cartChoiceReply

      // agent escalation
      if (shouldEscalateToAgent(text)) return buildAgentContactReply()

      // supplier mode
      if (shouldEnterSupplierMode(text)) {
        setMode("supplier")
        setPendingFlow({ type: "supplierMenu" })
        safeNavigate("/supplier-login")
        return `${buildSupplierMenu()}\n\n(If you’re not logged in, please login first.)`
      }

      const normalized = normalizeCommandText(text)

      // purchase history / reorder
      if (/(purchase history|order history|past orders|my orders)/.test(normalized)) {
        safeNavigate("/history")
        const latest = Array.isArray(orders) ? orders[0] : null
        return latest
          ? `Opening your purchase history. Latest order: ${latest.id || "latest"} (${latest.status || "processing"}).`
          : "Opening your purchase history — I don't see any recent orders yet."
      }

      if (/(track|tracking|where.*order|order status)/.test(normalized)) {
        safeNavigate("/tracking")
        const latest = Array.isArray(orders) ? orders[0] : null
        return latest
          ? `Your most recent order (${latest.id || "latest"}) is ${latest.status || "processing"}. Opening tracking now.`
          : "I don't see any orders yet. Opening tracking page."
      }

      // how many stores
      if (/(how many|count)\s+(stores|locations)/.test(normalized)) {
        const total = Array.isArray(storeLocations) ? storeLocations.length : 0
        safeNavigate("/locations")
        return `We currently have ${total} store${total === 1 ? "" : "s"} in our network. Opening store locations now.`
      }

      // sourcing
      if (isSourcingIntent(text)) {
        return "Sure — are you sourcing for personal use or bulk (event/office)? What quantity and budget range?"
      }

      // cart add
      const addReply = handleAddToCartIntent(text)
      if (addReply) return addReply

      // show product
      const showReply = handleShowProductIntent(text)
      if (showReply) return showReply

      // recipes
      const recipeReply = handleRecipeIntent(text)
      if (recipeReply) return recipeReply

      // recommendation -> ask like a salesperson
      if (/(recommend|suggest|help me choose|what should i buy)/.test(normalized)) {
        const starter = buildProactiveCustomerPrompt()
        return `${starter}\nTell me: 1) what items you want 2) budget 3) any dietary preferences.`
      }

      // Milo/Carrot general mention
      const variantNeed = detectVariantNeed(text)
      if (variantNeed) {
        setPendingFlow(variantNeed)
        return buildVariantQuestion(variantNeed.base, variantNeed.options)
      }

      return null
    },
    [
      pendingFlow,
      pendingCartChoice,
      handleVariantChoice,
      handleProductPickChoice,
      handleSupplierMenuChoice,
      handleSupplierStockUpdate,
      handleSupplierNewProduct,
      handlePendingCartChoice,
      shouldEscalateToAgent,
      buildAgentContactReply,
      shouldEnterSupplierMode,
      safeNavigate,
      buildSupplierMenu,
      normalizeCommandText,
      orders,
      storeLocations,
      isSourcingIntent,
      handleAddToCartIntent,
      handleShowProductIntent,
      handleRecipeIntent,
      buildProactiveCustomerPrompt,
      detectVariantNeed,
      buildVariantQuestion,
    ],
  )

  const createGroundedPrompt = useCallback(
    (promptText) => {
      const basePrompt = (promptText || DEFAULT_ASSISTANT_PROMPT).trim() || DEFAULT_ASSISTANT_PROMPT
      const blocks = [basePrompt]

      blocks.push(
        mode === "supplier"
          ? "You are assisting a supplier. Keep answers operational: inventory, listings, restock guidance."
          : "Act like a helpful customer service officer. Ask 1–2 clarifying questions when ambiguous (type/size/brand/origin).",
      )

      if (siteContext) blocks.push(`Kaki reference data:\n${siteContext}`)

      if (navigationSummary) {
        blocks.push(
          `Allowed navigation commands:\n${navigationSummary}\nWhen the shopper asks to open any section above, confirm and append [[NAV:/path]] using the exact path shown. Use at most one NAV token.`,
        )
      }

      blocks.push('If not covered in the reference data, reply: "I\'m not sure about that. Please check with a Kaki associate."')

      return blocks.filter(Boolean).join("\n\n")
    },
    [mode, navigationSummary, siteContext],
  )

  const sendViaGroq = useCallback(
    async (conversationHistory) => {
      if (!groqSettings) throw new Error("Groq is not configured")

      const limitedHistory = conversationHistory.slice(-groqSettings.historyWindow)

      const messagesPayload = []
      const instructionBlock = createGroundedPrompt(groqSettings.instructions)
      if (instructionBlock) messagesPayload.push({ role: "system", content: instructionBlock })

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
        payload?.choices?.map((choice) => choice?.message?.content || "").find((t) => t && t.trim())?.trim() || ""

      const { cleaned, directives } = stripNavigationDirectives(replyText)
      directives.forEach(safeNavigate)

      return cleaned || replyText || "I wasn't able to get a response."
    },
    [createGroundedPrompt, groqSettings, safeNavigate, stripNavigationDirectives],
  )

  const sendMessage = async () => {
    if (!draft.trim() || isSending) return

    setError("")
    const trimmed = draft.trim()
    const userMessage = { id: Date.now(), text: trimmed, from: "user" }

    setMessages((prev) => [...prev, userMessage])
    setDraft("")

    try {
      setIsSending(true)

      // ✅ greeting-only
      if (GREETING_ONLY_REGEX.test(trimmed)) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: buildGreetingOnlyReply(), from: "bot" }])
        return
      }

      // ✅ local intents first
      const intentReply = handleSpecialIntent(trimmed)
      if (intentReply) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: intentReply, from: "bot" }])
        return
      }

      // ✅ backend or Groq
      const useBackend = Boolean(backendEndpoint)

      if (!useBackend) {
        if (!groqSettings) throw new Error("Groq API key is missing (VITE_GROQ_API_KEY)")
        const history = [...messages, userMessage]
        const replyText = await sendViaGroq(history)
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: replyText, from: "bot" }])
        return
      }

      const response = await fetch(backendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(backendAuthToken ? { Authorization: `Bearer ${backendAuthToken}` } : {}),
        },
        body: JSON.stringify({ message: trimmed, language, sender_id: "kaki-web-user", mode }),
      })

      if (!response.ok) throw new Error(`Chat service replied with ${response.status}`)

      const payload = await response.json()
      const replyText = payload?.reply || "I didn't receive a reply from the assistant."

      const { cleaned, directives } = stripNavigationDirectives(replyText)
      directives.forEach(safeNavigate)

      setMessages((prev) => [...prev, { id: Date.now() + 1, text: cleaned || replyText, from: "bot" }])
    } catch (err) {
      console.error(err)
      setError("Trouble reaching the chatbot service. Please try again.")
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: "I couldn't reach the assistant. Check your connection or try again shortly.", from: "bot" },
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

          <div className="language-row">
            <label htmlFor="language-select">Language</label>
            <select id="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
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
              onChange={(e) => setDraft(e.target.value)}
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