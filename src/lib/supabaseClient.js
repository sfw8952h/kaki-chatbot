// src/lib/supabaseClient.js
// Supabase client helper using env configuration

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars are missing; the client will not be initialized. " +
      "Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  )
}

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error(
      "Supabase client is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
    )
  }
  return supabase
}
