import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const ownerSignupUrl = import.meta.env.VITE_OWNER_SIGNUP_URL
export const backendReady = Boolean(supabase)

export function requireSupabase() {
  if (!supabase) throw new Error('Private storage is not connected yet. Add the Supabase settings to the deployment environment.')
  return supabase
}
