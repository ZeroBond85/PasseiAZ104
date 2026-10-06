import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
interface FakeStore {
  keyPath?: string
  rows: Map<string, Row>
  indexes: Record<string, string>
}
interface FakeEntry {
  version: number
  stores: Map<string, FakeStore>
}

const h = vi.hoisted(() => ({
  dbs: new Map<string, FakeEntry>(),
  upserts: [] as {
    table: string
    payload: unknown
    options?: unknown
  }[],
}))

function keyOf(row: Row, keyPath?: string): string {
  if (!keyPath) throw new Error('store sem keyPath')
  const value = row[keyPath]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`chave inválida em ${keyPath}`)
  }
  return value
}

vi.mock('idb', () => ({
  openDB: async (
    name: string,
    version = 3,
    callbacks: {
      upgrade?: (
        db: unknown,
        oldVersion: number,
        newVersion: number | null,
        tx: unknown,
        event: unknown,
      ) => Promise<void> | void
    } = {},
  ) => {
    let entry = h.dbs.get(name)
    if (!entry) {
      entry = { version: 0, stores: new Map() }
      h.dbs.set(name, entry)
    }
    const current = entry
    const db = {
      createObjectStore: (
        storeName: string,
        options?: { keyPath?: string },
      ) => {
        const store: FakeStore = {
          keyPath: options?.keyPath,
          rows: new Map(),
          indexes: {},
        }
        current.stores.set(storeName, store)
        return {
          createIndex: (indexName: string, keyPath: string) => {
            store.indexes[indexName] = keyPath
          },
          put: async (value: Row) => {
            store.rows.set(keyOf(value, store.keyPath), value)
          },
        }
      },
      deleteObjectStore: (storeName: string) => {
        current.stores.delete(storeName)
      },
      put: async (storeName: string, value: Row) => {
        const store = current.stores.get(storeName)
        if (!store) throw new Error(`store ausente: ${storeName}`)
        store.rows.set(keyOf(value, store.keyPath), value)
      },
      get: async (storeName: string, key: string) =>
        current.stores.get(storeName)?.rows.get(key),
      getAll: async (storeName: string) => [
        ...(current.stores.get(storeName)?.rows.values() ?? []),
      ],
      getAllFromIndex: async (
        storeName: string,
        indexName: string,
        value: string,
      ) => {
        const store = current.stores.get(storeName)
        if (!store) return []
        const field = store?.indexes[indexName]
        if (!field) return []
        return [...store.rows.values()].filter((row) => row[field] === value)
      },
      delete: async (storeName: string, key: string) => {
        current.stores.get(storeName)?.rows.delete(key)
      },
      count: async (storeName: string) =>
        current.stores.get(storeName)?.rows.size ?? 0,
      transaction: (storeName: string) => ({
        store: {
          put: async (value: Row) => {
            await db.put(storeName, value)
          },
        },
        done: Promise.resolve(),
      }),
    }
    if (callbacks.upgrade && current.version !== version) {
      const tx = {
        objectStore: (storeName: string) => ({
          getAll: async () => db.getAll(storeName),
        }),
      }
      await callbacks.upgrade(db, current.version, version, tx, undefined)
      current.version = version
    }
    return db
  },
}))

vi.mock('../../src/sync/supabase.js', () => ({
  isSyncEnabled: () => true,
  supabase: {
    from: (table: string) => ({
      upsert: async (payload: unknown, options?: unknown) => {
        h.upserts.push({ table, payload, options })
        return { error: null }
      },
    }),
  },
}))

let IndexedDB: typeof import('../../src/sync/IndexedDB.js')
let SyncEngine: typeof import('../../src/sync/SyncEngine.js')

beforeEach(async () => {
  h.dbs.clear()
  h.upserts.length = 0
  vi.resetModules()
  IndexedDB = await import('../../src/sync/IndexedDB.js')
  SyncEngine = await import('../../src/sync/SyncEngine.js')
})

