// vite config for the grocery app build and dev server
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/kaki-chatbot/',
})
