// vite config for the grocery app build and dev server
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Allow overriding the base path via env (useful for GitHub Pages/custom domains)
const rawBase = process.env.VITE_BASE_PATH || '/kaki-chatbot/'
const normalizeBase = (value) => {
  if (!value) return '/'
  // ensure leading and trailing slash
  const trimmed = value.replace(/^[\\/]+|[\\/]+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

export default defineConfig({
  plugins: [react()],
  base: normalizeBase(rawBase),
})
