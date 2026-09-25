// Perfil de estudo por usuário: links vistos + preferências + histórico de drills.
// Armazenamento: localStorage por usuário (pequeno, um JSON) + espelho Supabase
// (az104_study_profile). IDB fica p/ dados relacionais (attempts/progress);
// perfil é um documento único — localStorage evita migração de schema IDB.
export interface SeenLink {
  topicId: string
  seenAt: number
}

export interface WeakDomain {
  domain: string
  pct: number
  at: number
}

export interface DrillEntry {
  date: number
  questions: number
  score: number
}

export interface StudyProfile {
  seen: SeenLink[]
  weak: WeakDomain[]
  drills: DrillEntry[]
  preferences: { autoDrill: boolean; notify: boolean }
  updatedAt: number
}

const KEY = (userId: string) => `az104-study-profile:${userId}`

function blank(): StudyProfile {
  return {
    seen: [],
    weak: [],
    drills: [],
    preferences: { autoDrill: true, notify: false },
    updatedAt: 0,
  }
}

export function loadProfile(userId: string): StudyProfile {
  try {
    const raw = localStorage.getItem(KEY(userId))
    if (!raw) return blank()
    const p = JSON.parse(raw) as Partial<StudyProfile>
    return {
      seen: Array.isArray(p.seen) ? p.seen : [],
      weak: Array.isArray(p.weak) ? p.weak : [],
      drills: Array.isArray(p.drills) ? p.drills : [],
      preferences: {
        autoDrill: p.preferences?.autoDrill !== false,
        notify: p.preferences?.notify === true,
      },
      updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0,
    }
  } catch {
    return blank()
  }
}

export function saveProfile(userId: string, p: StudyProfile) {
  p.updatedAt = Date.now()
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(p))
  } catch {
    // quota cheia: perfil volta ao blank no próximo load (sync cobre nuvem)
  }
}

export function isSeen(p: StudyProfile, topicId: string): boolean {
  return p.seen.some((s) => s.topicId === topicId)
}

export function markSeen(p: StudyProfile, topicId: string): StudyProfile {
  if (isSeen(p, topicId)) return p
  return {
    ...p,
    seen: [...p.seen, { topicId, seenAt: Date.now() }],
  }
}

export function profileKey(userId: string): string {
  return KEY(userId)
}
