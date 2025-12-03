import { useState } from "react"
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

  const sendMessage = () => {
    if (!draft.trim()) return

    const trimmed = draft.trim()
    const userMessage = { id: Date.now(), text: trimmed, from: "user" }
    const botReply = {
      id: Date.now() + 1,
      text: `Thanks for asking about "${trimmed}". I'll fetch the freshest options and update your cart.`,
      from: "bot",
    }

    setMessages((prev) => [...prev, userMessage, botReply])
    setDraft("")
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
          </div>
          <div className="chat-input-wrapper">
            <input
              className="chat-input"
              placeholder="Type any question..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="send-btn" onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Chatbot
