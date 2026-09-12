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
