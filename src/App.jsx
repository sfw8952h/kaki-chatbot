// component: App (routing + layout shell)
import { useCallback, useEffect, useMemo, useState } from "react"
import "./App.css"
import Header from "./components/Header"
import HeroBanner from "./components/HeroBanner"
import GroceryShowcase from "./components/GroceryShowcase"
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
import { supabase } from "./lib/supabaseClient"
import { products as seedProducts } from "./data/products"
import { storeLocations as seedStoreLocations } from "./data/locations"

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
    if (basePath === "/") return ensured
    return `${basePath}${ensured}`
  }

  const [currentPath, setCurrentPath] = useState(() =>
    normalizePath(window.location.pathname)
  )
  const [sessionUser, setSessionUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [proposals, setProposals] = useState([])
  const [feedbackEntries, setFeedbackEntries] = useState([])
  const [catalog, setCatalog] = useState([])
  const [storeLocations, setStoreLocations] = useState(seedStoreLocations)
  const [searchTerm, setSearchTerm] = useState("")
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase()

  useEffect(() => {
    const handlePop = () => setCurrentPath(normalizePath(window.location.pathname))
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

  // hydrate auth state on load and keep it in sync
  useEffect(() => {
    if (!supabase) return

    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
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

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null
      setSessionUser(user)
      if (user) {
        fetchProfile(user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      listener?.subscription?.unsubscribe()
    }
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
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

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
      ...(storeAvailability || []).map((s) => Number.isFinite(s.stock) ? s.stock : 0)
    )
    if (bestStock <= 0) return "Out of stock"
    if (bestStock < 5) return "Low stock"
    return "In stock"
  }

  const buildAvailability = (product) => {
    const onlineStock = Number.isFinite(product.onlineStock)
      ? Number(product.onlineStock)
      : Number.isFinite(product.stock)
        ? Number(product.stock)
        : 0

    const storeAvailability =
      Array.isArray(product.storeAvailability) && product.storeAvailability.length > 0
        ? product.storeAvailability
        : storeLocations.map((store, idx) => ({
            storeId: store.id,
            storeName: store.name,
            stock: Math.max(0, (onlineStock || 12) - idx * 2 - ((product.slug || "").length % 3)),
          }))

    return { onlineStock, storeAvailability }
  }

  const mapAdminProductToFront = useCallback(
    (product) => {
      const slug = product.slug || toSlug(product.name)
      const { onlineStock, storeAvailability } = buildAvailability({ ...product, slug })
      const badge = computeStockBadge(onlineStock, storeAvailability)
      return {
        id: product.id,
        slug,
        name: product.name,
        desc: product.description || product.desc || "Fresh pick for you.",
        price: product.price?.toFixed ? product.price.toFixed(2) : product.price || "0.00",
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
    [storeLocations]
  )

  const loadCatalog = useCallback(async () => {
    if (!supabase) {
      setCatalog(seedProducts.map(mapAdminProductToFront))
      return
    }
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "approved")
      .gt("stock", 0)
      .order("created_at", { ascending: false })
    if (error) {
      console.warn("Unable to load products, falling back to seed data", error)
      setCatalog(seedProducts.map(mapAdminProductToFront))
      return
    }
    setCatalog((data || []).map(mapAdminProductToFront))
  }, [mapAdminProductToFront])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

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
      description: product.description,
      category: product.category,
      image: product.image,
      price: Number(product.price) || 0,
      stock: Number.isFinite(product.stock) ? product.stock : parseInt(product.stock || "0", 10) || 0,
      status: product.outOfStock ? "pending" : "approved",
    }

    // Always reflect locally so the front page updates immediately
    upsertCatalogLocally(payload)

    if (!supabase) return

    const { error } = await supabase.from("products").upsert(payload)
    if (error) {
      console.warn("Product upsert failed (falling back to local only)", error)
      return
    }

    // Reload from backend to stay in sync
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
      setStoreLocations(seedStoreLocations)
      return
    }
    const { data, error } = await supabase
      .from("store_hours")
      .select("id, name, address, phone, email, base_hours, special_hours")
      .order("name", { ascending: true })
    if (error) {
      console.warn("Unable to load store hours, using seed data", error)
      setStoreLocations(seedStoreLocations)
      return
    }
    if (!data || data.length === 0) {
      setStoreLocations(seedStoreLocations)
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
      ...store,
      id,
      baseHours: normalizeHours(store.baseHours || {}),
      specialHours: cleanSpecials(store.specialHours || []),
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
    [currentPath, navigate]
  )

  const filteredCatalog = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase()
    if (!term) return catalog
    return catalog.filter((product) => {
      const fields = [
        product.name,
        product.tag,
        product.category,
        product.brand,
        product.desc,
      ]
      return fields.some((field) => field && field.toLowerCase().includes(term))
    })
  }, [catalog, searchTerm])

  const mainContent = useMemo(() => {
    const role = profile?.role || "customer"
    const isAdmin = role === "admin"
    const isSupplier = role === "supplier"

    if (currentPath === "/signup") return <SignUpPage onNavigate={navigate} />
    if (currentPath === "/login") return <LoginPage onNavigate={navigate} />
    if (currentPath === "/cart")
      return (
        <CartPage
          onNavigate={navigate}
          user={sessionUser}
          profileName={profile?.full_name}
        />
      )
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
      return (
        <SupplierCenterPage
          onSubmitProposal={handleProposalSubmit}
          proposals={proposals}
        />
      )
    }
    if (currentPath === "/history")
      return <PurchaseHistoryPage user={sessionUser} onNavigate={navigate} />
    if (currentPath === "/tracking")
      return <OrderTrackingPage user={sessionUser} onNavigate={navigate} />
    if (currentPath === "/feedback")
      return <FeedbackPage onFeedbackSubmitted={handleFeedbackSubmitted} />
    if (currentPath === "/about") return <AboutPage />
    if (currentPath === "/terms") return <TermsPage />
    if (currentPath === "/privacy") return <PrivacyPage />
    if (currentPath === "/locations") return <LocationsPage locations={storeLocations} />
    if (currentPath === "/membership") return <MembershipPage />
    if (currentPath === "/profile")
      return (
        <ProfilePage
          onNavigate={navigate}
          user={sessionUser}
          profileName={profile?.full_name}
          onProfileUpdated={(name) => {
            if (name) setProfile({ full_name: name })
          }}
        />
      )
    if (currentPath.startsWith("/product/")) {
      const slug = currentPath.replace("/product/", "")
      return <ProductPage slug={slug} products={catalog} />
    }
    return (
      <>
        <HeroBanner />
        <GroceryShowcase
          onNavigate={navigate}
          products={filteredCatalog}
          searchTerm={searchTerm}
          onSearch={handleSearch}
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
  ])

  return (
    <div className="app">
      <div className="top-edge-links">
        {profile?.role === "supplier" && (
          <button className="top-link" type="button" onClick={() => navigate("/supplier")}>
            Supplier Center
          </button>
        )}
        {profile?.role === "admin" && (
          <button className="top-link" type="button" onClick={() => navigate("/admin")}>
            Admin Center
          </button>
        )}
      </div>
      <Header
        onNavigate={navigate}
        user={sessionUser}
        profileName={profile?.full_name}
        onLogout={handleLogout}
        searchTerm={searchTerm}
        onSearch={handleSearch}
      />
      <main className="page-body">{mainContent}</main>
      <footer className="footer-links">
        <button type="button" onClick={() => navigate("/history")}>
          Purchase history
        </button>
        <button type="button" onClick={() => navigate("/tracking")}>
          Order tracking
        </button>
        <button type="button" onClick={() => navigate("/feedback")}>
          Feedback
        </button>
        <button type="button" onClick={() => navigate("/about")}>
          About
        </button>
        <button type="button" onClick={() => navigate("/locations")}>
          Store locations
        </button>
        <button type="button" onClick={() => navigate("/membership")}>
          Membership
        </button>
        <button type="button" onClick={() => navigate("/terms")}>
          Terms
        </button>
        <button type="button" onClick={() => navigate("/privacy")}>
          Privacy
        </button>
      </footer>
      <Chatbot />
    </div>
  )
}

export default App
