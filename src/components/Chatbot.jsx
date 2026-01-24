// component: Chatbot (interacts with Groq or optional backend)
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FaComments } from "react-icons/fa"
import "./Chatbot.css"

import { getSupabaseClient } from "../lib/supabaseClient"

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

const DEFAULT_ASSISTANT_PROMPT =
  "You are Kaki's friendly grocery concierge. Keep replies short, specific, and helpful about store products, stock, and services."

const FALLBACK_HISTORY_WINDOW = 12
const MAX_CONTEXT_PRODUCTS = 20
const MAX_CONTEXT_LOCATIONS = 3
const MAX_PRODUCT_NAV_LINKS = 24
const LOW_STOCK_THRESHOLD = 5

const NAV_DIRECTIVE_REGEX = /\[\[NAV:([^\]\s]+)\]\]/gi

const RECIPE_IDEAS = [
  {
    keywords: ["soup", "broth", "stew", "ramen"],
    title: "Hearty vegetable soup",
    description: "A warming soup with aromatics and tender vegetables.",
    ingredients: [
      "Onion",
      "Carrots",
      "Garlic",
      "Celery",
      "Tomatoes",
      "Vegetable stock",
      "Fresh herbs",
    ],
  },
  {
    keywords: ["stir fry", "stir-fry", "fried rice", "noodles"],
    title: "Quick stir-fry",
    description: "Fast, high-heat veggies with a savory sauce.",
    ingredients: [
      "Garlic",
      "Ginger",
      "Mixed vegetables",
      "Soy sauce",
      "Sesame oil",
      "Rice or noodles",
    ],
  },
  {
    keywords: ["salad", "greens", "grain bowl"],
    title: "Fresh salad bowl",
    description: "Crisp greens with bright, crunchy toppings.",
    ingredients: [
      "Mixed greens",
      "Cucumber",
      "Tomatoes",
      "Avocado",
      "Lemon",
      "Olive oil",
    ],
  },
  {
    keywords: ["curry", "curry rice"],
    title: "Simple curry",
    description: "Comforting curry with a creamy, spiced base.",
    ingredients: [
      "Onion",
      "Garlic",
      "Curry paste",
      "Coconut milk",
      "Protein or vegetables",
      "Rice",
    ],
  },
  {
    keywords: ["pasta", "spaghetti", "noodles"],
    title: "Easy pasta night",
    description: "A quick pasta dinner with pantry staples.",
    ingredients: [
      "Pasta",
      "Tomato sauce",
      "Garlic",
      "Olive oil",
      "Parmesan",
    ],
  },
]

const STATIC_NAV_TARGETS = [
  { label: "Home", path: "/" },
  { label: "Sign up", path: "/signup" },
  { label: "Log in", path: "/login" },
  { label: "Cart", path: "/cart" },
  { label: "Checkout", path: "/checkout" },
  { label: "Admin Center", path: "/admin" },
  { label: "Supplier Center", path: "/supplier" },
  { label: "Purchase history", path: "/history" },
  { label: "Order tracking", path: "/tracking" },
  { label: "Help Center", path: "/help" },
  { label: "Saved items", path: "/saved" },
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

const parseNumeric = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const parsePrice = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "")
  const numeric = Number(normalized)
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

