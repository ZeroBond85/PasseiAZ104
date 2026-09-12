import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { MetaRecord, ProgressRecord, SessionRecord } from './types.js'

interface AzDB extends DBSchema {
  sessions: { key: string; value: SessionRecord }
  progress: { key: string; value: ProgressRecord }
  meta: { key: string; value: MetaRecord }
  questions: { key: string; value: { id: string; json: string } }
}

let db: IDBPDatabase<AzDB> | null = null

export async function getDB() {
  if (!db) {
    db = await openDB<AzDB>('passei-az104', 1, {
      upgrade(d) {
        d.createObjectStore('sessions', { keyPath: 'id' })
        d.createObjectStore('progress', { keyPath: 'questionId' })
        d.createObjectStore('meta', { keyPath: 'key' })
        d.createObjectStore('questions', { keyPath: 'id' })
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
