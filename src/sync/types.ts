// Tipos de persistência (IDB). Question vive em engine/question-schema.
//
// Fonte única (Sprint 5, PLAN-3): cada record tem um schema Zod e o tipo é
// `z.infer` — uma definição alimenta TS + validação. `validate-migration-types`
// compara estas chaves (camelCase) com as colunas SQL (snake_case).
import { z } from 'zod'

export const SessionRecordSchema = z.object({
  id: z.string(), // simulado id
  state: z.string(),
  index: z.number(),
  answers: z.array(z.tuple([z.string(), z.array(z.string())])),
  flagged: z.array(z.string()),
  timerRemaining: z.number(),
  updatedAt: z.number(),
})
export type SessionRecord = z.infer<typeof SessionRecordSchema>

export const ProgressRecordSchema = z.object({
  questionId: z.string(),
  box: z.number(),
  dueAt: z.number(),
  usageCount: z.number(),
  lastSeenAt: z.number(),
})
export type ProgressRecord = z.infer<typeof ProgressRecordSchema>

export const MetaRecordSchema = z.object({
  key: z.string(),
  value: z.string(),
})
export type MetaRecord = z.infer<typeof MetaRecordSchema>

// v7.0 P2 — plataforma por usuário (espelha supabase migrations/002)

export const AttemptAnswerSchema = z.object({
  questionId: z.string(),
  correct: z.boolean(),
  given: z.array(z.string()),
  expected: z.array(z.string()),
})
export type AttemptAnswer = z.infer<typeof AttemptAnswerSchema>

export const ErrorTagSchema = z.enum([
  'concept_gap',
  'silly_mistake',
  'misread',
  'trap',
  'timeout',
])
export type ErrorTag = z.infer<typeof ErrorTagSchema>

export const AttemptRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kind: z.enum(['simulado', 'seed']),
  simuladoId: z.string(),
  startedAt: z.number(),
  finishedAt: z.number(),
  durationSeconds: z.number(),
  questions: z.number(),
  score: z.number(),
  passed: z.boolean(),
  answers: z.array(AttemptAnswerSchema),
  byDomain: z.record(
    z.string(),
    z.object({ raw: z.number(), max: z.number(), pct: z.number() }),
  ),
  errorTags: z.record(z.string(), ErrorTagSchema),
  createdAt: z.number(),
})
export type AttemptRecord = z.infer<typeof AttemptRecordSchema>

export const DoubtRecordSchema = z.object({
  questionId: z.string(),
  note: z.string(),
  tag: ErrorTagSchema.nullable(),
  resolved: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type DoubtRecord = z.infer<typeof DoubtRecordSchema>

// activityLog: dia ativo para streak — uma linha por (date, kind).
// Aberto para kind livres: simulado, questions_10, doubt, leitner.
export const ActivityRecordSchema = z.object({
  key: z.string(), // 'YYYY-MM-DD:kind' — chave composta do store
  date: z.string(), // YYYY-MM-DD local
  kind: z.string(),
  createdAt: z.number(),
})
export type ActivityRecord = z.infer<typeof ActivityRecordSchema>

export const StudyGuidePayloadSchema = z.object({
  score: z.number(),
  passed: z.boolean(),
  weakDomains: z.array(z.object({ domain: z.string(), pct: z.number() })),
  byType: z.record(
    z.string(),
    z.object({ total: z.number(), correct: z.number() }),
  ),
  byDifficulty: z.record(
    z.string(),
    z.object({ total: z.number(), correct: z.number() }),
  ),
  topErrors: z.array(
    z.object({
      questionId: z.string(),
      domain: z.string(),
      subdomain: z.string(),
    }),
  ),
  tips: z.array(z.string()),
})
export type StudyGuidePayload = z.infer<typeof StudyGuidePayloadSchema>

export const SuggestionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  generatedAt: z.number(),
  payload: StudyGuidePayloadSchema,
})
export type SuggestionRecord = z.infer<typeof SuggestionRecordSchema>

// Linha az104_profiles (upsert próprio nunca toca `role`).
export const ProfileRowSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  role: z.enum(['user', 'admin']).optional(),
})
export type ProfileRow = z.infer<typeof ProfileRowSchema>