const summarizePromotions = (promotions = []) => {
  if (!Array.isArray(promotions) || promotions.length === 0) return ""
  return promotions
    .slice(0, 5)
    .map((promo, index) => `${index + 1}. ${promo.headline || "Deal"} — ${promo.detail || "Limited offer"}`)
    .join("\n")
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
  promotions = [],
  orders = [],
  cartItems = [],
  onNavigate = () => { },
  onAddToCart = () => { },
  onRemoveFromCart = () => { },
  onUpdateCartQuantity = () => { },
  onLogout = () => { },
  onOpenAdminProduct = () => { },
  onRecipeSuggestion = () => { },
  onCategoryChange = () => { },
  onProductUpdate = () => { },
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [language, setLanguage] = useState(languages[0].code)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [pendingCartChoice, setPendingCartChoice] = useState(null)
  const [shoppingPrefs, setShoppingPrefs] = useState({
    substitutionsAllowed: true,
    substitutionNotes: [],
    preferOrganic: false,
  })
  const messagesEndRef = useRef(null)
  const isResizing = useRef(false)
  const lastProductContext = useRef({ hint: "", items: [] })
  const lowStockNoticeRef = useRef({ key: "", acknowledged: false })
  const [dimensions, setDimensions] = useState({ width: 480, height: 700 })
  const [adminStats, setAdminStats] = useState(null)
  const [supplierStats, setSupplierStats] = useState(null)
  const [interactionState, setInteractionState] = useState({ mode: "idle", data: {} })

  useEffect(() => {
    if (userProfile?.role !== "admin") {
      setAdminStats(null)
      return
    }

    const fetchStats = async () => {
      try {
        const supabase = getSupabaseClient()
        // Fetch complaints count
        const { count, error } = await supabase
          .from("complaints")
          .select("id", { count: "exact", head: true })

        if (!error) {
          setAdminStats({ complaints: count || 0 })
        }
      } catch (err) {
        console.warn("Failed to fetch admin stats for chatbot", err)
      }
    }
    fetchStats()
  }, [userProfile])

  useEffect(() => {
    if (userProfile?.role !== "supplier") {
      setSupplierStats(null)
      return
    }

    const fetchSupplierStats = async () => {
      try {
        const supabase = getSupabaseClient()
        // Fetch products to calculate inventory value
        const { data: products } = await supabase
          .from("products")
          .select("id, price, stock, status")
          .eq("supplier_id", userProfile.id)

        const safeProducts = products || []
        const inventoryValue = safeProducts
          .filter((p) => p.status !== "rejected")
          .reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0)

        // Fetch sales to calculate revenue
        const productIds = safeProducts.map((p) => p.id)
        let revenue = 0
        if (productIds.length > 0) {
          const { data: sales } = await supabase
            .from("order_items")
            .select("unit_price, quantity")
            .in("product_id", productIds)

          revenue = (sales || []).reduce(
            (sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 1)),
            0,
          )
        }

        setSupplierStats({ inventoryValue, revenue })
      } catch (err) {
        console.warn("Failed to fetch supplier stats for chatbot", err)
      }
    }
    fetchSupplierStats()
  }, [userProfile])

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return
    // Fixed bottom: 100px, right: 24px
    const newWidth = window.innerWidth - 24 - e.clientX
    const newHeight = window.innerHeight - 100 - e.clientY
    setDimensions({
      width: Math.max(350, Math.min(newWidth, window.innerWidth - 48)),
      height: Math.max(400, Math.min(newHeight, window.innerHeight - 120)),
    })
  }, [])

  const stopResizing = useCallback(() => {
    isResizing.current = false
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", stopResizing)
    document.body.style.cursor = "default"
  }, [handleMouseMove])

  const startResizing = useCallback(
    (e) => {
      e.preventDefault()
      isResizing.current = true
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", stopResizing)
      document.body.style.cursor = "nwse-resize"
    },
    [handleMouseMove, stopResizing],
  )

  const normalizeCommandText = useCallback((value) => {
    if (!value) return ""
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }, [])

  const getProductHaystack = useCallback(
    (product) => {
      if (!product) return ""
      return normalizeCommandText(
        [
          product.name,
          product.slug,
          product.brand,
          product.category,
          product.tag,
          product.desc,
          product.description,
        ]
          .filter(Boolean)
          .join(" "),
      )
    },
    [normalizeCommandText],
  )

  const getProductStock = useCallback((product) => {
    const rawStock =
      product?.onlineStock ??
      product?.online_stock ??
      product?.stock ??
      product?.quantity ??
      0
    return parseNumeric(rawStock) ?? 0
  }, [])

  const findProductsByTerms = useCallback(
    (terms = [], options = {}) => {
      if (!Array.isArray(catalog) || catalog.length === 0) return []
      const normalizedTerms = terms.map((term) => normalizeCommandText(term)).filter(Boolean)
      if (normalizedTerms.length === 0) return []
      const requireAll = options.requireAll ?? true
      const inStockOnly = options.inStockOnly ?? false
      const maxPrice = Number.isFinite(options.maxPrice) ? options.maxPrice : null

      const matches = catalog.filter((product) => {
        const haystack = getProductHaystack(product)
        if (!haystack) return false
        const hasAll = normalizedTerms.every((term) => haystack.includes(term))
        const hasAny = normalizedTerms.some((term) => haystack.includes(term))
        if (requireAll ? !hasAll : !hasAny) return false
        if (inStockOnly && getProductStock(product) <= 0) return false
        if (maxPrice !== null) {
          const price = parsePrice(product.price)
          if (price === null) return false
          if (price > maxPrice) return false
        }
        return true
      })

      return matches.slice(0, options.limit || 10)
    },
    [catalog, getProductHaystack, getProductStock, normalizeCommandText],
  )

  const checkIfPurchasedBefore = useCallback(
    (product) => {
      if (!product || !Array.isArray(orders)) return false

      const pSlug = String(product.slug || "").toLowerCase()
      const pName = normalizeCommandText(product.name || "")

      return orders.some((order) =>
        (order.order_items || []).some((item) => {
          // Syncing with user's Supabase schema: 'product_slug' and 'product_name'
          const iSlug = String(item.product_slug || "").toLowerCase()
          const iName = normalizeCommandText(item.product_name || item.name || "")

          return (
            (pSlug && iSlug && iSlug === pSlug) ||
            (pName && iName && iName === pName)
          )
        }),
      )
    },
    [orders, normalizeCommandText],
  )

  const rememberLastProducts = useCallback((hint, matches) => {
    if (!matches || matches.length === 0) return
    lastProductContext.current = {
      hint: hint || "",
      items: matches,
    }
  }, [])

  const buildProductCardItems = useCallback(
    (products = []) =>
      products.map((product) => ({
        product,
        purchasedBefore: checkIfPurchasedBefore(product),
      })),
    [checkIfPurchasedBefore],
  )

  const buildProductListResponse = useCallback(
    (title, description, products, quantity) => ({
      type: "product-list",
      title,
      description,
      quantity,
      items: buildProductCardItems(products),
    }),
    [buildProductCardItems],
  )

  const extractMaxPrice = useCallback((text) => {
    if (!text) return null
    const match = String(text).match(
      /\b(?:under|below|less than|<)\s*\$?\s*(\d+(?:\.\d+)?)/i,
    )
    if (!match) return null
    const amount = Number(match[1])
    return Number.isFinite(amount) ? amount : null
  }, [])

  const formatCartSummary = useCallback(() => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return "Your cart is empty right now."
    }
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const lines = cartItems
      .slice(0, 6)
      .map(
        (item) =>
          `- ${item.quantity} x ${item.name || item.slug} ($${item.price.toFixed(2)})`,
      )
    const more = cartItems.length > 6 ? "\n- ...and more items" : ""
    return `Here is what is in your cart:\n${lines.join("\n")}${more}\nCart total: $${total.toFixed(2)}`
  }, [cartItems])

  const findProductFromOrderItem = useCallback(
    (item) => {
      if (!item || !Array.isArray(catalog)) return null
      const slug = String(item.product_slug || "").toLowerCase()
      const name = normalizeCommandText(item.product_name || item.name || "")
      let match = null
      if (slug) {
        match = catalog.find((product) => String(product.slug || "").toLowerCase() === slug)
      }
      if (!match && name) {
        match = catalog.find(
          (product) => normalizeCommandText(product.name || "") === name,
        )
      }
      return match || null
    },
    [catalog, normalizeCommandText],
  )

  useEffect(() => {
    const greeting = GREETING_BY_LANG[language] || GREETING_BY_LANG.en
    setMessages((prev) => {
      if (!prev.length || prev[0].from !== "bot") return prev
      const updated = { ...prev[0], text: greeting }
      return [updated, ...prev.slice(1)]
    })
  }, [language])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending, error])

  useEffect(() => {
    if (userProfile?.role !== "admin") return
    if (!Array.isArray(catalog) || catalog.length === 0) return

    const outOfStock = catalog.filter((product) => getProductStock(product) <= 0)
    const lowStock = catalog.filter((product) => getProductStock(product) > 0 && getProductStock(product) <= LOW_STOCK_THRESHOLD)

    if (outOfStock.length === 0 && lowStock.length === 0) return

    // Create a stable key based on the IDs of affected items to prevent duplicate alerts on re-renders
    const key = [...outOfStock, ...lowStock]
      .map((product) => product.id || product.slug)
      .sort()
      .join("|")

    if (lowStockNoticeRef.current.key === key && lowStockNoticeRef.current.acknowledged) {
      return
    }

    lowStockNoticeRef.current = { key, acknowledged: true }
    setOpen(true)

    const newMessages = []

    // 1. Out of Stock Alert
    if (outOfStock.length > 0) {
      newMessages.push({
        id: Date.now(),
        from: "bot",
        type: "product-list",
        title: "🔴 Out of Stock Alert",
        description: `These ${outOfStock.length} items have 0 stock!`,
        items: outOfStock.slice(0, 6).map((product) => ({
          product,
          purchasedBefore: false,
          actions: [{ label: "Manage in Admin", type: "admin" }],
        })),
      })
    }

    // 2. Low Stock Alert
    if (lowStock.length > 0) {
      newMessages.push({
        id: Date.now() + 50, // Slight offset
        from: "bot",
        type: "product-list",
        title: "⚠️ Low Stock Alert",
        description: `These ${lowStock.length} items are running low (≤ ${LOW_STOCK_THRESHOLD}).`,
        items: lowStock.slice(0, 6).map((product) => ({
          product,
          purchasedBefore: false,
          actions: [{ label: "Restock via Chat", type: "admin" }], // Differentiate label if desired
        })),
      })
    }

    if (newMessages.length > 0) {
      setMessages((prev) => [...prev, ...newMessages])
    }
  }, [catalog, getProductStock, userProfile])

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
  const promotionsSummary = useMemo(() => summarizePromotions(promotions), [promotions])

  const siteContext = useMemo(() => {
    const sections = []
    if (catalogSummary) sections.push(`Catalog:\n${catalogSummary}`)
    if (locationSummary) sections.push(`Store locations:\n${locationSummary}`)
    if (promotionsSummary) sections.push(`Current Promotions:\n${promotionsSummary}`)
    if (userProfile) {
      sections.push(`Current User Context:\nName: ${userProfile.full_name || "Guest"}\nRole: ${userProfile.role || "customer"}\nTier: ${userProfile.membership_tier || "Member"}\nPoints: ${userProfile.membership_points || 0}`)

      if (userProfile.role === "admin") {
        const totalSkus = catalog.length
        const totalUnits = catalog.reduce((sum, p) => sum + (Number(p.onlineStock) || Number(p.stock) || 0), 0)
        const complaintsCount = adminStats?.complaints ?? "Unknown"
        sections.push(`[ADMIN INTERNAL STATS]:\nTotal SKUs: ${totalSkus}\nTotal Units On Hand: ${totalUnits}\nTotal Complaints: ${complaintsCount}`)
      }

      if (userProfile.role === "supplier") {
        const rev = supplierStats?.revenue || 0
        const val = supplierStats?.inventoryValue || 0
        sections.push(`[SUPPLIER STATS]:\nTotal Revenue: $${rev}\nInventory Value: $${val}\nYou can ask about these stats, file a complaint, or add a product.`)
      }
    }
    return sections.join("\n\n")
  }, [catalogSummary, locationSummary, promotionsSummary, userProfile, supplierStats])

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
    const categories = []

    // Support [[NAV:/path]]
    let cleaned = text.replace(NAV_DIRECTIVE_REGEX, (_, rawPath) => {
      const normalized = (rawPath || "").trim()
      if (normalized) {
        const ensured = normalized.startsWith("/") ? normalized : `/${normalized}`
        directives.push(ensured)
      }
      return ""
    })

    // Support [[CAT:Category Name]]
    cleaned = cleaned.replace(/\[\[CAT:([^\]]+)\]\]/gi, (_, catName) => {
      const normalized = (catName || "").trim()
      if (normalized) {
        categories.push(normalized)
      }
      return ""
    })

    return { cleaned: cleaned.trim(), directives, categories }
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


  const findRecipeIdea = useCallback(
    (text) => {
      const normalized = normalizeCommandText(text)
      if (!normalized) return null
      return RECIPE_IDEAS.find((idea) =>
        idea.keywords.some((keyword) => normalized.includes(keyword)),
      )
    },
    [normalizeCommandText],
  )

  const findProductMatch = useCallback(
    (ingredient) => {
      if (!ingredient || !Array.isArray(catalog)) return null
      const normalized = normalizeCommandText(ingredient)
      if (!normalized) return null
      const tokens = normalized.split(" ").filter((token) => token.length >= 3)
      const wordRegexes = tokens.map((token) => new RegExp(`\\b${token}\\b`, "i"))
      return (
        catalog.find((product) => {
          const inStock = Number(product.onlineStock ?? product.stock ?? 0) > 0
          if (!inStock) return false
          const haystack = normalizeCommandText(
            `${product.name || ""} ${product.slug || ""}`,
          )
          if (!haystack) return false
          if (haystack.includes(normalized)) return true
          return wordRegexes.some((regex) => regex.test(haystack))
        }) || null
      )
    },
    [catalog, normalizeCommandText],
  )

  const buildRecipeCard = useCallback(
    (recipe) => {
      if (!recipe) return null
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
      const items = ingredients
        .map((ingredient) => {
          const match = findProductMatch(ingredient)
          if (!match) return null
          return {
            name: ingredient,
            product: match,
            image:
              match.image ||
              "https://via.placeholder.com/120x120.png?text=Ingredient",
          }
        })
        .filter(Boolean)
      return {
        title: recipe.title,
        description: recipe.description,
        items,
      }
    },
    [findProductMatch],
  )

  const handleRecipeIntent = useCallback(
    (text) => {
      const idea = findRecipeIdea(text)
      if (!idea) return null
      return buildRecipeCard(idea)
    },
    [buildRecipeCard, findRecipeIdea],
  )

  const extractDishName = useCallback((text) => {
    if (!text) return null
    const lowered = text.toLowerCase()

    // Ignore non-recipe commands
    if (lowered.includes("complaint") || lowered.includes("report") || lowered.includes("mistake")) return null

    const match =
      lowered.match(/(?:make|cook|prepare|recipe for|ingredients for|how to make)\s+(.+)/) ||
      lowered.match(/(?:need|want)\s+to\s+(?:make|cook|prepare)\s+(.+)/)
    if (!match || !match[1]) return null

    const caught = match[1]
      .replace(/\bto\s+(?:my\s+)?cart\b.*$/i, "")
      .replace(/[?.!]+$/, "")
      .trim()

    // Filter out short garbage
    if (caught.length < 3 || /^(me|it|that|this)$/i.test(caught)) return null
    return caught
  }, [])

  const parseRecipePayload = useCallback((rawText) => {
    if (!rawText) return null
    const trimmed = rawText.trim()
    let payload = null
    try {
      payload = JSON.parse(trimmed)
    } catch (_) {
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          payload = JSON.parse(jsonMatch[0])
        } catch (_) {
          payload = null
        }
      }
    }
    if (!payload) return null
    const ingredients = Array.isArray(payload.ingredients)
      ? payload.ingredients
        .map((item) => {
          if (!item) return ""
          if (typeof item === "string") return item
          if (typeof item === "object") {
            return item.name || item.ingredient || item.item || ""
          }
          return String(item)
        })
        .filter(Boolean)
        .slice(0, 10)
      : []
    if (!ingredients.length) return null
    return {
      title: payload.title || "Recipe ingredients",
      description: payload.description || "Here are the key ingredients to get started.",
      ingredients,
    }
  }, [])

  const fetchRecipeFromGroq = useCallback(
    async (dishName) => {
      if (!groqSettings || !dishName) return null
      const messagesPayload = [
        {
          role: "system",
          content:
            "You are a recipe assistant. Reply with JSON only: {\"title\":\"...\",\"description\":\"...\",\"ingredients\":[\"item1\",\"item2\"]}. Keep ingredients simple grocery items.",
        },
        {
          role: "user",
          content: `Give ingredients for ${dishName}.`,
        },
      ]

      const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqSettings.apiKey}`,
        },
        body: JSON.stringify({
          model: groqSettings.model,
          messages: messagesPayload,
          temperature: 0.4,
        }),
      })

      if (!response.ok) return null
      const payload = await response.json()
      const replyText =
        payload?.choices
          ?.map((choice) => choice?.message?.content || "")
          .find((entry) => entry && entry.trim())
          ?.trim() || ""
      return parseRecipePayload(replyText)
    },
    [groqSettings, parseRecipePayload],
  )

  const handleDynamicRecipeIntent = useCallback(
    async (text) => {
      const dishName = extractDishName(text)
      if (!dishName) return null

      // 1. Redirect to recipes page
      window.initialRecipeSearch = dishName
      safeNavigate("/recipes")

      // 2. Fetch recipe details to show in chat as well
      const groqRecipe = await fetchRecipeFromGroq(dishName)
      if (groqRecipe) {
        return buildRecipeCard(groqRecipe)
      }

      const fallback = handleRecipeIntent(text)
      if (fallback) return fallback

      return `Opening the recipes page directly for "${dishName}"...`
    },
    [buildRecipeCard, extractDishName, fetchRecipeFromGroq, handleRecipeIntent, safeNavigate],
  )


  const handleShortcutNavigation = useCallback(
    (text) => {
      if (!text) return null
      const normalized = normalizeCommandText(text)
      const shortcuts = [
        { regex: /(go to|open|show)\s+(login|sign in)/, path: "/login", reply: "Heading to login for you." },
        { regex: /(go to|open|show)\s+(supplier center|supplier dashboard|vendor portal)/, path: "/supplier", reply: "Opening the Supplier Center." },
        { regex: /(go to|open|show)\s+(admin center|admin dashboard|control panel)/, path: "/admin", reply: "Opening the Admin Center." },
        { regex: /(go to|open|show)\s+(cart|bag|basket)/, path: "/cart", reply: "Opening your cart now." },
        { regex: /(go to|open|show)\s+(checkout|payment)/, path: "/checkout", reply: "Opening checkout." },
        { regex: /(go to|open|show)\s+(help|support|customer service)/, path: "/help", reply: "Opening the Help Center." },
        { regex: /(go to|open|show)\s+(saved items|saved list|favorites)/, path: "/saved", reply: "Opening your saved items." },
        { regex: /(go to|open|show)\s+(purchase history|order history|past orders)/, path: "/history", reply: "Showing your purchase history." },
        { regex: /(go to|open|show)\s+(order tracking|track order|delivery status)/, path: "/tracking", reply: "Taking you to order tracking." },
        { regex: /(go to|open|show)\s+(membership|loyalty|tier)/, path: "/membership", reply: "Opening your membership page." },
        { regex: /(go to|open|show)\s+(profile|my account|settings)/, path: "/profile", reply: "Going to your profile." },
        { regex: /(go to|open|show)\s+(feedback|review|survey)/, path: "/feedback", reply: "Opening the feedback page." },
        { regex: /(go to|open|show)\s+(locations?|stores?|where are you)/, path: "/locations", reply: "Showing our store locations." },
        { regex: /(go to|open|show)\s+(about|info|company)/, path: "/about", reply: "Taking you to the about page." },
        { regex: /(go to|open|show)\s+(terms|legal|privacy)/, path: "/terms", reply: "Showing our terms and privacy info." },
        { regex: /(recommend|reccomend|suggest|show)\s+(recipes?|meals?)/, path: "/recipes", reply: "Here are recipe ideas for you." },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?fresh produce/i, path: "/", reply: "Showing you our fresh produce category.", category: "Fresh Produce" },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?pantry staples/i, path: "/", reply: "Opening the pantry staples section.", category: "Pantry Staples" },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?beverages/i, path: "/", reply: "Heading to the beverages section.", category: "Beverages" },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?drinks/i, path: "/", reply: "Heading to the beverages section.", category: "Beverages" },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?home care/i, path: "/", reply: "Showing home care products.", category: "Home Care" },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?snacks/i, path: "/", reply: "Opening snacks and treats.", category: "Snacks & Treats" },
        { regex: /(?:show|open|view|go to|i want|get|any|some|the|find)\s+(?:the\s+)?treats/i, path: "/", reply: "Opening snacks and treats.", category: "Snacks & Treats" },
      ]
      const match = shortcuts.find((item) => item.regex.test(normalized))
      if (!match) {
        if (normalized.includes("recipe") || normalized.includes("meal")) {
          safeNavigate("/recipes")
          return "Here are recipe ideas for you."
        }
        return null
      }
      if (match.category) {
        onCategoryChange?.(match.category)
      }
      safeNavigate(match.path)
      return match.reply
    },
    [normalizeCommandText, safeNavigate, onCategoryChange],
  )

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

  const findProductMatches = useCallback(
    (hint) => {
      const normalizedHint = normalizeCommandText(hint)
      if (!normalizedHint) return []
      if (!Array.isArray(catalog)) return []
      const tokens = normalizedHint.split(" ").filter((token) => token.length >= 3)
      const isShortHint = normalizedHint.length <= 3
      const shortRegex = isShortHint ? new RegExp(`\\b${normalizedHint}\\b`, "i") : null

      return catalog
        .map((product) => {
          const name = normalizeCommandText(product.name || "")
          const desc = normalizeCommandText(product.desc || "")
          const category = normalizeCommandText(product.category || "")
          const brand = normalizeCommandText(product.brand || "")
          const slug = normalizeCommandText(product.slug || "")

          let score = 0
          const shortHit =
            isShortHint &&
            shortRegex &&
            (shortRegex.test(name) ||
              shortRegex.test(slug) ||
              shortRegex.test(desc) ||
              shortRegex.test(category) ||
              shortRegex.test(brand))

          if (name === normalizedHint || slug === normalizedHint) score = 1000
          else if (!isShortHint && name.startsWith(normalizedHint)) score = 500
          else if (!isShortHint && name.includes(normalizedHint)) score = 100
          else if (!isShortHint && desc.includes(normalizedHint)) score = 50
          else if (!isShortHint && (category.includes(normalizedHint) || brand.includes(normalizedHint)))
            score = 20
          else if (shortHit) score = 60
          else if (!isShortHint && tokens.some((token) => name.includes(token))) score = 10

          // Boost score if purchased before so it moves to top 5
          if (score > 0 && checkIfPurchasedBefore(product)) {
            score += 2000
          }

          return { product, score }
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.product)
        .slice(0, 5)
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
      const matches = findProductMatches(productHint)
      if (matches.length === 0) {
        return `I couldn't find "${productHint}" in the catalog. Could you try another name?`
      }
      rememberLastProducts(productHint, matches)
      if (matches.length === 1) {
        const product = matches[0]
        const previouslyPurchased = checkIfPurchasedBefore(product)
        onAddToCart?.(product, quantity)
        let reply = `Added ${quantity} x ${product.name || product.slug} to your cart.`
        if (previouslyPurchased) {
          reply = `You have purchased this version of ${product.name || "item"
            } before! Would you want to re-order again? I've added it to your cart for you.`
        }
        return reply
      }

      setPendingCartChoice({ options: matches, quantity })
      return {
        type: "product-list",
        title: `I found ${matches.length} items for "${productHint}"`,
        description: "Which one would you like to add to your cart?",
        quantity,
        items: matches.map((p) => ({
          product: p,
          purchasedBefore: checkIfPurchasedBefore(p),
        })),
      }
    },
    [findProductMatches, onAddToCart, checkIfPurchasedBefore, rememberLastProducts],
  )

  const handlePendingCartChoice = useCallback(
    (text) => {
      if (!pendingCartChoice) return null
      const trimmed = String(text || "").trim()
      const choiceIndex = Number(trimmed.match(/^\d+/)?.[0])
      let product = null
      if (
        Number.isFinite(choiceIndex) &&
        choiceIndex >= 1 &&
        choiceIndex <= pendingCartChoice.options.length
      ) {
        product = pendingCartChoice.options[choiceIndex - 1]
      } else {
        const normalized = normalizeCommandText(trimmed)
        product =
          pendingCartChoice.options.find((option) => {
            const haystack = [
              option.name,
              option.slug,
              option.brand,
              option.category,
              option.desc,
            ]
              .filter(Boolean)
              .map((value) => normalizeCommandText(value))
              .join(" ")
            return haystack.includes(normalized)
          }) || null
      }
      if (!product) {
        return "Please reply with the number of the item you want."
      }
      onAddToCart?.(product, pendingCartChoice.quantity || 1)
      setPendingCartChoice(null)
      return `Added ${pendingCartChoice.quantity || 1} x ${product.name || product.slug
        } to your cart.`
    },
    [normalizeCommandText, onAddToCart, pendingCartChoice],
  )

  const handleShowProductIntent = useCallback(
    (text) => {
      const match = text.match(
        /(?:show|view|open|find|tell me about|search for|want|need|looking for|get me|do you have|carry|sell|provide)\s+(?:me\s+)?(?:any\s+)?(.+?)(?:$|\?)/i,
      )
      if (!match) return null
      const productHint = match[1].trim()
      const matches = findProductMatches(productHint)
      if (matches.length === 0) {
        return `I couldn't find "${productHint}" in the catalog. Could you try another name?`
      }
      rememberLastProducts(productHint, matches)

      if (matches.length === 1) {
        const product = matches[0]
        const previouslyPurchased = checkIfPurchasedBefore(product)
        safeNavigate(`/product/${product.slug}`)
        let reply = `Opening ${product.name || product.slug} for you.`
        if (previouslyPurchased) {
          reply += " You've ordered this version before! Do you want to repurchase?"
        }
        return reply
      }

      const items = matches.map((p) => ({
        product: p,
        purchasedBefore: checkIfPurchasedBefore(p),
      }))

      const hasRepurchase = items.some((item) => item.purchasedBefore)
      const description = hasRepurchase
        ? "I noticed you have purchased some of these before! Would you want to re-order again?"
        : "Here are the items I found. You can add them to your cart or view details."

      return {
        type: "product-list",
        title: `Matches for "${productHint}"`,
        description,
        items,
      }
    },
    [findProductMatches, safeNavigate, checkIfPurchasedBefore, rememberLastProducts],
  )

  const handleInteractionStep = useCallback(async (text) => {
    const { mode, data } = interactionState
    const supabase = getSupabaseClient()
    const normalized = normalizeCommandText(text)

    if (normalized === "cancel" || normalized === "stop") {
      setInteractionState({ mode: "idle", data: {} })
      return "Operation cancelled."
    }

    // --- File Complaint Flow (REMOVED: Use redirect) ---
    // if (mode === "complaint_subject") ...

    return null
  }, [interactionState, normalizeCommandText, userProfile])



  const handleSpecialIntent = useCallback(
    async (text) => {
      // 1. Check if we are in a multi-step flow
      if (interactionState.mode !== "idle") {
        const stepReply = await handleInteractionStep(text)
        if (stepReply) return stepReply
      }

      if (!text) return null
      const pendingReply = handlePendingCartChoice(text)
      if (pendingReply) return pendingReply
      const shortcutReply = handleShortcutNavigation(text)
      if (shortcutReply) return shortcutReply
      const normalized = normalizeCommandText(text)
      const isActiveUser = userProfile != null
      const isAdmin = userProfile?.role === "admin"
      const isSupplier = userProfile?.role === "supplier"

      // ---------------- SUPPLIER COMMANDS ----------------
      if (isSupplier) {
        if (/(total\s+sales|my\s+sales|revenue)/.test(normalized)) {
          safeNavigate("/supplier")
          return "Here is the dashboard where you can see your sales info."
        }

        if (/(inventory\s+value|stock\s+value|stock|inventory)/.test(normalized)) {
          window.activeSupplierTab = "inventory"
          safeNavigate("/supplier")
          return "Here is the inventory tab where you can see your stock info."
        }

        if (/(file|make|submit)\s+(a\s+)?(complaint|report|issue)|(contact\s+admin)/.test(normalized)) {
          window.activeSupplierTab = "support"
          safeNavigate("/supplier")
          return "Opening the Support tab in Supplier Center. You can file your complaint there."
        }

        if (/(add|create|new)\s+(a\s+)?(product|item)/.test(normalized)) {
          window.activeSupplierTab = "products"
          safeNavigate("/supplier")
          return "Opening the Supplier Center. You can add new products in the Products tab."
        }
      }
      // -------------------------------------------------

      // ---------------- ADMIN COMMANDS ----------------
      if (isAdmin) {
        // Add stock to low stock items
        if (/(add|update|restock|fill).*(stock)/i.test(normalized) && /(low|items|products|inventory)/i.test(normalized)) {
          if (!Array.isArray(catalog)) return "I can't access the catalog right now."
          // find items <= LOW_STOCK_THRESHOLD (5)
          const lowStockItems = catalog.filter((p) => getProductStock(p) <= LOW_STOCK_THRESHOLD)

          if (lowStockItems.length === 0) {
            return `All items are well stocked right now (above ${LOW_STOCK_THRESHOLD} units).`
          }

          // Try to allow generic "add stock" (default 20) or specific "add 5 stock"
          const amountMatch = normalized.match(/(?:add|update|fill)\s+(\d+)/i) || normalized.match(/(\d+)\s+stock/i)
          const validQuantity = amountMatch ? parseInt(amountMatch[1], 10) : 20

          let updatedCount = 0
          lowStockItems.forEach((p) => {
            const current = getProductStock(p)
            const nextStock = current + validQuantity
            onProductUpdate({ ...p, stock: nextStock })
            updatedCount++
          })

          return `I've added ${validQuantity} units of stock to ${updatedCount} low-stock items. Inventory updated.`
        }

        // 1. Feedback
        if (/(check|see|view|open).*(customer\s+feedback|feedback|complaints)/i.test(normalized)) {
          window.activeAdminTab = "support"
          safeNavigate("/admin")
          return "Opening the Customer Feedback tab in Admin Dashboard."
        }

        // 2. Add product
        if (/(add|create|new).*(product|item)/i.test(normalized)) {
          window.activeAdminTab = "add"
          safeNavigate("/admin")
          return "Opening the Products tab to add a new item."
        }

        // 3. Inventory
        if (/(see|check|view|open).*(inventory|stock)/i.test(normalized)) {
          window.activeAdminTab = "inventory"
          safeNavigate("/admin")
          return "Opening the Inventory tab in Admin Dashboard."
        }

        // Add proper navigation for admin tasks (Existing)
        if (/(add|create|new|make).*(promotion|promo|deal|offer)/i.test(normalized)) {
          window.activeAdminTab = "promotions"
          safeNavigate("/admin")
          return "Opening the Promotions tab in Admin Center. You can add your new deal there."
        }

        if (/(change|update|edit|modify).*(store|location|hours|branch)/i.test(normalized)) {
          window.activeAdminTab = "stores"
          safeNavigate("/admin")
          return "Opening the Store Hours tab in Admin Center."
        }
      }
      // ----------------------------------------------

      if (/^(?:[a-z]+)$/.test(normalized) && normalized.length <= 10 && !/[aeiou]/.test(normalized)) {
        return "I did not catch that. Could you rephrase your question?"
      }

      if (/(log\s*out|logout|sign\s*out)/.test(normalized)) {
        onLogout?.()
        safeNavigate("/")
        return "You are logged out. Come back anytime."
      }

      if (/(update|change).*(delivery\s+address|address)/.test(normalized)) {
        safeNavigate("/profile")
        return "You can update your delivery address in your profile."
      }

      if (/(talk\s+to\s+a\s+human|human\s+agent|representative|customer\s+service|live\s+agent|support)/.test(normalized)) {
        safeNavigate("/help")
        return "I can connect you with a FreshMart teammate in the Help Center."
      }

      if (/(this\s+app\s+is\s+broken|app\s+is\s+broken|site\s+is\s+broken|broken|bug)/.test(normalized)) {
        safeNavigate("/help")
        return "Sorry about that. Please tell me what went wrong, or I can open the Help Center for you."
      }

      if (/you\s*('?re|are)\s+not\s+answering/.test(normalized)) {
        return "Sorry about that. Tell me what you need and I will do my best."
      }

      if (/(i\s+made\s+a\s+mistake|made\s+a\s+mistake|wrong\s+order)/.test(normalized)) {
        return "No worries. Tell me what to fix and I will help."
      }

      if (/(why\s+do\s+you\s+exist|why\s+are\s+you\s+here)/.test(normalized)) {
        return "I am here to help you shop faster and answer store questions."
      }

      if (/(order\s+pizza|pizza)/.test(normalized) && /(order|deliver|buy)/.test(normalized)) {
        return "I cannot order pizza, but I can help with groceries and FreshMart orders."
      }

      // Check for explicit recipe search (e.g. "make fried rice", "recipe for pasta")
      // Uses normalized text to handle case/punctuation
      const recipeSearchMatch =
        normalized.match(/^(?:i\s+want\s+to\s+|can\s+you\s+|please\s+)?(?:how\s+to\s+make|make|cook|prepare|recipe\s+for|find\s+recipe\s+for)\s+(?!.*(complaint|report|mistake|bug|suggestion))(.+)$/i)

      if (recipeSearchMatch) {
        const dish = recipeSearchMatch[recipeSearchMatch.length - 1].trim()

        // simple heuristic to ensure it's not a long sentence describing a bug
        if (dish.length > 2 && dish.length < 50 && !/^(me|it|that|this)$/i.test(dish)) {
          window.initialRecipeSearch = dish
          safeNavigate("/recipes")
          return `Searching for "${dish}" recipes...`
        }
      }

      const cookMatch =
        text.match(/what\s+can\s+i\s+(?:make|cook)(?:\s+with)?\s+(.+?)(?:\?|$)/i) ||
        text.match(/i\s+(?:have|got)\s+(.+?)\s+what\s+can\s+i\s+(?:make|cook)/i)
      if (cookMatch && cookMatch[1]) {
        const ingredients = cookMatch[1]
          .split(/,|and/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 6)
        if (ingredients.length > 0) {
          const suggestion = {
            title: "Recipe ideas",
            description: "Here are quick ideas based on what you have.",
            ingredients,
          }
          onRecipeSuggestion?.(suggestion)
          safeNavigate("/recipes")
          return "Opening the recipes page with ideas based on your ingredients."
        }
      }

      if (/(what('?s| is)?\s+in\s+my\s+cart|show\s+my\s+cart|view\s+my\s+cart|cart\s+items)/.test(normalized)) {
        safeNavigate("/cart")
        return formatCartSummary()
      }

      const removeMatch = text.match(/remove\s+(.+?)(?:\s+from)?\s+(?:my\s+)?cart/i)
      if (removeMatch && removeMatch[1]) {
        const productHint = removeMatch[1].trim()
        const normalizedHint = normalizeCommandText(productHint)
        const cartMatch =
          cartItems.find((item) => normalizeCommandText(item.name || "") === normalizedHint) ||
          cartItems.find((item) => normalizeCommandText(item.slug || "") === normalizedHint) ||
          cartItems.find((item) => normalizeCommandText(item.name || "").includes(normalizedHint))
        if (cartMatch) {
          onRemoveFromCart?.(cartMatch.slug)
          return `Removed ${cartMatch.name || cartMatch.slug} from your cart.`
        }
        return `I could not find "${productHint}" in your cart.`
      }

      const updateMatch = text.match(/(?:change|update|set)\s+(?:the\s+)?(?:quantity|qty)\s+of\s+(.+?)\s+to\s+(\d+)/i)
      if (updateMatch && updateMatch[1]) {
        const productHint = updateMatch[1].trim()
        const nextQuantity = Number(updateMatch[2])
        const normalizedHint = normalizeCommandText(productHint)
        const cartMatch =
          cartItems.find((item) => normalizeCommandText(item.name || "") === normalizedHint) ||
          cartItems.find((item) => normalizeCommandText(item.slug || "") === normalizedHint) ||
          cartItems.find((item) => normalizeCommandText(item.name || "").includes(normalizedHint))
        if (!cartMatch) {
          return `I could not find "${productHint}" in your cart.`
        }
        if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
          return "Tell me the quantity you want, for example: change quantity of milk to 2."
        }
        onUpdateCartQuantity?.(cartMatch.slug, nextQuantity)
        return `Updated ${cartMatch.name || cartMatch.slug} to quantity ${nextQuantity}.`
      }

      if (/(change|update).*(delivery\s+time|delivery\s+slot)/.test(normalized)) {
        safeNavigate("/checkout")
        return "You can change delivery time during checkout. If the order is already placed, use the Help Center."
      }

      if (/(save|keep)\s+(?:this\s+)?cart\s+for\s+later/.test(normalized)) {
        safeNavigate("/saved")
        return "You can save items individually. I can take you to Saved Items if you want."
      }

      if (/(earliest|next)\s+delivery|delivery\s+window/.test(normalized)) {
        safeNavigate("/checkout")
        return "The earliest delivery times are shown during checkout."
      }

      if (/(same[-\s]?day)\s+delivery/.test(normalized)) {
        safeNavigate("/checkout")
        return "Same-day delivery depends on your area and cutoff times. Check availability at checkout."
      }

      if (/(delivery\s+fee|delivery\s+cost|shipping\s+fee)/.test(normalized)) {
        safeNavigate("/checkout")
        return "Delivery fees are shown at checkout."
      }

      if (/(switch|change)\s+(?:from\s+)?delivery\s+(?:to\s+)?pickup|pickup\s+instead/.test(normalized)) {
        safeNavigate("/checkout")
        return "You can switch to pickup during checkout. If your order is already placed, use the Help Center."
      }

      const substitutionMatch = text.match(/substitute\s+(.+?)\s+if\s+(.+?)\s+(?:is|isn't|is\s+not)?\s*unavailable/i)
      if (substitutionMatch) {
        const substitute = substitutionMatch[1].trim()
        const original = substitutionMatch[2].trim()
        setShoppingPrefs((prev) => ({
          ...prev,
          substitutionsAllowed: true,
          substitutionNotes: [
            ...prev.substitutionNotes,
            `Substitute ${substitute} if ${original} is unavailable`,
          ].slice(-5),
        }))
        return `Got it. I will substitute ${substitute} if ${original} is unavailable.`
      }

      if (/(don'?t|do\s+not)\s+substitute/.test(normalized)) {
        setShoppingPrefs((prev) => ({
          ...prev,
          substitutionsAllowed: false,
        }))
        return "Understood. I will not substitute items."
      }

      if (/(remember|prefer).*(organic\s+produce|organic)/.test(normalized)) {
        setShoppingPrefs((prev) => ({
          ...prev,
          preferOrganic: true,
        }))
        return "Noted. I will prioritize organic produce in recommendations."
      }

      if (/(my\s+preferences|substitution\s+preferences|shopping\s+preferences)/.test(normalized)) {
        const substitutionLine = shoppingPrefs.substitutionsAllowed
          ? "Substitutions are allowed."
          : "Substitutions are not allowed."
        const organicLine = shoppingPrefs.preferOrganic
          ? "You prefer organic produce."
          : "No organic preference set."
        const notes = shoppingPrefs.substitutionNotes.length
          ? `Notes: ${shoppingPrefs.substitutionNotes.join("; ")}`
          : "No substitution notes yet."
        return `${substitutionLine} ${organicLine} ${notes}`
      }

      if (/(apply|use)\s+(?:my\s+)?coupon|promo\s+code|voucher/.test(normalized)) {
        safeNavigate("/checkout")
        return "You can apply coupons during checkout. Share the code and I will add it."
      }

      if (/(reorder|order\s+again|buy\s+again|reorder\s+my\s+last|reorder\s+last)/.test(normalized)) {
        const latest = Array.isArray(orders) ? orders[0] : null
        const items = latest?.items || latest?.order_items || []
        if (!latest || items.length === 0) {
          return "I could not find a recent order to reorder."
        }
        const added = []
        items.forEach((item) => {
          const product = findProductFromOrderItem(item)
          if (!product) return
          const quantity = Number(item.quantity || 1)
          onAddToCart?.(product, quantity)
          added.push(product)
        })
        if (added.length === 0) {
          return "I could not match items from your last order to the current catalog."
        }
        safeNavigate("/cart")
        return `Added ${added.length} item${added.length === 1 ? "" : "s"} from your last order to your cart.`
      }

      if (/(reward\s+points|points\s+balance|loyalty\s+points)/.test(normalized)) {
        const points = userProfile?.membership_points ?? 0
        return `You have ${points} point${points === 1 ? "" : "s"} in your rewards balance.`
      }

      if (/(discounts?|sales?)\s+on\s+(fruit|fruits|vegetable|vegetables|produce)/.test(normalized)) {
        if (!promotions || promotions.length === 0) {
          return "There are no produce promotions listed right now, but check back soon."
        }
        const produceKeywords = ["fruit", "fruits", "vegetable", "vegetables", "produce"]
        const promoItems = promotions
          .map((promo) => {
            const product = catalog.find((p) => p.slug === promo.slug)
            if (!product) return null
            const haystack = getProductHaystack(product)
            if (!produceKeywords.some((kw) => haystack.includes(kw))) return null
            return product
          })
          .filter(Boolean)
        if (promoItems.length === 0) {
          return "There are no produce promotions listed right now, but check back soon."
        }
        rememberLastProducts("produce promotions", promoItems)
        return buildProductListResponse(
          "Produce promotions",
          "Here are current produce discounts.",
          promoItems.slice(0, 5),
        )
      }

      if (/(buy\s+one\s+get\s+one|bogo)/.test(normalized)) {
        const hasBogo = (promotions || []).some((promo) =>
          String(promo.headline || "").toLowerCase().includes("buy one") ||
          String(promo.detail || "").toLowerCase().includes("buy one") ||
          String(promo.headline || "").toLowerCase().includes("bogo") ||
          String(promo.detail || "").toLowerCase().includes("bogo")
        )
        if (!hasBogo) {
          return "I do not see any buy-one-get-one deals right now."
        }
        return "Yes, we have buy-one-get-one deals in the promotions list."
      }

      if (/(more\s+expensive|price\s+higher|costs\s+more).*(last\s+week|before)/.test(normalized)) {
        return "I do not have historical price data to compare right now."
      }

      const maxPrice = extractMaxPrice(text)
      const wantsCheapest = /(cheapest|lowest\s+price|least\s+expensive)/.test(normalized)
      const wantsOrganic = normalized.includes("organic")
      const wantsGlutenFree = normalized.includes("gluten free")
      const wantsVegan = normalized.includes("vegan")
      const wantsVegetarian = normalized.includes("vegetarian")
      const wantsFrozen = normalized.includes("frozen")
      const wantsSnack = normalized.includes("snack")
      const wantsMeal = normalized.includes("meal")
      const wantsMilk = normalized.includes("milk")
      const wantsOliveOil = normalized.includes("olive oil")
      const wantsOatMilk = normalized.includes("oat milk")

      if (wantsCheapest && wantsMilk) {
        const milkMatches = findProductsByTerms(["milk"], { requireAll: true, limit: 100 })
        const priced = milkMatches
          .map((product) => ({ product, price: parsePrice(product.price) }))
          .filter((entry) => entry.price !== null)
          .sort((a, b) => a.price - b.price)
        if (priced.length === 0) {
          return "I could not find any milk items with a listed price."
        }
        const cheapest = priced[0]
        rememberLastProducts("cheapest milk", [cheapest.product])
        return buildProductListResponse(
          "Cheapest milk",
          `Lowest price right now is $${cheapest.price.toFixed(2)}.`,
          [cheapest.product],
        )
      }

      if (wantsOatMilk) {
        const matches = findProductsByTerms(["oat milk"], { requireAll: false, limit: 5 })
        if (matches.length > 0) {
          rememberLastProducts("oat milk", matches)
          return buildProductListResponse(
            "Oat milk options",
            "Here are oat milk products we carry.",
            matches,
          )
        }
      }

      if (wantsOliveOil && /(recommend|suggest|which\s+brand|what\s+brand)/.test(normalized)) {
        const matches = findProductsByTerms(["olive oil"], { requireAll: true, limit: 5 })
        if (matches.length === 0) {
          return "I could not find olive oil in the catalog right now."
        }
        rememberLastProducts("olive oil", matches)
        return buildProductListResponse(
          "Olive oil picks",
          "Here are a few olive oils to consider.",
          matches,
        )
      }

      if (wantsOrganic && normalized.includes("banana")) {
        const matches = findProductsByTerms(["banana", "organic"], { requireAll: true, limit: 5 })
        if (matches.length > 0) {
          rememberLastProducts("organic bananas", matches)
          return buildProductListResponse(
            "Organic bananas",
            "Here are organic banana options in stock.",
            matches,
          )
        }
        const fallback = findProductsByTerms(["banana"], { requireAll: true, limit: 5 })
        if (fallback.length > 0) {
          rememberLastProducts("bananas", fallback)
          return buildProductListResponse(
            "Bananas",
            "I could not find organic bananas, but here are banana options.",
            fallback,
          )
        }
      }

      if (wantsGlutenFree || wantsVegan || wantsVegetarian || wantsOrganic || wantsFrozen || wantsSnack) {
        const terms = []
        if (wantsGlutenFree) terms.push("gluten free")
        if (wantsVegan) terms.push("vegan")
        if (wantsVegetarian) terms.push("vegetarian")
        if (wantsOrganic) terms.push("organic")
        if (wantsFrozen) terms.push("frozen")
        if (wantsSnack) terms.push("snack")
        if (wantsMeal) terms.push("meal")
        const matches = findProductsByTerms(terms, {
          requireAll: true,
          maxPrice,
          limit: 6,
        })
        if (matches.length > 0) {
          rememberLastProducts(terms.join(" "), matches)
          const priceNote = maxPrice !== null ? ` under $${maxPrice.toFixed(2)}` : ""
          return buildProductListResponse(
            "Filtered picks",
            `Here are ${terms.join(", ")} items${priceNote}.`,
            matches,
          )
        }
      }

      if (/(in\s+stock|available\s+now|availability)/.test(normalized)) {
        const stockMatch = text.match(/(?:is|are)\s+(.+?)\s+(?:in\s+stock|available)/i)
        const productHint = stockMatch?.[1]?.trim()
        if (productHint) {
          const matches = findProductMatches(productHint)
          if (matches.length > 0) {
            rememberLastProducts(productHint, matches)
            const product = matches[0]
            const stockQty = getProductStock(product)
            if (stockQty > 0) {
              return `${product.name} is in stock online (${stockQty} available).`
            }
            return `${product.name} is currently out of stock online.`
          }
        }
      }

      if (/(when\s+will|restock|back\s+in\s+stock)/.test(normalized)) {
        const restockMatch = text.match(/(?:when\s+will|restock|back\s+in\s+stock)\s+(.+?)(?:$|\?)/i)
        const productHint = restockMatch?.[1]?.trim()
        if (productHint) {
          const matches = findProductMatches(productHint)
          if (matches.length > 0) {
            rememberLastProducts(productHint, matches)
            const product = matches[0]
            const stockQty = getProductStock(product)
            if (stockQty > 0) {
              return `${product.name} is currently in stock (${stockQty} available).`
            }
            return `I do not have a restock date for ${product.name}. Please check back soon.`
          }
        }
        return "I do not have restock dates yet. Please check back soon."
      }

      if (/(larger\s+size|bigger\s+size|larger\s+pack|family\s+size)/.test(normalized)) {
        const hint = lastProductContext.current.items[0]
        if (hint) {
          const baseTokens = normalizeCommandText(hint.name || "")
            .split(" ")
            .filter((token) => token.length >= 4)
            .slice(0, 2)
          const variants = baseTokens.length
            ? findProductsByTerms(baseTokens, { requireAll: false, limit: 5 }).filter(
              (item) => item.slug !== hint.slug,
            )
            : []
          if (variants.length > 0) {
            rememberLastProducts("larger size", variants)
            return buildProductListResponse(
              "Other sizes",
              "Here are similar sizes or pack options.",
              variants,
            )
          }
          return "I do not see other sizes listed yet. Tell me the size you want and I will check."
        }
        return "Which item do you want a larger size for?"
      }

      if (/(nearest\s+store|available\s+at\s+my\s+store|store\s+availability)/.test(normalized)) {
        safeNavigate("/locations")
        return "I can check store availability once you pick a location. Opening store locations now."
      }

      if (/(why\s+is\s+this\s+item\s+unavailable|why\s+unavailable)/.test(normalized)) {
        const hint = lastProductContext.current.items[0]
        if (hint) {
          const stockQty = getProductStock(hint)
          if (stockQty <= 0) {
            return `${hint.name} is temporarily out of stock online. Please check back soon.`
          }
        }
        return "Some items go out of stock due to high demand or supplier delays."
      }

      if (/(similar\s+product|similar\s+item|similar\s+to)/.test(normalized)) {
        const match = text.match(/similar\s+to\s+(.+?)(?:$|\?)/i)
        const hint = match?.[1]?.trim()
        const baseProduct =
          (hint && findProductByName(hint)) || lastProductContext.current.items[0] || null
        if (!baseProduct) return "Tell me which item you want a similar option for."
        const category = normalizeCommandText(baseProduct.category || baseProduct.tag || "")
        const similar = category
          ? catalog.filter((product) => {
            if (product.slug === baseProduct.slug) return false
            return normalizeCommandText(product.category || product.tag || "") === category
          })
          : []
        const list = similar.length > 0
          ? similar.slice(0, 5)
          : findProductMatches(baseProduct.name || baseProduct.slug)
            .filter((product) => product.slug !== baseProduct.slug)
            .slice(0, 5)
        if (list.length === 0) {
          return "I could not find similar options right now."
        }
        rememberLastProducts("similar products", list)
        return buildProductListResponse(
          "Similar products",
          "Here are similar options you might like.",
          list,
        )
      }

      if (/(what\s+can\s+i\s+cook\s+with|quick\s+vegetarian\s+dinner|healthy\s+breakfast)/.test(normalized)) {
        const ingredientMatch = text.match(/cook\s+with\s+(.+)/i)
        const ingredients = ingredientMatch
          ? ingredientMatch[1].split(/,|and/).map((item) => item.trim()).filter(Boolean)
          : []
        if (ingredients.length === 0 && normalized.includes("vegetarian")) {
          ingredients.push("chickpeas", "vegetables", "rice")
        } else if (ingredients.length === 0 && normalized.includes("breakfast")) {
          ingredients.push("oats", "eggs", "fruit")
        }
        if (ingredients.length > 0) {
          const suggestion = {
            title: "Recipe idea",
            description: "Here is a simple idea based on your ingredients.",
            ingredients,
          }
          onRecipeSuggestion?.(suggestion)
          safeNavigate("/")
          return "I added a recipe-inspired filter to your catalog so you can add ingredients quickly."
        }
      }

      if (/(how many|count)\s+(stores|locations)/.test(normalized)) {
        const total = Array.isArray(storeLocations) ? storeLocations.length : 0
        safeNavigate("/locations")
        return `We currently have ${total} store${total === 1 ? "" : "s"} in our network. Opening the store hours page for you.`
      }

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

      if (/(membership|tier|loyalty|status|who am i|my role|my profile)/.test(normalized)) {
        const tier = userProfile?.membership_tier || "FreshMart Member"
        const points = userProfile?.membership_points ?? 0
        const role = userProfile?.role || "customer"
        const name = userProfile?.full_name || "valued customer"
        return `You are logged in as ${name}. Your role is "${role}". You're currently on the ${tier} tier with ${points} point${points === 1 ? "" : "s"}.`
      }

      if (/\b(promotion|promo|sale|sales|discount|deal|deals|offer|savings|reduced)\b/i.test(normalized)) {
        if (!promotions || promotions.length === 0) return "We don't have any specific promotions listed right now, but check back soon for fresh deals!"

        const promoItems = promotions.map(promo => {
          let product = catalog.find(p => p.slug === promo.slug)
          if (!product && promo.headline) {
            const hint = promo.headline.split('—')[0].trim().toLowerCase()
            product = catalog.find(p => (p.name || "").toLowerCase().includes(hint))
          }
          if (!product) return null
          return {
            product,
            purchasedBefore: checkIfPurchasedBefore(product)
          }
        }).filter(Boolean)

        if (promoItems.length > 0) {
          return {
            type: "product-list",
            title: "🔥 Current Promotions",
            description: "Here are the best deals we have for you today:",
            items: promoItems
          }
        }

        const list = promotions.map(p => `- ${p.headline}`).join("\n")
        return `Here are our current promotions:\n${list}`
      }

      if (/(help|what can you do|how to use|commands)/.test(normalized)) {
        return "I can help you find products, check stock, manage your cart, and navigate the app. Try asking things like:\n- 'What's on promotion?'\n- 'Where is my order?'\n- 'Add 2 bananas to my cart'\n- 'Go to my purchase history'\n- 'Who am I?'\n\nI can also help with recipes or finding store locations!"
      }

      const addReply = handleAddToCartIntent(text)
      if (addReply) return addReply

      const showReply = handleShowProductIntent(text)
      if (showReply) return showReply

      // Catch-all for short product queries (up to 4 words)
      // This helps catch "milo", "i want milo", "get some milo", etc.
      const wordCount = normalized.split(" ").length
      if (wordCount <= 4) {
        // Strip common fillers
        const productHint = normalized.replace(/^(i|want|need|get|some|the|to|buy|looking|for|show|me)\s+/g, "").trim()
        const matches = findProductMatches(productHint)
        if (matches.length > 0) {
          rememberLastProducts(productHint, matches)
          const items = matches.map((p) => ({
            product: p,
            purchasedBefore: checkIfPurchasedBefore(p),
          }))

          if (matches.length === 1) {
            const product = matches[0]
            const previouslyPurchased = checkIfPurchasedBefore(product)
            let desc = `I found ${product.name}. Would you like to add it to your cart or view details?`
            if (previouslyPurchased) {
              desc = `You have purchased this version of ${product.name} before! Would you want to re-order again?`
            }
            return {
              type: "product-list",
              title: `Found ${product.name}`,
              description: desc,
              items,
            }
          }

          const hasRepurchase = items.some((i) => i.purchasedBefore)
          return {
            type: "product-list",
            title: `Found ${matches.length} matches for "${productHint}"`,
            description: hasRepurchase
              ? "You have purchased some of these versions before! Would you want to re-order again?"
              : "Select an item to add to your cart or view details.",
            items,
          }
        }
      }

      return null
    },
    [
      handleAddToCartIntent,
      handleShowProductIntent,
      handlePendingCartChoice,
      buildProductListResponse,
      cartItems,
      catalog,
      extractMaxPrice,
      findProductByName,
      findProductFromOrderItem,
      findProductsByTerms,
      formatCartSummary,
      getProductHaystack,
      getProductStock,
      normalizeCommandText,
      orders,
      onAddToCart,
      onLogout,
      onRecipeSuggestion,
      onRemoveFromCart,
      onUpdateCartQuantity,
      promotions,
      rememberLastProducts,
      safeNavigate,
      shoppingPrefs,
      userProfile,
      storeLocations,
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
          `Allowed navigation commands:\n${navigationSummary}\n` +
          `Special Categories:\n- Fresh Produce\n- Pantry Staples\n- Beverages\n- Home Care\n- Snacks & Treats\n\n` +
          `Navigation Directives:\n` +
          `1. For main pages: Append [[NAV:/path]] using paths from the list above.\n` +
          `2. For categories (on the home page): Append [[CAT:Category Name]] using the exact category names shown above.\n` +
          `3. Example for snacks: "Check out our snacks section [[CAT:Snacks & Treats]]"\n` +
          `DO NOT use [[NAV:/recipes]] for inventory categories. Use at most one directive per response.`,
        )
      }

      blocks.push(
        `Visual Product Cards:\nCRITICAL: If you are recommending, mentioning, or describing specific items from the catalog, you MUST ALWAYS trigger a visual product card by appending [[PRODUCTS:slug1,slug2]] to your message. Use the exact slugs from the reference data. NEVER just list product prices or descriptions in plain text if a visual card can be used. Example: "Here is the fresh milk you asked for [[PRODUCTS:fresh-milk]]."`,
      )

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

      const { cleaned, directives, categories } = stripNavigationDirectives(replyText)
      directives.forEach(safeNavigate)
      categories.forEach(cat => onCategoryChange?.(cat))

      return cleaned || replyText || "I wasn't able to get a response from Groq."
    },
    [groqSettings, createGroundedPrompt, safeNavigate, stripNavigationDirectives],
  )

  const sendMessage = async (overrideText) => {
    const messageText = (overrideText ?? draft).trim()
    if (!messageText) return
    if (isSending) return

    setError("")

    const trimmed = messageText
    const userMessage = { id: Date.now(), text: trimmed, from: "user" }
    setMessages((prev) => [...prev, userMessage])
    setDraft("")

    try {
      setIsSending(true)
      const recipeReply = await handleDynamicRecipeIntent(trimmed)
      if (recipeReply && typeof recipeReply === "object") {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, type: "recipe", from: "bot", data: recipeReply },
        ])
        return
      }
      if (recipeReply) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: recipeReply, from: "bot" },
        ])
        return
      }

      const intentReply = await handleSpecialIntent(trimmed)
      if (intentReply && typeof intentReply === "object") {
        setMessages((prev) => [...prev, { id: Date.now() + 1, from: "bot", ...intentReply }])
        return
      }
      if (intentReply) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: intentReply, from: "bot" }])
        return
      }

      // if you set a backend endpoint, we call it; otherwise we go direct to groq
      const useBackend = Boolean(backendEndpoint)

      if (!useBackend) {
        if (!groqSettings) throw new Error("Groq API key is missing (VITE_GROQ_API_KEY)")
        const history = [...messages, userMessage]
        const replyRaw = await sendViaGroq(history)

        // Handle [[PRODUCTS:slug1,slug2]] directive
        let finalReply = replyRaw
        let productCard = null

        const productMatch = replyRaw.match(/\[\[PRODUCTS:([^\]]+)\]\]/i)
        if (productMatch) {
          const slugs = productMatch[1].split(",").map(s => s.trim()).filter(Boolean)
          const items = slugs.map(slug => {
            const product = catalog.find(p => p.slug === slug)
            if (!product) return null
            return {
              product,
              purchasedBefore: checkIfPurchasedBefore(product)
            }
          }).filter(Boolean)

          if (items.length > 0) {
            productCard = {
              type: "product-list",
              title: "Recommended Items",
              description: "Here are the items mentioned above:",
              items
            }
          }
          finalReply = replyRaw.replace(/\[\[PRODUCTS:[^\]]+\]\]/gi, "").trim()
        }

        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, text: finalReply, from: "bot" },
          ...(productCard ? [{ id: Date.now() + 2, from: "bot", ...productCard }] : [])
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

  const handleSuggestionClick = (text) => {
    sendMessage(text)
  }

  return (
    <>
      <button className="chatbot-toggle" onClick={() => setOpen(!open)}>
        <FaComments />
      </button>

      {open && (
        <div
          className="chatbot-box"
          id="chatbot-window"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <div className="chatbot-resize-handle" onMouseDown={startResizing} title="Resize chat" />
          <div className="chatbot-header">
            <h4>AI Chatbot</h4>
            <button
              className="chatbot-clear-btn"
              type="button"
              onClick={() => setMessages(initialMessages)}
            >
              Clear chat
            </button>
          </div>
          <div className="chatbot-user-row">
            <span>User:</span>
            <strong>{userProfile?.role || "guest"}</strong>
          </div>

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
            {messages.map((message) => {
              if (message.type === "recipe") {
                const recipe = message.data
                return (
                  <div key={message.id} className={`chatbot-card ${message.from}`}>
                    <div className="chatbot-card-head">
                      <div>
                        <strong>{recipe.title}</strong>
                        <p>{recipe.description}</p>
                      </div>
                    </div>
                    {recipe.items.length === 0 && (
                      <p className="chatbot-card-note">No in-stock ingredients found yet.</p>
                    )}
                    <div className="chatbot-card-grid">
                      {recipe.items.map((item) => (
                        <div key={item.name} className="chatbot-card-item">
                          <img src={item.image} alt={item.name} />
                          <div>
                            <span>{item.product?.name || item.name}</span>
                            <button
                              type="button"
                              className="chatbot-card-btn"
                              onClick={() => onAddToCart?.(item.product, 1)}
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
              if (message.type === "product-list") {
                return (
                  <div key={message.id} className={`chatbot-card ${message.from}`}>
                    <div className="chatbot-card-head">
                      <div>
                        <strong>{message.title}</strong>
                        <p>{message.description}</p>
                      </div>
                    </div>
                    <div className="chatbot-card-grid">
                      {message.items.map((entry) => {
                        const { product, purchasedBefore } = entry
                        const actions = Array.isArray(entry.actions) ? entry.actions : null
                        return (
                          <div key={product.slug} className="chatbot-card-item">
                            {product.image && (
                              <img src={product.image} alt="" aria-hidden="true" />
                            )}
                            <div>
                              <span>{product.name}</span>
                              {purchasedBefore && (
                                <span className="chatbot-repurchase-badge">
                                  You have purchased this before! Re-order?
                                </span>
                              )}
                              <div className="chatbot-card-actions">
                                {actions && actions.length > 0 ? (
                                  actions.map((action) => (
                                    <button
                                      key={`${product.slug}-${action.label}`}
                                      type="button"
                                      className={`chatbot-card-btn${action.type === "admin" ? " secondary" : ""}`}
                                      onClick={() => {
                                        if (action.type === "admin") {
                                          onOpenAdminProduct?.(product)
                                          return
                                        }
                                        onAddToCart?.(product, message.quantity || 1)
                                      }}
                                    >
                                      {action.label}
                                    </button>
                                  ))
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="chatbot-card-btn"
                                      onClick={() => onAddToCart?.(product, message.quantity || 1)}
                                    >
                                      Add to cart
                                    </button>
                                    <button
                                      type="button"
                                      className="chatbot-card-btn secondary"
                                      onClick={() => safeNavigate(`/product/${product.slug}`)}
                                    >
                                      View
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return (
                <p key={message.id} className={message.from}>
                  {message.text}
                </p>
              )
            })}
            {isSending && <p className="bot subtle">Assistant is thinking...</p>}
            <div ref={messagesEndRef} />

            <div className="chatbot-suggestions in-chat">
              {["Find rice", "Make fried rice", "Track my order", "Show cart"].map((label) => (
                <button
                  key={label}
                  className="chatbot-chip"
                  type="button"
                  onClick={() => handleSuggestionClick(label)}
                >
                  {label}
                </button>
              ))}
            </div>
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
            <button className="send-btn" onClick={() => sendMessage()} disabled={isSending}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot
