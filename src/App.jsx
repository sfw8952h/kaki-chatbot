// main application routing and layout shell
import { useEffect, useMemo, useState } from "react"
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
import { supabase } from "./lib/supabaseClient"

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [sessionUser, setSessionUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const handlePop = () => setCurrentPath(window.location.pathname)
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

  // hydrate auth state on load and keep it in sync
  useEffect(() => {
    if (!supabase) return

    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle()
      if (error) {
        console.warn("Unable to load profile", error)
        setProfile(null)
        return
      }
      setProfile(data)
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
    if (window.location.pathname === path) return
    window.history.pushState({}, "", path)
    setCurrentPath(path)
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSessionUser(null)
    setProfile(null)
    navigate("/")
  }

  const mainContent = useMemo(() => {
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
    if (currentPath === "/admin") return <AdminCenterPage />
    if (currentPath === "/supplier") return <SupplierCenterPage />
    if (currentPath === "/history") return <PurchaseHistoryPage />
    if (currentPath === "/tracking") return <OrderTrackingPage />
    if (currentPath === "/feedback") return <FeedbackPage />
    if (currentPath === "/about") return <AboutPage />
    if (currentPath === "/terms") return <TermsPage />
    if (currentPath === "/privacy") return <PrivacyPage />
    if (currentPath === "/membership") return <MembershipPage />
    if (currentPath.startsWith("/product/")) {
      const slug = currentPath.replace("/product/", "")
      return <ProductPage slug={slug} />
    }
    return (
      <>
        <HeroBanner />
        <GroceryShowcase onNavigate={navigate} />
      </>
    )
  }, [currentPath, sessionUser, profile])

  return (
    <div className="app">
      <div className="top-edge-links">
        <button className="top-link" type="button" onClick={() => navigate("/admin")}>
          Admin Center
        </button>
        <button className="top-link" type="button" onClick={() => navigate("/supplier")}>
          Supplier Center
        </button>
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
