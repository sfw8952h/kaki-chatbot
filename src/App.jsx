// component: App (routing + layout shell)
import { useCallback, useEffect, useMemo, useState } from "react"
import "./App.css"
import Header from "./components/Header"
import PromoCarousel from "./components/PromoCarousel"
import GroceryShowcase from "./components/GroceryShowcase"
import RecipesPage from "./pages/RecipesPage"
import Chatbot from "./components/Chatbot"
import CartPage from "./pages/CartPage"
import LoginPage from "./pages/LoginPage"
import SignUpPage from "./pages/SignUpPage"
import AdminCenterPage from "./pages/AdminCenterPage"
import SupplierCenterPage from "./pages/SupplierCenterPage"
import PurchaseHistoryPage from "./pages/PurchaseHistoryPage"
import OrderTrackingPage from "./pages/OrderTrackingPage"
import FeedbackPage from "./pages/FeedbackPage"
import AboutPage from "./pages/AboutPage"
import TermsPage from "./pages/TermsPage"
import PrivacyPage from "./pages/PrivacyPage"
import ProductPage from "./pages/ProductPage"
import MembershipPage from "./pages/MembershipPage"
import ProfilePage from "./pages/ProfilePage"
import LocationsPage from "./pages/LocationsPage"
import SupplierLoginPage from "./pages/SupplierLoginPage"
import SupplierSignUpPage from "./pages/SupplierSignUpPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import { POINTS_PER_DOLLAR, getTierByPoints } from "./lib/appConstants"
import { supabase } from "./lib/supabaseClient"
import OrderHelpPage from "./pages/OrderHelpPage"
import SavedItemsPage from "./pages/SavedItemsPage"
import CheckoutPage from "./pages/CheckoutPage"

const toPriceNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeRole = (role) => String(role || "").trim().toLowerCase()

const createPromotionFromProduct = (product, index) => ({
  id: product.slug || `promo-${index}`,
  badge:
    index === 0
      ? "Fresh savings"
      : index === 1
        ? "Bakery favorite"
        : "Pantry pick",

  headline: `${product.name} — member price`, // ✅ fixed encoding
  detail: `${product.desc} Now only $${toPriceNumber(product.price)} while fresh stock lasts.`,

  slug: product.slug,
  image: product.image, // ✅ keep image support
  actionLabel: "Go to product",
  actionUrl: `/product/${product.slug}`,
  note: `Limited batches from ${product.brand || "Kaki"}`,
})

const buildDefaultPromotions = (productsList = []) =>
  (productsList || [])
    .slice(0, 3)
    .map((product, index) =>
      createPromotionFromProduct(product, index)
    )

