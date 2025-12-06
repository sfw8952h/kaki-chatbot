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
- npm or yarn

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

