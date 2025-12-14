// vite config for the grocery app build and dev server
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Default to root deployment; allow overriding for subpath (e.g., GitHub Pages repo)
const rawBase = process.env.VITE_BASE_PATH || '/'
const normalizeBase = (value) => {
  if (!value) return '/'
  // ensure leading and trailing slash
  const trimmed = value.replace(/^[\\/]+|[\\/]+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

export default defineConfig({
  plugins: [react()],
  base: normalizeBase(rawBase),
  server: {
    // Reduce filesystem watchers (avoid crawling Python/Node virtual envs)
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.venv/**',
        '**/venv/**',
        '**/rasa/.venv/**',
      ],
    },
  },
})
