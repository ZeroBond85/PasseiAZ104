import {
  type DBSchema,
  type IDBPDatabase,
  type IDBPTransaction,
  openDB,
  type StoreNames,
} from 'idb'
import { logger } from '../utils/logger.js'
import {
  type ActivityRecord,
  ActivityRecordSchema,
  type AttemptRecord,
  type DoubtRecord,
  DoubtRecordSchema,
  type MetaRecord,
  type ProgressRecord,
  ProgressRecordSchema,
  type SessionRecord,
  type SuggestionRecord,
} from './types.js'

// Gate 2.1: progresso, dúvidas e atividade pertencem a um dono explícito.
// O keyPath continua sendo o campo `key`; `|` é válido no *valor* da chave
// (o `:` proibido pela LESSONS 16/set era no key path, não no valor).
export const LOCAL_OWNER_ID = 'local'
export const LEGACY_OWNER_ID = 'legacy'

function scopedKey(...parts: string[]): string {
  for (const part of parts) {
    if (!part || part.includes('|')) {
      throw new Error('parte inválida para chave com dono')
    }
  }
  return parts.join('|')
}

export function progressKey(userId: string, questionId: string): string {
  return scopedKey(userId, questionId)
}

export function doubtKey(userId: string, questionId: string): string {
  return scopedKey(userId, questionId)
}

export function activityKey(
  userId: string,
  date: string,
  kind: string,
): string {
  return scopedKey(userId, date, kind)
}

export function resolveOwnerId(userId: string | null | undefined): string {
  return userId ?? LOCAL_OWNER_ID
}

interface AzDB extends DBSchema {
  sessions: { key: string; value: SessionRecord }
  progress: {
    key: string
    value: ProgressRecord
    indexes: { 'by-owner': string }
  }
  meta: { key: string; value: MetaRecord }
  questions: { key: string; value: { id: string; json: string } }
  attempts: { key: string; value: AttemptRecord }
  doubts: {
    key: string
    value: DoubtRecord
    indexes: { 'by-owner': string }
  }
  activity: {
    key: string
    value: ActivityRecord
    indexes: { 'by-owner': string }
  }
  suggestions: { key: string; value: SuggestionRecord }
}

let db: IDBPDatabase<AzDB> | null = null

export function toLegacyProgress(row: Record<string, unknown>): ProgressRecord {
  const questionId = row.questionId
  if (typeof questionId !== 'string' || !questionId) {
    throw new Error('progresso legado sem questionId')
  }
  const parsed = ProgressRecordSchema.safeParse({
    ...row,
    userId: LEGACY_OWNER_ID,
    key: progressKey(LEGACY_OWNER_ID, questionId),
  })
  if (!parsed.success) {
    throw new Error(
      `progresso legado inválido: ${parsed.error.issues[0]?.message ?? 'schema'}`,
    )
  }
  return parsed.data
}

export function toLegacyDoubt(row: Record<string, unknown>): DoubtRecord {
  const questionId = row.questionId
  if (typeof questionId !== 'string' || !questionId) {
    throw new Error('dúvida legada sem questionId')
  }
  const parsed = DoubtRecordSchema.safeParse({
    ...row,
    userId: LEGACY_OWNER_ID,
    key: doubtKey(LEGACY_OWNER_ID, questionId),
  })
  if (!parsed.success) {
    throw new Error(
      `dúvida legada inválida: ${parsed.error.issues[0]?.message ?? 'schema'}`,
    )
  }
  return parsed.data
}

export function toLegacyActivity(row: Record<string, unknown>): ActivityRecord {
  const date = row.date
  const kind = row.kind
  if (typeof date !== 'string' || !date || typeof kind !== 'string' || !kind) {
    throw new Error('atividade legada sem date/kind')
  }
  const parsed = ActivityRecordSchema.safeParse({
    ...row,
    userId: LEGACY_OWNER_ID,
    key: activityKey(LEGACY_OWNER_ID, date, kind),
  })
  if (!parsed.success) {
    throw new Error(
      `atividade legada inválida: ${parsed.error.issues[0]?.message ?? 'schema'}`,
    )
  }
  return parsed.data
}

type UserScopedStoreName = 'progress' | 'doubts' | 'activity'
type UserScopedRow = ProgressRecord | DoubtRecord | ActivityRecord

