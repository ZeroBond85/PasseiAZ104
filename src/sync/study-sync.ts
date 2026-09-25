import {
  loadProfile,
  profileKey,
  type StudyProfile,
  saveProfile,
} from '../study/study-profile.js'
import { isSyncEnabled, supabase } from './supabase.js'

// Espelho do perfil de estudo (LWW por updatedAt). Sem sessão: só local.
export async function pushStudyProfile(userId: string) {
  if (!isSyncEnabled() || !supabase || userId === 'local') return
  const p = loadProfile(userId)
  const { error } = await supabase.from('az104_study_profile').upsert(
    {
      user_id: userId,
      weak_domains: p.weak,
      study_links: p.seen,
      drill_history: p.drills,
      preferences: p.preferences,
      updated_at: p.updatedAt,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(`push study_profile: ${error.message}`)
}

export async function pullStudyProfile(userId: string) {
  if (!isSyncEnabled() || !supabase || userId === 'local') return
  const { data, error } = await supabase
    .from('az104_study_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`pull study_profile: ${error.message}`)
  if (!data) return
  const local = loadProfile(userId)
  const remoteAt = Number(data.updated_at ?? 0)
  if (remoteAt <= local.updatedAt) return
  const merged: StudyProfile = {
    seen: Array.isArray(data.study_links) ? data.study_links : [],
    weak: Array.isArray(data.weak_domains) ? data.weak_domains : [],
    drills: Array.isArray(data.drill_history) ? data.drill_history : [],
    preferences: {
      autoDrill: data.preferences?.autoDrill !== false,
      notify: data.preferences?.notify === true,
    },
    updatedAt: remoteAt,
  }
  try {
    localStorage.setItem(profileKey(userId), JSON.stringify(merged))
  } catch {
    // quota: mantém local
  }
  saveProfile(userId, merged)
}
