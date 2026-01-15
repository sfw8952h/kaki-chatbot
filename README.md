# KAKI – Grocery storefront + AI assistant

Kaki pairs a responsive Vite + React storefront with Supabase-backed memberships and a Groq-powered chatbot that can answer product, tier, and navigation questions.

## Quick start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure:
   - `VITE_BACKEND_CHAT_URL` (points to your assistant backend; leave blank to talk directly to Groq)
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (add a service key/JWT secret for protected APIs)
3. Run `npm run dev` and open the URL shown in the terminal.

## Features

- Product grid with availability badges, quantity controls, and add-to-cart flows  
- Membership tiers (Bronze / Silver / Gold) tied to Supabase `profiles` and surfaced on `/membership`  
- Chatbot that uses catalog, store, and membership context and can emit `[[NAV:/…]]` directives  
- Supabase client ready for orders, memberships, and profile updates

## Chatbot notes

- Prefer `VITE_BACKEND_CHAT_URL` for your assistant (it can forward requests to any LLM).  
- Each request includes the latest catalog, store, and membership context so the assistant stays grounded.  
- Navigation commands only work for the routes listed in `STATIC_NAV_TARGETS` plus catalog slugs that are passed into the component.

## Scripts

- `npm run dev` – start the dev server  
- `npm run build` – bundle for production  
- `npm run preview` – preview the production build locally

## Tech stack

- React 18  
- Vite  
- Supabase (profiles, memberships, orders)  
- Groq/chatbot frontend


