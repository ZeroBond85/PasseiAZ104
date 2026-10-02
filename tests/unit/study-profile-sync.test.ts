import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadProfile,
  type StudyProfile,
  saveProfile,
} from '../../src/study/study-profile.js'
import {
  pullStudyProfile,
  pushStudyProfile,
} from '../../src/sync/study-sync.js'

const h = vi.hoisted(() => ({
  data: null as Record<string, unknown> | null,
  upserts: [] as Record<string, unknown>[],
}))

vi.mock('../../src/sync/supabase.js', () => ({
  isSyncEnabled: () => true,
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: h.data, error: null }),
        }),
      }),
      upsert: async (payload: Record<string, unknown>) => {
        h.upserts.push(payload)
        return { error: null }
      },
    }),
  },
}))

const profile = (updatedAt: number): StudyProfile => ({
  seen: [{ topicId: 'vms', seenAt: 1 }],
  weak: [{ domain: 'compute', pct: 0.5, at: 1 }],
  drills: [],
  preferences: { autoDrill: true, notify: false },
  updatedAt,
})

const stored = (store: Map<string, string>, key: string): StudyProfile =>
  JSON.parse(store.get(key) ?? 'null') as StudyProfile

describe('study-profile / study-sync (LWW por updatedAt)', () => {
  const store = new Map<string, string>()
  const KEY = 'az104-study-profile:u1'

  beforeEach(() => {
    store.clear()
    h.data = null
    h.upserts.length = 0
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saveProfile persiste sem reescrever updatedAt', () => {
    saveProfile('u1', profile(500))
    expect(loadProfile('u1').updatedAt).toBe(500)
  })

  it('pullStudyProfile mantém o updatedAt remoto (LWW preservado)', async () => {
    saveProfile('u1', profile(100))
    h.data = {
      updated_at: 900,
      study_links: [{ topicId: 'dns', seenAt: 900 }],
      weak_domains: [],
      drill_history: [],
      preferences: { autoDrill: false, notify: true },
    }
    await pullStudyProfile('u1')
    const p = loadProfile('u1')
    expect(p.updatedAt).toBe(900)
    expect(p.seen[0].topicId).toBe('dns')
    expect(stored(store, KEY).updatedAt).toBe(900)
  })

  it('pull ignora remoto mais velho que o local', async () => {
    saveProfile('u1', profile(900))
    h.data = {
      updated_at: 800,
      study_links: [],
      weak_domains: [],
      drill_history: [],
      preferences: {},
    }
    await pullStudyProfile('u1')
    expect(loadProfile('u1').updatedAt).toBe(900)
  })

  it('pushStudyProfile envia o updatedAt persistido, não o do relógio', async () => {
    saveProfile('u1', profile(700))
    await pushStudyProfile('u1')
    expect(h.upserts).toHaveLength(1)
    expect(h.upserts[0].updated_at).toBe(700)
  })
})
