// component: Chatbot (interacts with Rasa assistant or Gemini)
import { useCallback, useMemo, useState } from "react"
import "./Chatbot.css"
import { FaComments } from "react-icons/fa"
import { GoogleGenAI } from "@google/genai"

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
  { label: "Feedback", path: "/feedbackpage" },
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
    (product.desc || product.description || product.summary || "")
      .toString()
      .trim() || "No description provided."
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

const initialMessages = [
  {
    id: 1,
    text: "Hi there! I'm Kaki's AI Chatbot. Ask me about stock, products, or what's fresh today.",
    from: "bot",
  },
]

const languages = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "ta", label: "Tamil" },
]

function Chatbot({ catalog = [], storeLocations = [], onNavigate = () => {} }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [language, setLanguage] = useState(languages[0].code)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  const backendEndpoint = useMemo(() => import.meta.env.VITE_BACKEND_CHAT_URL || "", [])
  const backendAuthToken = useMemo(
    () => import.meta.env.VITE_BACKEND_AUTH_TOKEN || "",
    [],
  )
  const rasaEndpoint = useMemo(
    () => import.meta.env.VITE_RASA_REST_URL || "http://localhost:5005/webhooks/rest/webhook",
    [],
  )
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
    const productLines = productNavigationTargets.map(
      (target) => `- ${target.label}: ${target.path}`,
    )
    return [...staticLines, ...productLines].join("\n")
  }, [productNavigationTargets])
  const geminiSettings = useMemo(() => {
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim()
    if (!apiKey) return null
    return {
      apiKey,
      model: (import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash").trim(),
      instructions:
        (import.meta.env.VITE_GEMINI_SYSTEM_PROMPT || "").trim() || DEFAULT_ASSISTANT_PROMPT,
      historyWindow:
        Number(import.meta.env.VITE_GEMINI_HISTORY_WINDOW || FALLBACK_HISTORY_WINDOW) ||
        FALLBACK_HISTORY_WINDOW,
    }
  }, [])
  const groqSettings = useMemo(() => {
    const apiKey = (import.meta.env.VITE_GROQ_API_KEY || "").trim()
    if (!apiKey) return null
    return {
      apiKey,
      model: (import.meta.env.VITE_GROQ_MODEL || "llama-3.1-8b-instant").trim(),
      instructions:
        (import.meta.env.VITE_GEMINI_SYSTEM_PROMPT || "").trim() || DEFAULT_ASSISTANT_PROMPT,
      historyWindow:
        Number(import.meta.env.VITE_GEMINI_HISTORY_WINDOW || FALLBACK_HISTORY_WINDOW) ||
        FALLBACK_HISTORY_WINDOW,
    }
  }, [])
  const geminiClient = useMemo(() => {
    if (!geminiSettings) return null
    try {
      return new GoogleGenAI({ apiKey: geminiSettings.apiKey })
    } catch (clientError) {
      console.warn("Gemini client failed to initialize", clientError)
      return null
    }
  }, [geminiSettings])
  const stripNavigationDirectives = useCallback((text) => {
    if (typeof text !== "string") {
      return { cleaned: "", directives: [] }
    }
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
      if (typeof onNavigate === "function") {
        onNavigate(normalized)
      }
    },
    [allowedNavigationSet, onNavigate],
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
      if (!groqSettings) {
        throw new Error("Groq is not configured")
      }
      const limitedHistory = conversationHistory.slice(-groqSettings.historyWindow)
      const messagesPayload = []
      const instructionBlock = createGroundedPrompt(groqSettings.instructions)
      if (instructionBlock) {
        messagesPayload.unshift({
          role: "system",
          content: instructionBlock,
        })
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
        throw new Error(
          `Groq replied with ${response.status}: ${errorPayload || "No response body"}`,
        )
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

  const sendViaGemini = useCallback(
    async (conversationHistory) => {
      if (!geminiClient || !geminiSettings) {
        throw new Error("Gemini is not configured")
      }
      const limitedHistory = conversationHistory.slice(-geminiSettings.historyWindow)
      const contents = limitedHistory.map((message) => ({
        role: message.from === "user" ? "user" : "model",
        parts: [{ text: message.text }],
      }))
      const instructionText = createGroundedPrompt(geminiSettings.instructions)
      if (instructionText) {
        contents.unshift({
          role: "user",
          parts: [{ text: instructionText }],
        })
      }
      const response = await geminiClient.models.generateContent({
        model: geminiSettings.model,
        contents,
      })
      const directText = (response?.text || "").trim()
      if (directText) {
        const { cleaned, directives } = stripNavigationDirectives(directText)
        directives.forEach(safeNavigate)
        if (cleaned) return cleaned
      }
      const fallback =
        response?.candidates
          ?.map((candidate) =>
            (candidate?.content?.parts || [])
              .map((part) => part?.text || "")
              .filter(Boolean)
              .join("\n"),
          )
          .find((entry) => entry && entry.trim())
          ?.trim() || ""
      const { cleaned, directives } = stripNavigationDirectives(fallback)
      directives.forEach(safeNavigate)
      return cleaned || fallback || "I wasn't able to get a response from Gemini."
    },
    [geminiClient, geminiSettings, createGroundedPrompt, safeNavigate, stripNavigationDirectives],
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
      const useBackend = Boolean(backendEndpoint)
      const shouldUseGroq = !useBackend && groqSettings
      const shouldUseGemini = !useBackend && !groqSettings && geminiClient
      if (shouldUseGroq) {
        const history = [...messages, userMessage]
        const replyText = await sendViaGroq(history)
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: replyText,
            from: "bot",
          },
        ])
        return
      }

      if (shouldUseGemini) {
        const history = [...messages, userMessage]
        const replyText = await sendViaGemini(history)
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: replyText,
            from: "bot",
          },
        ])
        return
      }

      const response = await fetch(useBackend ? backendEndpoint : rasaEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(useBackend && backendAuthToken
            ? { Authorization: `Bearer ${backendAuthToken}` }
            : {}),
        },
        body: JSON.stringify(
          useBackend
            ? {
                message: trimmed,
                language,
                sender_id: "freshmart-web-user",
              }
            : {
                sender: "freshmart-web-user",
                message: trimmed,
                metadata: { language },
              },
        ),
      })

      if (!response.ok) {
        throw new Error(`Chat service replied with ${response.status}`)
      }

      const payload = await response.json()
      const replies = (() => {
        if (useBackend) {
          const replyText = payload?.reply
          const { cleaned, directives } = stripNavigationDirectives(
            replyText || "I'm here, but I didn't receive a reply from the assistant.",
          )
          directives.forEach(safeNavigate)
          return [
            {
              id: Date.now() + 1,
              text: cleaned || replyText || "I'm here, but I didn't receive a reply from the assistant.",
              from: "bot",
            },
          ]
        }

        return Array.isArray(payload) && payload.length > 0
          ? payload
              .filter((entry) => entry && (entry.text || entry.image))
              .map((entry, index) => ({
                id: Date.now() + index + 1,
                text: (() => {
                  if (entry.text) {
                    const { cleaned, directives } = stripNavigationDirectives(entry.text)
                    directives.forEach(safeNavigate)
                    return cleaned || entry.text
                  }
                  return entry.image
                    ? "The assistant shared an image (display in UI to show it)."
                    : "The assistant responded."
                })(),
                from: "bot",
              }))
          : [
              {
                id: Date.now() + 1,
                text: "I'm here, but I didn't receive a reply from the assistant.",
                from: "bot",
              },
            ]
      })()

      setMessages((prev) => [...prev, ...replies])
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