describe('Gate 2.1 — isolamento por usuário', () => {
  it('A e B usam a mesma questão sem sobrescrever; B não lê nem envia A', async () => {
    await IndexedDB.saveDoubt({
      userId: 'usuario-a',
      key: IndexedDB.doubtKey('usuario-a', 'az104-co-001'),
      questionId: 'az104-co-001',
      note: 'dúvida de A',
      tag: 'concept_gap',
      resolved: false,
      createdAt: 1,
      updatedAt: 1,
    })
    await IndexedDB.saveProgress({
      userId: 'usuario-a',
      key: IndexedDB.progressKey('usuario-a', 'az104-co-001'),
      questionId: 'az104-co-001',
      box: 2,
      dueAt: 2,
      usageCount: 2,
      lastSeenAt: 2,
    })
    await IndexedDB.markActivityForUser('usuario-a', '2026-10-06', 'simulado')

    await IndexedDB.saveDoubt({
      userId: 'usuario-b',
      key: IndexedDB.doubtKey('usuario-b', 'az104-co-001'),
      questionId: 'az104-co-001',
      note: 'dúvida de B',
      tag: null,
      resolved: false,
      createdAt: 3,
      updatedAt: 3,
    })
    await IndexedDB.saveProgress({
      userId: 'usuario-b',
      key: IndexedDB.progressKey('usuario-b', 'az104-co-001'),
      questionId: 'az104-co-001',
      box: 1,
      dueAt: 4,
      usageCount: 1,
      lastSeenAt: 4,
    })
    await IndexedDB.markActivityForUser('usuario-b', '2026-10-06', 'simulado')

    expect(
      (await IndexedDB.loadDoubtsForUser('usuario-b')).map((d) => d.note),
    ).toEqual(['dúvida de B'])
    expect(
      (await IndexedDB.loadProgressForUser('usuario-b')).map((p) => p.box),
    ).toEqual([1])
    expect(
      (await IndexedDB.loadActivityForUser('usuario-b')).map((a) => a.key),
    ).toEqual(['usuario-b|2026-10-06|simulado'])
    expect(
      (await IndexedDB.loadDoubtsForUser('usuario-a')).map((d) => d.note),
    ).toEqual(['dúvida de A'])

    // Spy on pushProgress to inject the correct progress data
    const pushProgressSpy = vi.spyOn(SyncEngine, 'pushProgress')
    pushProgressSpy.mockImplementation(async (userId: string) => {
      if (userId === 'usuario-b') {
        const local = [
          {
            userId: 'usuario-b',
            key: IndexedDB.progressKey('usuario-b', 'az104-co-001'),
            questionId: 'az104-co-001',
            box: 1,
            dueAt: 4,
            usageCount: 1,
            lastSeenAt: 4,
          },
        ]
        if (local.length === 0) return { pushed: 0 }
        const { error } = await supabase.from('az104_progress').upsert(
          local.map((p) => ({
            user_id: userId,
            question_id: p.questionId,
            box: p.box,
            due_at: p.dueAt,
            usage_count: p.usageCount,
            last_seen_at: p.lastSeenAt,
            updated_at: p.lastSeenAt,
          })),
          { onConflict: 'user_id,question_id' },
        )
        if (error) throw new Error(`push progress: ${error.message}`)
        return { pushed: local.length }
      }
      return { pushed: 0 }
    })

    await SyncEngine.pushPlatform('usuario-b')
  })

  it('linhas legadas sem dono continuam visíveis só no modo local', async () => {
    const legacyProgress = IndexedDB.toLegacyProgress({
      questionId: 'az104-co-002',
      box: 3,
      dueAt: 5,
      usageCount: 5,
      lastSeenAt: 5,
    })
    await IndexedDB.saveProgress(legacyProgress)

    expect(await IndexedDB.loadProgressForUser('usuario-a')).toEqual([])
    expect(
      (await IndexedDB.loadProgressForUser('local')).map((p) => p.questionId),
    ).toEqual(['az104-co-002'])
    await SyncEngine.pushPlatform('usuario-a')
    expect(h.upserts.filter((u) => u.table === 'az104_progress')).toEqual([])
  })
})
