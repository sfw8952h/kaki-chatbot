// src/lib/supabaseClient.js
// Supabase client helper using env configuration

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars are missing; the client will not be initialized. " +
      "Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env (dev) " +
      "or in your hosting provider's environment variables (prod)."
  )
}

// This is the shared instance – will be null if env vars are missing
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const getSupabaseClient = () => {
  if (!supabase) {
    if (import.meta.env.DEV) {
      // In local development: fail loudly so you notice and fix your .env
      throw new Error(
        "Supabase client is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
      )
    } else {
      // In production: do NOT crash the whole app – let callers handle null instead
      console.error(
        "Supabase client is not configured in production. " +
          "Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
      )
      return null
    }
  }

  return supabase
}
