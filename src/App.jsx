// main application routing and layout shell
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

  const mapAdminProductToFront = (product) => {
    const slug = product.slug || toSlug(product.name)
    return {
      slug,
      name: product.name,
      desc: product.description || "Fresh pick for you.",
      price: product.price?.toFixed ? product.price.toFixed(2) : product.price || "0.00",
      image:
        product.image ||
        "https://via.placeholder.com/420x520.png?text=Product",
      icon: product.icon || "*",
      accent: product.accent || "linear-gradient(135deg, #e7f5ec, #d1fae5)",
      tag: product.category || "Grocery",
      badge: product.outOfStock ? "Out of stock" : "In stock",
    }
  }

  const loadCatalog = useCallback(async () => {
    if (!supabase) {
      setCatalog(seedProducts)
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
      setCatalog(seedProducts)
      return
    }
    setCatalog((data || []).map(mapAdminProductToFront))
  }, [])

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
    if (currentPath === "/history") return <PurchaseHistoryPage />
    if (currentPath === "/tracking") return <OrderTrackingPage />
    if (currentPath === "/feedback")
      return <FeedbackPage onFeedbackSubmitted={handleFeedbackSubmitted} />
    if (currentPath === "/about") return <AboutPage />
    if (currentPath === "/terms") return <TermsPage />
    if (currentPath === "/privacy") return <PrivacyPage />
    if (currentPath === "/locations") return <LocationsPage />
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
        <GroceryShowcase onNavigate={navigate} products={catalog} />
      </>
    )
  }, [currentPath, sessionUser, profile, catalog, proposals, feedbackEntries])

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
