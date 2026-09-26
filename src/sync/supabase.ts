import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Anon key é pública por design; proteção real = RLS (migration 001).
// Sem env configurado, o app roda 100% local (IDB) — sync fica inativo.
// Guard `?.`: scripts node (tsx) importam este módulo sem `import.meta.env`.
const ENV: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env ?? {}
const URL = ENV.VITE_SUPABASE_URL
const ANON = ENV.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  URL && ANON ? createClient(URL, ANON) : null

export function isSyncEnabled() {
  return supabase !== null
}
