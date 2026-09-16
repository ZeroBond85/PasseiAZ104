import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type {
  ActivityRecord,
  AttemptRecord,
  DoubtRecord,
  MetaRecord,
  ProgressRecord,
  SessionRecord,
  SuggestionRecord,
} from './types.js'

interface AzDB extends DBSchema {
  sessions: { key: string; value: SessionRecord }
  progress: { key: string; value: ProgressRecord }
  meta: { key: string; value: MetaRecord }
  questions: { key: string; value: { id: string; json: string } }
  attempts: { key: string; value: AttemptRecord }
  doubts: { key: string; value: DoubtRecord }
  activity: { key: string; value: ActivityRecord }
  suggestions: { key: string; value: SuggestionRecord }
}

let db: IDBPDatabase<AzDB> | null = null

export async function getDB() {
  if (!db) {
    db = await openDB<AzDB>('passei-az104', 2, {
      upgrade(d, old, _new, tx) {
        if (old < 1) {
          d.createObjectStore('sessions', { keyPath: 'id' })
          d.createObjectStore('progress', { keyPath: 'questionId' })
          d.createObjectStore('meta', { keyPath: 'key' })
          d.createObjectStore('questions', { keyPath: 'id' })
        }
        if (old < 2) {
          d.createObjectStore('attempts', { keyPath: 'id' })
          d.createObjectStore('doubts', { keyPath: 'questionId' })
          d.createObjectStore('activity', { keyPath: 'key' })
          d.createObjectStore('suggestions', { keyPath: 'id' })
          // meta pode já existir da v1 — sem conflito.
          void tx
        }
      },
    })
  }
  return db
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

export async function loadAllProgress() {
  return (await getDB()).getAll('progress')
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

// doubts: uma por questão (user_id no remote; local é por usuário logado)
export async function saveDoubt(d: DoubtRecord) {
  return (await getDB()).put('doubts', d)
}

export async function loadAllDoubts(): Promise<DoubtRecord[]> {
  const all = await (await getDB()).getAll('doubts')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function loadDoubt(questionId: string) {
  return (await getDB()).get('doubts', questionId)
}

export async function deleteDoubt(questionId: string) {
  return (await getDB()).delete('doubts', questionId)
}

// activity: streak/atividade — chave composta 'date:kind'
export async function markActivity(date: string, kind: string) {
  const key = `${date}:${kind}`
  const existing = await (await getDB()).get('activity', key)
  if (existing) return
  await saveActivity({ key, date, kind, createdAt: Date.now() })
}

export async function saveActivity(a: ActivityRecord) {
  return (await getDB()).put('activity', a)
}

export async function loadAllActivity() {
  return (await getDB()).getAll('activity')
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
