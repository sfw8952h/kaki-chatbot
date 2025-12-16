# FreshMart - Online Grocery Store

A modern React application for online grocery shopping with an integrated chatbot assistant.

## Features

- 🛒 Beautiful product grid with grocery items
- 💬 Interactive chatbot in the bottom-right corner
- 📱 Responsive design for all devices
- 🎨 Modern UI with gradient effects
- ⚡ Fast and lightweight with Vite

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python 3.11 (for the Rasa Pro backend)
- npm or yarn
- (Optional) Supabase project + JWT secret if you want to log chat messages server-side

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Chatbot (Rasa) setup

- Run your Rasa server with the REST channel enabled (default endpoint: `http://localhost:5005/webhooks/rest/webhook`).
- Copy `.env.example` to `.env` and adjust `VITE_RASA_REST_URL` if your endpoint differs.
- The chatbot sends `{ sender, message, metadata: { language } }` to Rasa and renders returned `text` fields.

### Rasa Pro classic (no LLM) quickstart

Inside `rasa/` you’ll find a minimal classic pipeline and training data:

- `rasa/config.yml` — DIET-based pipeline (whitespace + regex + word/char n-grams, no LLM).
- `rasa/domain.yml` — intents/entities/responses for greetings, stock, price, goodbye.
- `rasa/data/nlu.yml` — a few starter examples per intent (product entity annotated).
- `rasa/data/rules.yml` — maps intents to the canned responses.

How to run:
1) From `rasa/`, create a Python 3.11 venv and install: `python3.11 -m venv .venv && source .venv/bin/activate && pip install --upgrade pip && pip install rasa-pro` (export `RASA_PRO_TOKEN` first).
2) Train: `rasa train` (produces a classic model).
3) Run REST server: `rasa run --enable-api --cors "*" --port 5005`.
4) In this React app, set `VITE_RASA_REST_URL=http://localhost:5005/webhooks/rest/webhook` and `npm run dev`.

### FastAPI backend integration (bridges frontend → Rasa)

- Backend code lives in `backend/app`. It forwards chat messages to Rasa and (optionally) logs them to Supabase.
- Required env for backend (can be stored in `backend/.env`):
  - `RASA_URL` (default `http://localhost:5005/webhooks/rest/webhook`)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` (optional; enable logging + JWT verification)
- Run backend (from `backend/`):
  ```bash
  python3.11 -m venv .venv && source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
  ```

### Frontend ↔ backend wiring

- To send chat via backend: set `VITE_BACKEND_CHAT_URL=http://localhost:8000/chat/chat`.
- If your backend requires auth, set `VITE_BACKEND_AUTH_TOKEN=<jwt>` (sent as `Authorization: Bearer ...`).
- If `VITE_BACKEND_CHAT_URL` is not set, the widget will talk directly to Rasa via `VITE_RASA_REST_URL` (existing behavior).

### Gemini (direct mode) quickstart

Want to skip Rasa entirely and hit Gemini straight from the browser for quick demos?

1. Grab an API key from [Google AI Studio](https://aistudio.google.com/apikey) and add the following to `.env`:
   ```
   VITE_GEMINI_API_KEY=your-key-here
   VITE_GEMINI_MODEL=gemini-2.5-flash   # optional override
   VITE_GEMINI_SYSTEM_PROMPT=You are Kaki's friendly grocery concierge. Keep answers short.
   VITE_GEMINI_HISTORY_WINDOW=12        # how many previous turns to send
   ```
2. Leave `VITE_BACKEND_CHAT_URL` empty. When no backend is configured the widget prefers Gemini over Rasa whenever an API key is present.
3. Run `npm run dev` and start chatting. Each turn is sent to Gemini with the latest `VITE_GEMINI_HISTORY_WINDOW` messages as context.

> ⚠️ **Security reminder:** API keys embedded in frontend bundles are visible to users. Keep this mode for internal tests/demos and route requests through your backend for production deployments.

### Groq (direct mode) quickstart

Prefer Groq's hosted Llama models instead of Gemini?

1. Create an API key at [console.groq.com](https://console.groq.com/keys) and update `.env`:
   ```
   VITE_GROQ_API_KEY=your-groq-api-key
   VITE_GROQ_MODEL=llama-3.1-8b-instant   # or any Groq-supported chat model id
   VITE_GEMINI_SYSTEM_PROMPT=You are Kaki's friendly grocery concierge. Keep answers short.
   VITE_GEMINI_HISTORY_WINDOW=12
   ```
2. Leave `VITE_BACKEND_CHAT_URL` empty so the widget can talk directly to Groq. When a Groq key is present it takes priority over Gemini.
3. Run `npm run dev` and start chatting. Each turn is sent to Groq's OpenAI-compatible `/chat/completions` endpoint using the configured prompt + history window for context.

> ⚠️ **Security reminder:** Just like Gemini, Groq keys embedded in the frontend are visible to end users. Use this setup for local demos/testing only.

> ℹ️ **Grounding:** When Groq is enabled the widget automatically forwards your current FreshMart catalog + store location data with each request and instructs the model to stay within that context. Update the catalog/store data in the app to expand what the chatbot can reference, or route traffic through your backend for additional business logic.

### Chatbot-assisted navigation

- The chatbot can open common sections (home, cart, membership, store locations, specific products, etc.) when a shopper asks. Under the hood the assistant appends a hidden directive like `[[NAV:/membership]]` or `[[NAV:/product/heirloom-tomatoes]]`, and the widget routes to that page automatically.
- Routes are restricted to the list rendered in the app (plus product slugs from the current catalog). Keep slugs accurate if you want product detail jumps to work—e.g., `heirloom-tomatoes` maps to `/product/heirloom-tomatoes`.
- To add/remove destinations, edit `STATIC_NAV_TARGETS` in `src/components/Chatbot.jsx` or adjust the catalog data that is passed into the widget.

### Supabase integration (quick start)

1. Install the client: `npm install @supabase/supabase-js`
2. Add your Supabase project values to `.env`:
   - `VITE_SUPABASE_URL=https://<project>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon-key>`
3. Use the shared client in your code:
   ```js
   import { supabase } from "./lib/supabaseClient"

   const { data, error } = await supabase.from("products").select("*")
   ```
4. For auth flows, call helpers like `supabase.auth.signInWithPassword({ email, password })` or `supabase.auth.signOut()`.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
grocery-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx       # Navigation header
│   │   ├── ProductGrid.jsx  # Product listing
│   │   └── Chatbot.jsx      # Chatbot component
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Technologies Used

- React 18
- Vite
- CSS3

## License

MIT