async function replaceUserScopedStore(
  db: IDBPDatabase<AzDB>,
  tx: IDBPTransaction<AzDB, ArrayLike<StoreNames<AzDB>>, 'versionchange'>,
  name: UserScopedStoreName,
  toOwned: (row: Record<string, unknown>) => UserScopedRow,
): Promise<void> {
  const legacyRows = (await tx.objectStore(name).getAll()) as unknown as Record<
    string,
    unknown
  >[]
  db.deleteObjectStore(name)
  const store = db.createObjectStore(name, { keyPath: 'key' })
  store.createIndex('by-owner', 'userId', { unique: false })
  for (const row of legacyRows) {
    try {
      const put = store.put as (value: UserScopedRow) => Promise<unknown>
      await put(toOwned(row))
    } catch (err) {
      logger.warn('data', 'linha legada ignorada na migração v3', {
        store: name,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

export async function getDB() {
  if (!db) {
    db = await openDB<AzDB>('passei-az104', 3, {
      async upgrade(d, old, _new, tx) {
        if (old < 1) {
          d.createObjectStore('sessions', { keyPath: 'id' })
          const progress = d.createObjectStore('progress', { keyPath: 'key' })
          progress.createIndex('by-owner', 'userId', { unique: false })
          d.createObjectStore('meta', { keyPath: 'key' })
          d.createObjectStore('questions', { keyPath: 'id' })
        }
        if (old < 2) {
          d.createObjectStore('attempts', { keyPath: 'id' })
          const doubts = d.createObjectStore('doubts', { keyPath: 'key' })
          doubts.createIndex('by-owner', 'userId', { unique: false })
          const activity = d.createObjectStore('activity', { keyPath: 'key' })
          activity.createIndex('by-owner', 'userId', { unique: false })
          d.createObjectStore('suggestions', { keyPath: 'id' })
          // meta pode já existir da v1 — sem conflito.
        }
        // R2(b): migração in-place. Linhas antigas não têm dono confiável e
        // por isso viram `legacy`: continuam no aparelho e no modo local, mas
        // nunca são lidas nem enviadas como se fossem do usuário logado.
        if (old >= 1 && old < 3) {
          await replaceUserScopedStore(d, tx, 'progress', toLegacyProgress)
          if (old >= 2) {
            await replaceUserScopedStore(d, tx, 'doubts', toLegacyDoubt)
            await replaceUserScopedStore(d, tx, 'activity', toLegacyActivity)
          }
        }
      },
    })
  }
  return db
}

async function loadOwned(
  store: UserScopedStoreName,
  userId: string,
): Promise<UserScopedRow[]> {
  const db = await getDB()
  const mine = await db.getAllFromIndex(store, 'by-owner', userId)
  if (userId !== LOCAL_OWNER_ID) return mine
  // O modo local é o próprio aparelho: mantém o comportamento anterior e
  // inclui linhas legadas sem dono. Usuário autenticado nunca as recebe.
  const legacy = await db.getAllFromIndex(store, 'by-owner', LEGACY_OWNER_ID)
  return [...mine, ...legacy]
}

// Sessão (writer único: QuizEngine salva tudo de 30/30s numa transação)
export async function saveSession(s: SessionRecord) {
  return (await getDB()).put('sessions', s)
}

export async function loadSession(id: string) {
  return (await getDB()).get('sessions', id)
}

// Progresso Leitner + uso
export async function saveProgress(p: ProgressRecord) {
  return (await getDB()).put('progress', p)
}

export async function loadProgressForUser(
  userId: string,
): Promise<ProgressRecord[]> {
  return (await loadOwned('progress', userId)) as ProgressRecord[]
}

// Banco de questões (seed na 1ª carga)
export async function seedQuestions(items: { id: string; json: string }[]) {
  const d = await getDB()
  const tx = d.transaction('questions', 'readwrite')
  for (const item of items) await tx.store.put(item)
  await tx.done
}

export async function loadAllQuestions() {
  return (await getDB()).getAll('questions')
}

export async function questionsCount() {
  return (await getDB()).count('questions')
}

// ---- v7.0 P2: plataforma por usuário (espelha Supabase) ----

// attempts: append-only (imutável após finalizar)
export async function saveAttempt(a: AttemptRecord) {
  return (await getDB()).put('attempts', a)
}

export async function loadAllAttempts(): Promise<AttemptRecord[]> {
  const all = await (await getDB()).getAll('attempts')
  return all.sort((a, b) => b.finishedAt - a.finishedAt)
}

export async function loadAttemptsForUser(userId: string) {
  const all = await loadAllAttempts()
  return all.filter((a) => a.userId === userId)
}

export async function deleteAttempt(id: string) {
  return (await getDB()).delete('attempts', id)
}

// doubts: uma por questão por usuário (user_id no remote; local por dono)
export async function saveDoubt(d: DoubtRecord) {
  return (await getDB()).put('doubts', d)
}

export async function loadDoubtsForUser(
  userId: string,
): Promise<DoubtRecord[]> {
  const all = (await loadOwned('doubts', userId)) as DoubtRecord[]
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function loadDoubtForUser(userId: string, questionId: string) {
  return (await getDB()).get('doubts', doubtKey(userId, questionId))
}

export async function deleteDoubtForUser(userId: string, questionId: string) {
  return (await getDB()).delete('doubts', doubtKey(userId, questionId))
}

// activity: streak/atividade — chave composta com dono, sem `:` no keyPath
export async function markActivityForUser(
  userId: string,
  date: string,
  kind: string,
) {
  const key = activityKey(userId, date, kind)
  const existing = await (await getDB()).get('activity', key)
  if (existing) return
  await saveActivity({ userId, key, date, kind, createdAt: Date.now() })
}

export async function saveActivity(a: ActivityRecord) {
  return (await getDB()).put('activity', a)
}

export async function loadActivityForUser(
  userId: string,
): Promise<ActivityRecord[]> {
  return (await loadOwned('activity', userId)) as ActivityRecord[]
}

// suggestions: snapshots da análise diária
export async function saveSuggestion(s: SuggestionRecord) {
  return (await getDB()).put('suggestions', s)
}

export async function loadAllSuggestions() {
  const all = await (await getDB()).getAll('suggestions')
  return all.sort((a, b) => b.generatedAt - a.generatedAt)
}

// meta helpers (streak persistido localmente é determinístico, sem tabela)
export async function setMeta(key: string, value: string) {
  return (await getDB()).put('meta', { key, value })
}

export async function getMeta(key: string) {
  return (await getDB()).get('meta', key)
}
