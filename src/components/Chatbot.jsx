// component: Chatbot (interacts with Rasa assistant)
import { useMemo, useState } from "react"
import "./Chatbot.css"
import { FaComments } from "react-icons/fa"

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

function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [language, setLanguage] = useState(languages[0].code)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")

  const rasaEndpoint = useMemo(
    () => import.meta.env.VITE_RASA_REST_URL || "http://localhost:5005/webhooks/rest/webhook",
    [],
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
      const response = await fetch(rasaEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "freshmart-web-user",
          message: trimmed,
          metadata: { language },
        }),
      })

      if (!response.ok) {
        throw new Error(`Rasa replied with ${response.status}`)
      }

      const payload = await response.json()
      const replies =
        Array.isArray(payload) && payload.length > 0
          ? payload
              .filter((entry) => entry && (entry.text || entry.image))
              .map((entry, index) => ({
                id: Date.now() + index + 1,
                text:
                  entry.text ||
                  (entry.image
                    ? "The assistant shared an image (display in UI to show it)."
                    : "The assistant responded."),
                from: "bot",
              }))
          : [
              {
                id: Date.now() + 1,
                text: "I'm here, but I didn't receive a reply from the assistant.",
                from: "bot",
              },
            ]

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
