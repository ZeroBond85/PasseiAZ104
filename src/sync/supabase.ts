import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Anon key é pública por design; proteção real = RLS (migration 001).
// Sem env configurado, o app roda 100% local (IDB) — sync fica inativo.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  URL && ANON ? createClient(URL, ANON) : null

export function isSyncEnabled() {
  return supabase !== null
}
