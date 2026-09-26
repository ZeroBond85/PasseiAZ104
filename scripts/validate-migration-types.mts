// validate-migration-types.mts — deriva SQL × Zod × TS em um passo (Sprint 5).
// Compara colunas das migrations com as chaves dos schemas Zod (fonte única
// dos tipos). Offline, sem segredos. Exit 1 se divergir.
// - Tabela referenciada no código e ausente no SQL → ERRO.
// - Coluna esperada (Zod) ausente no SQL → ERRO.
// - Coluna extra no SQL → OK (server-managed: created_at etc.).
// - Tabelas blob (state_json) ou sem interface 1:1 → só existência.
import { readdirSync, readFileSync } from 'node:fs'
import type { ZodObject, ZodRawShape } from 'zod'
import { StudyTopicSchema } from '../src/study/topics.js'
import {
  ActivityRecordSchema,
  AttemptRecordSchema,
  DoubtRecordSchema,
  ProfileRowSchema,
  ProgressRecordSchema,
  SuggestionRecordSchema,
} from '../src/sync/types.js'

const SQL_DIR = new URL('../supabase/migrations/', import.meta.url)
const SRC_DIR = new URL('../src/', import.meta.url)

const camelToSnake = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

function shapeKeys(schema: ZodObject<ZodRawShape>): string[] {
  return Object.keys(schema.shape)
}

interface TableSpec {
  schema?: ZodObject<ZodRawShape>
  skip?: string[] // chaves Zod sem coluna (ex.: chave composta client-side)
  rename?: Record<string, string> // chave Zod → coluna SQL (ex.: date → activity_date)
  extras?: string[] // colunas SQL sem chave Zod (ex.: FKs user_id)
  blob?: boolean // mapeamento via jsonb — só existência
}

const SPECS: Record<string, TableSpec> = {
  az104_progress: { schema: ProgressRecordSchema, extras: ['user_id'] },
  az104_sessions: { blob: true },
  az104_profiles: { schema: ProfileRowSchema },
  az104_attempts: { schema: AttemptRecordSchema, extras: ['user_id'] },
  az104_doubts: { schema: DoubtRecordSchema, extras: ['user_id'] },
  az104_activity_log: {
    schema: ActivityRecordSchema,
    skip: ['key'],
    rename: { date: 'activity_date' },
    extras: ['user_id'],
  },
  az104_study_suggestions: {
    schema: SuggestionRecordSchema,
    extras: ['user_id'],
  },
  az104_admin_logs: { blob: true },
  az104_study_topics: { schema: StudyTopicSchema },
  // az104_study_profile: shape local difere da linha (sync mapeia explícito) — só existência.
  az104_study_profile: { blob: true },
}

// ---- parse SQL ----
const sqlFiles = readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql'))
const sqlTables = new Map<string, Set<string>>()
const createRe =
  /create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\);/g
for (const f of sqlFiles) {
  const text = readFileSync(new URL(f, SQL_DIR), 'utf8')
  for (const m of text.matchAll(createRe)) {
    const cols = new Set<string>()
    for (const line of m[2].split('\n')) {
      const name = line.trim().split(/\s+/)[0]?.replace(/[,()]/g, '')
      if (
        name &&
        /^[a-z_][a-z0-9_]*$/.test(name) &&
        !['primary', 'unique', 'check', 'foreign', 'constraint'].includes(name)
      ) {
        cols.add(name)
      }
    }
    const prev = sqlTables.get(m[1]) ?? new Set<string>()
    for (const c of cols) prev.add(c)
    sqlTables.set(m[1], prev)
  }
}

// ---- refs no código ----
const codeTables = new Set<string>()
const walk = (url: URL) => {
  for (const e of readdirSync(url, { withFileTypes: true })) {
    const child = new URL(e.name + (e.isDirectory() ? '/' : ''), url)
    if (e.isDirectory()) {
      walk(child)
    } else if (e.name.endsWith('.ts')) {
      const text = readFileSync(child, 'utf8')
      for (const m of text.matchAll(/\.from\(\s*A\(\s*['"`](\w+)['"`]\s*\)/g))
        codeTables.add(`az104_${m[1]}`)
      for (const m of text.matchAll(/\.from\(\s*['"`](az104_\w+)['"`]/g))
        codeTables.add(m[1])
    }
  }
}
walk(SRC_DIR)

// ---- checks ----
let errors = 0
const fail = (msg: string) => {
  errors++
  console.error(`ERRO: ${msg}`)
}

for (const t of codeTables) {
  if (!SPECS[t]) fail(`tabela ${t} usada no código sem spec no validador`)
  else if (!sqlTables.has(t))
    fail(`tabela ${t} usada no código e ausente no SQL`)
}

for (const [table, spec] of Object.entries(SPECS)) {
  const cols = sqlTables.get(table)
  if (!cols) {
    fail(`tabela ${table} com spec e ausente no SQL`)
    continue
  }
  if (spec.blob || !spec.schema) continue
  const skip = new Set(spec.skip ?? [])
  for (const key of shapeKeys(spec.schema)) {
    if (skip.has(key)) continue
    const col = spec.rename?.[key] ?? camelToSnake(key)
    if (!cols.has(col))
      fail(
        `${table}: coluna ausente no SQL p/ chave Zod '${key}' (esperava '${col}')`,
      )
  }
}

if (errors > 0) {
  console.error(`migration-types: ${errors} erro(s)`)
  process.exit(1)
}
console.log(
  `migration-types: OK (${Object.keys(SPECS).length} tabelas, ${codeTables.size} refs no código)`,
)
