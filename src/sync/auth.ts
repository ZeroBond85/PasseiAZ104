import { isSyncEnabled, supabase } from './supabase.js'

export async function getUserId(): Promise<string | null> {
  if (!isSyncEnabled() || !supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function signInWithEmail(email: string) {
  if (!isSyncEnabled() || !supabase)
    throw new Error('sync desativado (sem env)')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  })
  if (error) throw new Error(error.message)
}

export async function signOut() {
  if (!isSyncEnabled() || !supabase) return
  await supabase.auth.signOut()
}

export function onAuthChange(cb: (userId: string | null) => void) {
  if (!isSyncEnabled() || !supabase) return () => undefined
  const { data } = supabase.auth.onAuthStateChange((_e, session) => {
    cb(session?.user.id ?? null)
  })
  return () => data.subscription.unsubscribe()
}