function App() {
  const rawBasePath = import.meta.env.BASE_URL || "/"
  const basePath =
    rawBasePath !== "/" && rawBasePath.endsWith("/")
      ? rawBasePath.slice(0, -1)
      : rawBasePath || "/"

  const normalizePath = (fullPath) => {
    if (basePath === "/" || !fullPath.startsWith(basePath)) {
      return fullPath || "/"
    }
    const trimmed = fullPath.slice(basePath.length) || "/"
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  }

  const appendBase = (path) => {
    const ensured = path.startsWith("/") ? path : `/${path}`
    return basePath === "/" ? ensured : `${basePath}${ensured}`
  }

  const [currentPath, setCurrentPath] = useState(() =>
    normalizePath(window.location.pathname)
  )

  const [sessionUser, setSessionUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [proposals, setProposals] = useState([])
  const [feedbackEntries, setFeedbackEntries] = useState([])
  const [catalog, setCatalog] = useState([])
  const [catalogSource, setCatalogSource] = useState("supabase")
  const [storeLocations, setStoreLocations] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [cartItems, setCartItems] = useState([])
  const [savedItems, setSavedItems] = useState([])
  const [orders, setOrders] = useState([])
  const [recipeSuggestion, setRecipeSuggestion] = useState(null)
  const [activeCategory, setActiveCategory] = useState("All Categories")
  const [adminProductQuery, setAdminProductQuery] = useState("")

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase()

  // ✅ promotions initialized correctly ONCE
  // ✅ promotions initialized from LocalStorage to persist across refreshes
  const [promotions, setPromotions] = useState(() => {
    try {
      const local = localStorage.getItem("kaki_promotions")
      return local ? JSON.parse(local) : []
    } catch {
      return []
    }
  })

  // Auth-only routes (no header/footer/chatbot/top links)
  const isAuthOnlyRoute = useMemo(() => {
    return currentPath === "/reset-password"
  }, [currentPath])

  useEffect(() => {
    const handlePop = () =>
      setCurrentPath(normalizePath(window.location.pathname))

    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

  // hydrate auth state on load and keep it in sync
  useEffect(() => {
    if (!supabase) return

    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role, membership_tier, membership_points")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.warn("Unable to load profile", error)
        setProfile(null)
        return
      }
      setProfile(data || null)
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user = session?.user ?? null
      setSessionUser(user)

      if (user) {
        fetchProfile(user.id)
      } else {
        setProfile(null)
      }
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user ?? null
        setSessionUser(user)

        if (user) {
          fetchProfile(user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])

  // Load catalog from database
  useEffect(() => {
    if (!supabase) {
      setCatalog([])
      return
    }

    const loadCatalog = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("status", "approved")
          .order("created_at", { ascending: false })

        if (error) throw error

        // Map database products to frontend format
        const mapped = (data || []).map(p => ({
          id: p.id, // ✅ Real UUID from database
          slug: p.slug,
          name: p.name,
          desc: p.description || "",
          price: String(p.price || 0),
          image: p.image || "https://via.placeholder.com/420x520.png?text=Product",
          category: p.category || "Uncategorized",
          onlineStock: p.stock || 0,
          badge: p.stock > 0 ? "In stock" : "Out of stock",
          brand: "Kaki",
          tag: p.category || "",
          icon: "🛒",
          accent: "linear-gradient(135deg, #fde68a, #fb923c)",
          storeAvailability: [],
        }))

        setCatalog(mapped)
        setCatalogSource("database")
      } catch (err) {
        console.warn("Failed to load catalog from database:", err)
        setCatalog([])
      }
    }

    loadCatalog()
  }, [])

  // Load promotions from DB (sync with table)
  useEffect(() => {
    const loadPromotions = async () => {
      if (!supabase) return
      try {
        const { data, error } = await supabase
          .from("promotions")
          .select("*")
          .order("created_at", { ascending: false })

        if (!error && data && data.length > 0) {
          setPromotions(data)
          // sync local cache
          localStorage.setItem("kaki_promotions", JSON.stringify(data))
        }
      } catch (err) {
        console.warn("Error loading promotions from DB", err)
      }
    }
    loadPromotions()
  }, [])

  const navigate = (path) => {
    const appPath = path.startsWith("/") ? path : `/${path}`
    const targetPath = appendBase(appPath)

    if (window.location.pathname === targetPath) return

    window.history.pushState({}, "", targetPath)
    setCurrentPath(appPath)
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSessionUser(null)
    setProfile(null)
    navigate("/")
  }

  // supplier product proposals (in-memory)
  // supplier product proposals (in-memory)
  const handleProposalSubmit = (proposal) => {
    setProposals((prev) => [
      {
        ...proposal,
        id: `sp-${Date.now()}`,
        status: "pending",
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ])
  }

  const handleProposalDecision = (id, status) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    )
  }

  // membership tier update
  const handleMembershipUpdate = useCallback(
    async (tier) => {
      if (!supabase || !sessionUser) return false

      const { data, error } = await supabase
        .from("profiles")
        .update({ membership_tier: tier })
        .eq("id", sessionUser.id)
        .select("full_name, role, membership_tier, membership_points")
        .maybeSingle()

      if (error) {
        console.warn("Unable to update membership tier", error)
        return false
      }

      setProfile(data || null)
      return true
    },
    [sessionUser]
  )

  const handleRedeemPoints = useCallback(
    async (pointsToDeduct) => {
      if (!supabase || !sessionUser || !profile) return false
      const currentPoints = profile.membership_points || 0
      if (currentPoints < pointsToDeduct) return false

      const newPoints = currentPoints - pointsToDeduct
      const { data, error } = await supabase
        .from("profiles")
        .update({ membership_points: newPoints })
        .eq("id", sessionUser.id)
        .select("full_name, role, membership_tier, membership_points")
        .maybeSingle()

      if (error) {
        console.warn("Unable to redeem points", error)
        return false
      }
      setProfile(data || null)
      return true
    },
    [sessionUser, profile]
  )

  // feedback handlers
  const handleFeedbackSubmitted = (entry) => {
    setFeedbackEntries((prev) => [
      {
        ...entry,
        id: entry.id || `fb-${Date.now()}`,
        created_at: entry.created_at || new Date().toISOString(),
      },
      ...prev,
    ])
  }

  const handleFeedbackDeleted = (id) => {
    if (!id) return
    setFeedbackEntries((prev) =>
      prev.filter((entry) => entry.id !== id)
    )
  }

  // promotions update
  const handlePromotionsUpdate = useCallback(async (nextPromotions) => {
    if (!Array.isArray(nextPromotions)) return
    setPromotions(nextPromotions)

    // 1. Save to LocalStorage (Immediate persistence)
    try {
      localStorage.setItem("kaki_promotions", JSON.stringify(nextPromotions))
    } catch (err) {
      console.warn("Failed to save promotions locally:", err)
    }

    // 2. Sync to Supabase (Upsert active + Delete removed)
    if (supabase) {
      try {
        const activeIds = nextPromotions.map((p) => p.id)

        // A. Upsert current items
        if (nextPromotions.length > 0) {
          const { error } = await supabase.from("promotions").upsert(nextPromotions)
          if (error) throw error
        }

        // B. Delete items not in the list
        let deleteQuery = supabase.from("promotions").delete()

        if (activeIds.length === 0) {
          // If clear all, delete everything (using a safe condition like id not equal to impossible value)
          await deleteQuery.neq("id", "_impossible_val_")
        } else {
          // Delete rows where ID is NOT in the active set
          await deleteQuery.not("id", "in", `(${activeIds.map(id => `"${id}"`).join(',')})`)
        }

      } catch (err) {
        console.warn("Promotions sync failed:", err.message)
      }
    }
  }, [])

  // ---------------- CART ----------------
  const addToCart = useCallback((product, quantity = 1) => {
    if (!product) return

    const normalizedQuantity = Math.max(1, Number(quantity) || 1)
    const unitPrice = toPriceNumber(product.price)

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product_id === product.id
      )

      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + normalizedQuantity }
            : item
        )
      }

      return [
        ...prev,
        {
          product_id: product.id, // ✅ REQUIRED for checkout & stock
          slug: product.slug,
          name: product.name,
          thumbnail: product.image,
          price: unitPrice,
          quantity: normalizedQuantity,
        },
      ]
    })
  }, [])

  const removeFromCart = useCallback((slug) => {
    if (!slug) return
    setCartItems((prev) =>
      prev.filter((item) => item.slug !== slug)
    )
  }, [])

  const updateCartQuantity = useCallback((slug, nextQuantity) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.slug === slug
            ? { ...item, quantity: Math.max(0, Number(nextQuantity) || 0) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }, [])

  // ---------------- CART METRICS ----------------
  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [cartItems]
  )

  const cartCount = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  )

  // ---------------- HELPERS ----------------
  const toSlug = (name) =>
    name
      ? name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      : `product-${Date.now()}`

  const computeStockBadge = (onlineStock, storeAvailability = []) => {
    const bestStock = Math.max(
      onlineStock || 0,
      ...(storeAvailability || []).map((s) =>
        Number.isFinite(s.stock) ? s.stock : 0
      )
    )

    if (bestStock <= 0) return "Out of stock"
    if (bestStock < 5) return "Low stock"
    return "In stock"
  }

  const buildAvailability = (product) => {
    const onlineStock = Number.isFinite(Number(product.onlineStock))
      ? Number(product.onlineStock)
      : Number.isFinite(Number(product.stock))
        ? Number(product.stock)
        : 0

    const storeAvailability =
      Array.isArray(product.storeAvailability) && product.storeAvailability.length > 0
        ? product.storeAvailability
        : storeLocations.map((store, idx) => ({
          storeId: store.id,
          storeName: store.name,
          stock: Math.max(
            0,
            onlineStock - idx * 2
          ),
        }))

    return {
      onlineStock,
      storeAvailability,
    }
  }

  const mapAdminProductToFront = useCallback(
    (product) => {
      const slug = product.slug || toSlug(product.name)

      // ✅ handle BOTH supabase + seed:
      // - supabase row: stock is present
      // - seed product: stock usually missing -> default to 12 so it shows up
      const rawStock =
        product.onlineStock ??
        product.online_stock ??
        product.stock ??
        product.qty ??
        product.quantity ??
        0

      const onlineStock = Number.isFinite(Number(rawStock)) ? Number(rawStock) : 0

      const storeAvailability = Array.isArray(product.storeAvailability)
        ? product.storeAvailability
        : []

      const badge = computeStockBadge(onlineStock, storeAvailability)

      return {
        id: product.id,
        slug,
        name: product.name || product.title,
        desc:
          product.description ||
          product.desc ||
          product.subtitle ||
          "Fresh pick for you.",
        price: toPriceNumber(product.price),
        image:
          product.image ||
          "https://via.placeholder.com/420x520.png?text=Product",
        icon: product.icon || "*",
        accent: product.accent || "linear-gradient(135deg, #e7f5ec, #d1fae5)",
        tag: product.category || product.tag || "Grocery",
        category: product.category || product.tag || "Grocery",
        brand: product.brand || "Kaki",
        badge,
        onlineStock,
        storeAvailability,
      }
    },
    [],


  )

  const loadCatalog = useCallback(async () => {
    // ✅ if supabase client isn't available, always show seed
    if (!supabase) {
      setCatalog([])
      return
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Unable to load products", error)
      setCatalog([])
      return
    }

    if (!data || data.length === 0) {
      setCatalog([])
      return
    }

    setCatalog(data.map(mapAdminProductToFront))
    setCatalogSource("supabase")
  }, [mapAdminProductToFront])

  const loadUserOrders = useCallback(async () => {
    if (!supabase || !sessionUser) {
      setOrders([])
      return
    }

    console.log("[App] loadUserOrders: Fetching for UID", sessionUser.id)

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          profile_id,
          total,
          status,
          placed_at,
          order_items (
            id,
            order_id,
            product_id,
            product_slug,
            product_name,
            unit_price,
            quantity
          )
        `)
        .eq("profile_id", sessionUser.id)
        .order("placed_at", { ascending: false })

      if (error) {
        console.error("[App] loadUserOrders Query Error:", error)
        setOrders([])
        return
      }

      console.log("[App] loadUserOrders Raw Result:", data)

      const mapped = (data || []).map((order) => ({
        ...order,
        items: order.order_items || [],
        date: order.placed_at || new Date().toISOString(),
      }))

      setOrders(mapped)
    } catch (err) {
      console.error("[App] loadUserOrders Unexpected Error:", err)
      setOrders([])
    }
  }, [sessionUser])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  useEffect(() => {
    if (sessionUser) {
      loadUserOrders()
    }
  }, [sessionUser, loadUserOrders])

  // ✅ FIX: redirect away from login once authenticated
  useEffect(() => {
    let suppress = false
    try {
      suppress = sessionStorage.getItem("suppress_login_redirect") === "1"
    } catch { }
    if (sessionUser && currentPath === "/login" && !suppress) {
      navigate("/")
    }
    if (!sessionUser && suppress) {
      try {
        sessionStorage.removeItem("suppress_login_redirect")
      } catch { }
    }
  }, [sessionUser, currentPath])

  const handlePlaceOrder = useCallback(
    async (orderPayload) => {
      if (!supabase) return

      if (!sessionUser) {
        alert("Please login to place an order.")
        navigate("/login")
        return
      }

      try {
        const total = toPriceNumber(orderPayload.total)

        // ✅ 1) Place order + update stock (your existing RPC)
        const { data: orderId, error } = await supabase.rpc("place_order_with_stock", {
          p_profile_id: sessionUser.id,
          p_total: total,
          p_items: orderPayload.items.map((item) => ({
            product_id: item.product_id || item.id,
            slug: item.slug,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        })

        if (error) throw error
        if (!orderId) throw new Error("Order failed: no order id returned.")

        // ✅ 2) Save checkout details into orders table
        // (Make sure these columns exist in orders table:
        // delivery_address text, delivery_notes text, payment_method text, payment_ref text)
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            delivery_address: orderPayload.address || "",
            delivery_notes: orderPayload.notes || "",
            payment_method: orderPayload.payment_method || "",
            payment_ref: orderPayload.paynow_reference || null,
            payment_confirmed: !!orderPayload.payment_confirmed,
          })
          .eq("id", orderId)

        if (updateErr) console.warn("Order details update failed:", updateErr)

        // ✅ 3) (OPTIONAL) Send confirmation email via Supabase Edge Function
        // This is the cleanest way (no bank integration needed).
        // If you haven’t created the function yet, you can skip this and add later.
        try {
          await supabase.functions.invoke("send-order-confirmation", {
            body: {
              order_id: orderId,
              email: sessionUser.email,
              name: profile?.full_name || sessionUser.email,
              total,
              payment_method: orderPayload.payment_method,
            },
          })
        } catch (mailErr) {
          console.warn("Email function failed (ok for now):", mailErr)
        }

        // ✅ 4) Points + tier (your existing logic)
        const pointsEarned = Math.floor(total * POINTS_PER_DOLLAR)

        if (pointsEarned > 0) {
          const currentPoints = Number(profile?.membership_points ?? 0)
          const nextPoints = currentPoints + pointsEarned
          const nextTier = getTierByPoints(nextPoints)

          const { data: updatedProfile } = await supabase
            .from("profiles")
            .update({
              membership_points: nextPoints,
              membership_tier: nextTier?.id || profile?.membership_tier || "",
            })
            .eq("id", sessionUser.id)
            .select("full_name, role, membership_tier, membership_points")
            .maybeSingle()

          if (updatedProfile) setProfile(updatedProfile)
        }

        // ✅ 5) Refresh UI
        await loadUserOrders()
        await loadCatalog()

        // ✅ 6) Clear cart ONLY after success
        setCartItems([])
      } catch (err) {
        console.error(err)
        alert(err.message || "Checkout failed. Please try again.")
      }
    },
    [sessionUser, supabase, profile, loadUserOrders, loadCatalog, navigate]
  )

  const upsertCatalogLocally = (product) => {
    const mapped = mapAdminProductToFront(product)
    setCatalog((prev) => {
      const idx = prev.findIndex((p) => p.slug === mapped.slug)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = mapped
        return copy
      }
      return [mapped, ...prev]
    })
  }

  const handleProductUpsert = async (product) => {
    const slug = product.slug || toSlug(product.name)
    const payload = {
      id: product.id,
      name: product.name,
      slug,
      description: product.description || product.desc,
      category: product.category,
      image: product.image,
      price: Number(product.price) || 0,
      stock: Number.isFinite(product.stock) ? product.stock : parseInt(product.stock || "0", 10) || 0,
      status: product.outOfStock ? "pending" : "approved",
    }

    upsertCatalogLocally(payload)

    if (!supabase) return

    const { error } = await supabase.from("products").upsert(payload)
    if (error) {
      console.warn("Product upsert failed (falling back to local only)", error)
      return
    }

    loadCatalog()
  }

  const handleProductDelete = useCallback((productId) => {
    if (!productId) return
    setCatalog((prev) => prev.filter((product) => product.id !== productId))
  }, [])

  const mapStoreRow = (row) => ({
    id: row.id || row.slug || row.name || `store-${Date.now()}`,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    baseHours: row.base_hours || row.baseHours || {},
    specialHours: row.special_hours || row.specialHours || [],
  })

  const loadStoreLocations = useCallback(async () => {
    if (!supabase) {
      setStoreLocations([])
      return
    }
    const { data, error } = await supabase
      .from("store_hours")
      .select("id, name, address, phone, email, base_hours, special_hours")
      .order("name", { ascending: true })
    if (error) {
      console.warn("Unable to load store hours", error)
      setStoreLocations([])
      return
    }
    if (!data || data.length === 0) {
      setStoreLocations([])
      return
    }
    setStoreLocations(data.map(mapStoreRow))
  }, [])

  useEffect(() => {
    loadStoreLocations()
  }, [loadStoreLocations])

  const normalizeHours = (baseHours = {}) => {
    const dayKeys = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ]
    const normalized = {}
    dayKeys.forEach((day) => {
      const record = baseHours[day] || {}
      if (record.closed) {
        normalized[day] = { closed: true }
      } else if (record.open && record.close) {
        normalized[day] = { open: record.open, close: record.close }
      } else {
        normalized[day] = { closed: true }
      }
    })
    return normalized
  }

  const loadSavedItems = useCallback(async () => {
    if (!supabase || !sessionUser) {
      setSavedItems([])
      return
    }

    const { data, error } = await supabase
      .from("saved_items")
      .select("products(*)") // assumes FK -> products
      .eq("profile_id", sessionUser.id)

    if (error) {
      console.warn("Failed to load saved items", error)
      setSavedItems([])
      return
    }

    const mapped = (data || [])
      .map((row) => row.products || row.product || row.products_id || null)
      .filter(Boolean)
      .map(mapAdminProductToFront)

    setSavedItems(mapped)
  }, [sessionUser, mapAdminProductToFront])

  useEffect(() => {
    loadSavedItems()
  }, [loadSavedItems])

  const cleanSpecials = (specialHours = []) =>
    (specialHours || [])
      .filter((s) => s && s.date)
      .map((s) => ({
        date: s.date,
        label: s.label || "",
        closed: !!s.closed,
        open: s.closed ? null : s.open || "",
        close: s.closed ? null : s.close || "",
      }))

  const upsertStoreLocally = (store) => {
    setStoreLocations((prev) => {
      const idx = prev.findIndex((s) => s.id === store.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = store
        return copy
      }
      return [store, ...prev]
    })
  }

  const handleStoreUpsert = async (store) => {
    const id =
      store.id ||
      (store.name
        ? store.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
        : `store-${Date.now()}`)
    const payload = {
      id,
      name: store.name,
      address: store.address,
      phone: store.phone,
      email: store.email,
      baseHours: store.baseHours,
      specialHours: store.specialHours,
    }

    upsertStoreLocally(payload)

    if (!supabase) return payload

    const { data, error } = await supabase
      .from("store_hours")
      .upsert({
        id: payload.id,
        name: payload.name,
        address: payload.address,
        phone: payload.phone,
        email: payload.email,
        base_hours: payload.baseHours,
        special_hours: payload.specialHours,
      })
      .select()
      .single()
    if (error) {
      console.warn("Store hours upsert failed", error)
      return payload
    }
    const saved = mapStoreRow(data)
    upsertStoreLocally(saved)
    return saved
  }

  const handleSearch = useCallback(
    (value) => {
      const nextValue = value || ""
      setSearchTerm(nextValue)
      if (currentPath !== "/") {
        navigate("/")
      }
    },
    [currentPath, navigate],
  )

  const handleHomeReset = useCallback(() => {
    setSearchTerm("")
    setRecipeSuggestion(null)
    setActiveCategory("All Categories")
    navigate("/")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [navigate])

  const handleCategorySelect = useCallback(
    (category) => {
      setActiveCategory(category || "All Categories")
      // always go back to home so the user sees filtered products
      if (currentPath !== "/") navigate("/")
    },
    [currentPath],
  )

  const handleOpenAdminProduct = useCallback(
    (product) => {
      // product can be an object or a string command (e.g. "TAB:promotions")
      const hint = typeof product === "string" ? product : (product?.name || product?.slug || "")
      setAdminProductQuery(hint)
      navigate("/admin")
    },
    [navigate],
  )
  const filteredCatalog = useMemo(() => {
    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    const stopWords = new Set([
      "fresh",
      "large",
      "small",
      "medium",
      "cup",
      "cups",
      "tbsp",
      "tsp",
      "tablespoon",
      "teaspoon",
      "chopped",
      "minced",
      "diced",
      "sliced",
      "cooked",
      "uncooked",
      "optional",
      "ground",
      "peeled",
      "oil",
    ])

    const ingredientTerms = recipeSuggestion
      ? recipeSuggestion.ingredients.map((item) => normalize(item)).filter(Boolean)
      : []

    const ingredientKeywords = ingredientTerms.flatMap((term) => {
      const tokens = term.split(" ").filter((token) => token && !stopWords.has(token))
      return [term, ...tokens.filter((token) => token.length >= 3)]
    })

    let baseList = catalog

    // ✅ Recipe ingredient filter (your original)
    if (ingredientKeywords.length) {
      baseList = baseList.filter((product) => {
        const haystack = normalize(
          [product.name, product.tag, product.category, product.brand, product.desc].join(" ")
        )
        return ingredientKeywords.some((term) => haystack.includes(term))
      })
    }

    // ✅ Category filter (ONLY ONCE, with mapping)
    if (activeCategory && activeCategory !== "All Categories") {
      const mapLabelToDbCategory = {
        "Pantry Staples": "Rice & Grains",
        "Home Care": "Household",
        "Snacks & Treats": "Confectionery",
      }

      const target = mapLabelToDbCategory[activeCategory] || activeCategory

      baseList = baseList.filter((product) => {
        const cat = String(product.category || product.tag || "").toLowerCase()
        return cat === String(target).toLowerCase()
      })
    }

    // ✅ Search filter (your original)
    const term = normalize(searchTerm)
    if (!term) return baseList

    return baseList.filter((product) => {
      const fields = [product.name, product.tag, product.category, product.brand, product.desc]
      return fields.some((field) => normalize(field).includes(term))
    })
  }, [catalog, searchTerm, recipeSuggestion, activeCategory])

  const catalogPromotions = useMemo(() => {
    if (catalogSource !== "supabase") return []
    return buildDefaultPromotions(catalog)
  }, [catalog, catalogSource])

  const mainContent = useMemo(() => {
    const role = normalizeRole(profile?.role) || "customer"
    const isAdmin = role === "admin"
    const isSupplier = role === "supplier"


    if (currentPath === "/supplier-login")
      return <SupplierLoginPage onNavigate={navigate} />
    if (currentPath === "/signup") return <SignUpPage onNavigate={navigate} />
    if (currentPath === "/login") return <LoginPage onNavigate={navigate} />
    if (currentPath === "/reset-password") return <ResetPasswordPage onNavigate={navigate} />
    if (currentPath === "/checkout")
      return (
        <CheckoutPage
          user={sessionUser}
          profileName={profile?.full_name}
          items={cartItems}
          subtotal={cartSubtotal}
          onNavigate={navigate}
          onCheckout={handlePlaceOrder}
        />
      )
    if (currentPath === "/cart")
      return (
        <CartPage
          onNavigate={navigate}
          user={sessionUser}
          profileName={profile?.full_name}
          items={cartItems}
          subtotal={cartSubtotal}
          onRemove={removeFromCart}
          onQuantityChange={updateCartQuantity}
          onCheckout={handlePlaceOrder}
        />
      )
    if (currentPath === "/recipes") return <RecipesPage onAddToCart={addToCart} />
    if (currentPath === "/admin") {
      if (!isAdmin) {
        return (
          <section className="page-panel">
            <p className="eyebrow">Admin</p>
            <h2>Access denied</h2>
            <p>You need an admin account to view the dashboard.</p>
            <button className="primary-btn" type="button" onClick={() => navigate("/login")}>
              Login
            </button>
          </section>
        )
      }
      return (
        <AdminCenterPage
          proposals={proposals}
          onProposalDecision={handleProposalDecision}
          localFeedback={feedbackEntries}
          onProductUpsert={handleProductUpsert}
          onProductDelete={handleProductDelete}
          storeLocations={storeLocations}
          onStoreUpsert={handleStoreUpsert}
          onFeedbackDelete={handleFeedbackDeleted}
          promotions={promotions}
          onPromotionsUpdate={handlePromotionsUpdate}
          adminQuery={adminProductQuery}
          onNavigate={navigate}
        />
      )
    }
    if (currentPath === "/supplier") {
      if (!isSupplier) {
        return (
          <section className="page-panel">
            <p className="eyebrow">Supplier</p>
            <h2>Access denied</h2>
            <p>You need a supplier account to view this center.</p>
            <button className="primary-btn" type="button" onClick={() => navigate("/login")}>
              Login
            </button>
          </section>
        )
      }
      return <SupplierCenterPage onSubmitProposal={handleProposalSubmit} proposals={proposals} />
    }
    if (currentPath === "/supplier-signup") {
      return <SupplierSignUpPage onNavigate={navigate} />
    }
    if (currentPath === "/history")
      return <PurchaseHistoryPage user={sessionUser} onNavigate={navigate} orders={orders} />
    if (currentPath.startsWith("/help")) {
      const orderId = currentPath === "/help" ? "" : currentPath.replace("/help/", "")
      return <OrderHelpPage orderId={orderId || null} orders={orders} onNavigate={navigate} />
    }
    if (currentPath === "/tracking")
      return <OrderTrackingPage user={sessionUser} onNavigate={navigate} orders={orders} />
    if (currentPath === "/feedback")
      return <FeedbackPage onFeedbackSubmitted={handleFeedbackSubmitted} />
    if (currentPath === "/about") return <AboutPage />
    if (currentPath === "/terms") return <TermsPage />
    if (currentPath === "/privacy") return <PrivacyPage />
    if (currentPath === "/locations") return <LocationsPage locations={storeLocations} />
    if (currentPath === "/saved")
      return (
        <SavedItemsPage
          user={sessionUser}
          items={savedItems}
          onAddToCart={addToCart}
          onNavigate={navigate}
        />
      )
    if (currentPath === "/membership")
      return (
        <MembershipPage
          user={sessionUser}
          profile={profile}
          onNavigate={navigate}
          onMembershipChange={handleMembershipUpdate}
          onRedeemVoucher={handleRedeemPoints}
        />
      )
    if (currentPath === "/profile")
      return (
        <ProfilePage
          onNavigate={navigate}
          user={sessionUser}
          profile={profile}
          orders={orders}
          onLogout={handleLogout}
          onProfileUpdated={(name) => {
            if (name) setProfile((prev) => ({ ...prev, full_name: name }))
          }}
        />
      )
    if (currentPath.startsWith("/product/")) {
      const slug = currentPath.replace("/product/", "")
      return <ProductPage slug={slug} products={catalog} onAddToCart={addToCart} />
    }


    const activePromotions =
      promotions && promotions.length > 0 ? promotions : catalogPromotions
    const hasSearch =
      (searchTerm || "").trim().length > 0 ||
      (recipeSuggestion && recipeSuggestion.ingredients?.length > 0)

    return (
      <>
        {recipeSuggestion && (
          <section className="recipe-spotlight">
            <div className="recipe-spotlight-head">
              <div>
                <p className="eyebrow">Chatbot pick</p>
                <h2>{recipeSuggestion.title}</h2>
                <p className="muted">{recipeSuggestion.description}</p>
              </div>
              <button className="ghost-btn" type="button" onClick={() => setRecipeSuggestion(null)}>
                Clear
              </button>
            </div>
            <div className="recipe-spotlight-grid">
              {recipeSuggestion.ingredients.map((item) => (
                <span key={item} className="pill pill-soft">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
        {!hasSearch && activeCategory === "All Categories" && <PromoCarousel promotions={activePromotions} />}
        <GroceryShowcase
          onNavigate={navigate}
          products={filteredCatalog.length ? filteredCatalog : catalog}
          searchTerm={searchTerm}
          onSearch={handleSearch}
          onAddToCart={addToCart}
        />
      </>
    )
  }, [
    currentPath,
    sessionUser,
    profile,
    catalog,
    filteredCatalog,
    searchTerm,
    proposals,
    feedbackEntries,
    storeLocations,
    handleSearch,
    navigate,
    cartItems,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    orders,
    handleMembershipUpdate,
    recipeSuggestion,
    catalogSource,
    catalogPromotions,
    promotions,
    handlePromotionsUpdate,
    handleProductUpsert,
    handleProductDelete,
    handleStoreUpsert,
    handleProposalDecision,
    handleProposalSubmit,
    handlePlaceOrder,
    handleFeedbackSubmitted,
    handleFeedbackDeleted,
  ])

  return (
    <div className="app">
      {/* Hide top links on auth-only routes */}
      {!isAuthOnlyRoute && (
        <div className="top-edge-links">
          {normalizeRole(profile?.role) === "supplier" && (
            <button className="top-link" type="button" onClick={() => navigate("/supplier")}>
              Supplier Center
            </button>
          )}
          {normalizeRole(profile?.role) === "admin" && (
            <button className="top-link" type="button" onClick={() => navigate("/admin")}>
              Admin Center
            </button>
          )}
          {!sessionUser && (
            <button
              className="top-link top-link--right"
              type="button"
              onClick={() => navigate("/supplier-login")}
            >
              Supplier login
            </button>
          )}
        </div>
      )}

      {/* Hide header on auth-only routes */}
      {!isAuthOnlyRoute && (
        <Header
          onNavigate={navigate}
          onHomeReset={handleHomeReset}
          user={sessionUser}
          profileName={profile?.full_name}
          onLogout={handleLogout}
          searchTerm={searchTerm}
          onSearch={handleSearch}
          cartCount={cartCount}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          products={catalog}
          notifications={promotions}
          orders={orders}
        />
      )}

      <main className="page-body">{mainContent}</main>

      {/* Hide footer on auth-only routes */}
      {!isAuthOnlyRoute && (
        <footer className="simple-footer">
          <div className="footer-content">
            {/* Company Info */}
            <div className="footer-brand">
              <h3 className="footer-logo">Kaki</h3>
              <p className="footer-description">
                Your trusted online grocery store delivering fresh products across Singapore.
              </p>
              <div className="footer-payments">
                <h4>Accepted Payments</h4>
                <div className="payment-icons">
                  <span className="payment-badge">💳 Visa</span>
                  <span className="payment-badge">💳 Mastercard</span>
                  <span className="payment-badge">📱 PayNow</span>
                  <span className="payment-badge">🍎 Apple Pay</span>
                </div>
              </div>
            </div>

            {/* Shop Links */}
            <div className="footer-links-column">
              <h4>Shop</h4>
              <button type="button" onClick={() => navigate("/")}>All Products</button>
              <button type="button" onClick={() => navigate("/recipes")}>Recipes</button>
              <button type="button" onClick={() => navigate("/saved")}>Saved Items</button>
              <button type="button" onClick={() => navigate("/membership")}>Membership</button>
            </div>

            {/* About Links */}
            <div className="footer-links-column">
              <h4>About us</h4>
              <button type="button" onClick={() => navigate("/about")}>About Kaki</button>
              <button type="button" onClick={() => navigate("/locations")}>Store Locations</button>
              <button type="button" onClick={() => navigate("/feedback")}>Feedback</button>
            </div>

            {/* Services Links */}
            <div className="footer-links-column">
              <h4>Services</h4>
              <button type="button" onClick={() => navigate("/history")}>Order History</button>
              <button type="button" onClick={() => navigate("/tracking")}>Track Orders</button>
              <button type="button" onClick={() => navigate("/profile")}>My Account</button>
            </div>

            {/* Help Links */}
            <div className="footer-links-column">
              <h4>Help</h4>
              <button type="button" onClick={() => navigate("/help")}>Help Center</button>
              <button type="button" onClick={() => navigate("/terms")}>Terms of Use</button>
              <button type="button" onClick={() => navigate("/privacy")}>Privacy Policy</button>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="footer-bottom-bar">
            <div className="footer-bottom-content">
              <div className="footer-bottom-links">
                <button type="button" onClick={() => navigate("/terms")}>Terms of Use</button>
                <button type="button" onClick={() => navigate("/privacy")}>Privacy Policy</button>
              </div>
              <p>All Rights reserved by Kaki | 2026</p>
            </div>
          </div>
        </footer>
      )}

      {!isAuthOnlyRoute && (
        <Chatbot
          catalog={catalog}
          storeLocations={storeLocations}
          userProfile={profile}
          orders={orders}
          cartItems={cartItems}
          onNavigate={navigate}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
          onUpdateCartQuantity={updateCartQuantity}
          onLogout={handleLogout}
          onOpenAdminProduct={handleOpenAdminProduct}
          onProductUpdate={handleProductUpsert}
          onRecipeSuggestion={setRecipeSuggestion}
          promotions={promotions}
          onCategoryChange={setActiveCategory}
        />
      )}
    </div>
  )
}

export default App
