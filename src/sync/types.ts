// Tipos de persistência (IDB). Question vive em engine/question-schema.

export interface SessionRecord {
  id: string // simulado id
  state: string
  index: number
  answers: [string, string[]][]
  flagged: string[]
  timerRemaining: number
  updatedAt: number
}

export interface ProgressRecord {
  questionId: string
  box: number
  dueAt: number
  usageCount: number
  lastSeenAt: number
}

export interface MetaRecord {
  key: string
  value: string
}

// v7.0 P2 — plataforma por usuário (espelha supabase migrations/002)

export interface AttemptAnswer {
  questionId: string
  correct: boolean
  given: string[]
  expected: string[]
}

export type ErrorTag =
  | 'concept_gap'
  | 'silly_mistake'
  | 'misread'
  | 'trap'
  | 'timeout'

export interface AttemptRecord {
  id: string
  userId: string
  kind: 'simulado' | 'seed'
  simuladoId: string
  startedAt: number
  finishedAt: number
  durationSeconds: number
  questions: number
  score: number
  passed: boolean
  answers: AttemptAnswer[]
  byDomain: Record<string, { raw: number; max: number; pct: number }>
  errorTags: Record<string, ErrorTag>
  createdAt: number
}

export interface DoubtRecord {
  questionId: string
  note: string
  tag: ErrorTag | null
  resolved: boolean
  createdAt: number
  updatedAt: number
}

// activityLog: dia ativo para streak — uma linha por (date, kind).
// Aberto para kind livres: simulado, questions_10, doubt, leitner.
export interface ActivityRecord {
  key: string // 'YYYY-MM-DD:kind' — chave composta do store
  date: string // YYYY-MM-DD local
  kind: string
  createdAt: number
}

export interface SuggestionRecord {
  id: string
  userId: string
  generatedAt: number
  payload: StudyGuidePayload
}

// Snapshot da análise diária (estado do estudo no dia X).
export interface StudyGuidePayload {
  score: number
  passed: boolean
  weakDomains: { domain: string; pct: number }[]
  byType: Record<string, { total: number; correct: number }>
  byDifficulty: Record<string, { total: number; correct: number }>
  topErrors: { questionId: string; domain: string; subdomain: string }[]
  tips: string[]
}
