import { SCORING_MODEL_VERSION } from '../engine/ScoringEngine.js'
import { logger } from '../utils/logger.js'
import {
  activityKey,
  doubtKey,
  loadActivityForUser,
  loadAllSuggestions,
  loadAttemptsForUser,
  loadDoubtsForUser,
  loadProgressForUser,
  loadSession,
  progressKey,
  saveActivity,
  saveAttempt,
  saveDoubt,
  saveProgress,
  saveSession,
  saveSuggestion,
} from './IndexedDB.js'
import { isSyncEnabled, supabase } from './supabase.js'
import {
  type ActivityRecord,
  type AttemptRecord,
  type DoubtRecord,
  ProfileRowSchema,
  type ProgressRecord,
  SCORING_MODEL_LEGACY,
  type SessionRecord,
} from './types.js'

// Sync L2: IDB é fonte de leitura (offline-first). Supabase é espelho.
// Conflito: updatedAt maior vence; box de Leitner usa max() (nunca regride).
export async function pushProgress(userId: string) {
  if (!isSyncEnabled() || !supabase) return { pushed: 0 }
  const local = await loadProgressForUser(userId)
  if (local.length === 0) return { pushed: 0 }
  const rows = local.map((p) => ({
    user_id: userId,
    question_id: p.questionId,
    box: p.box,
    due_at: p.dueAt,
    usage_count: p.usageCount,
    last_seen_at: p.lastSeenAt,
    updated_at: p.lastSeenAt,
  }))
  const { error } = await supabase.from('az104_progress').upsert(rows, {
    onConflict: 'user_id,question_id',
  })
  if (error) throw new Error(`push progress: ${error.message}`)
  return { pushed: rows.length }
}

export async function pullProgress(userId: string) {
  if (!isSyncEnabled() || !supabase) return { pulled: 0 }
  const { data, error } = await supabase
    .from('az104_progress')
    .select('*')
    .eq('user_id', userId)
  if (error) throw new Error(`pull progress: ${error.message}`)
  const local = new Map(
    (await loadProgressForUser(userId)).map((p) => [p.questionId, p]),
  )
  let pulled = 0
  for (const r of data ?? []) {
    const cur = local.get(r.question_id)
    const record: ProgressRecord = {
      userId,
      key: progressKey(userId, r.question_id),
      questionId: r.question_id,
      box: Math.max(r.box, cur?.box ?? 0),
      dueAt: r.due_at,
      usageCount: Math.max(r.usage_count, cur?.usageCount ?? 0),
      lastSeenAt: Math.max(r.last_seen_at, cur?.lastSeenAt ?? 0),
    }
    if (!cur || r.updated_at >= (cur.lastSeenAt ?? 0)) {
      await saveProgress(record)
      pulled++
    } else if (record.box !== cur.box || record.usageCount !== cur.usageCount) {
      await saveProgress({ ...cur, ...record })
      pulled++
    }
  }
  return { pulled }
}

export async function pushSession(userId: string, simuladoId: string) {
  if (!isSyncEnabled() || !supabase) return
  const s = await loadSession(simuladoId)
  if (!s) return
  const { error } = await supabase.from('az104_sessions').upsert(
    {
      user_id: userId,
      simulado_id: simuladoId,
      state_json: {
        state: s.state,
        index: s.index,
        answers: s.answers,
        flagged: s.flagged,
        timerRemaining: s.timerRemaining,
      },
      updated_at: s.updatedAt,
    },
    { onConflict: 'user_id,simulado_id' },
  )
  if (error) throw new Error(`push session: ${error.message}`)
}

export async function pullSession(
  userId: string,
  simuladoId: string,
): Promise<SessionRecord | null> {
  if (!isSyncEnabled() || !supabase) return null
  const { data, error } = await supabase
    .from('az104_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('simulado_id', simuladoId)
    .maybeSingle()
  if (error) throw new Error(`pull session: ${error.message}`)
  if (!data) return null
  const st = data.state_json as SessionRecord & { timerRemaining: number }
  return {
    id: simuladoId,
    state: String(st.state),
    index: Number(st.index),
    answers: (st.answers ?? []) as [string, string[]][],
    flagged: (st.flagged ?? []) as string[],
    timerRemaining: Number(st.timerRemaining ?? 0),
    updatedAt: Number(data.updated_at ?? 0),
  }
}

// Sincronização completa: pull (remoto→local com merge) depois push (local→remoto).
export async function syncNow(userId: string, simuladoId?: string) {
  if (!isSyncEnabled()) return { enabled: false as const }
  const { pulled: pulledCount } = await syncNowPlatform(userId)
  await pullProgress(userId)
  if (simuladoId) {
    const remote = await pullSession(userId, simuladoId)
    const local = await loadSession(simuladoId)
    if (remote && (!local || remote.updatedAt > local.updatedAt)) {
      await saveSession(remote)
    }
  }
  await pushProgress(userId)
  const pushed = await pushPlatform(userId)
  if (simuladoId) await pushSession(userId, simuladoId)
  return {
    enabled: true as const,
    pulled: pulledCount,
    pushFailed: pushed.failed,
  }
}

// ---------------------------------------------------------------------------
// v7.0 P2 — plataforma por usuário. Regra de conflito:
//   attempts/suggestions: append-only, merge por id (imutáveis).
//   doubts: latest updatedAt vence.
//   activity: chave (date,kind), latest createdAt vence.
// ---------------------------------------------------------------------------

const A = (t: string) => `az104_${t}`

const BATCH_SIZE = 100
type SyncRow = Record<string, unknown>

async function upsertInChunks(
  client: NonNullable<typeof supabase>,
  table: string,
  rows: SyncRow[],
  onConflict: string,
): Promise<{ pushed: number; failed: string[] }> {
  if (rows.length === 0) return { pushed: 0, failed: [] }
  const chunks: SyncRow[][] = []
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    chunks.push(rows.slice(start, start + BATCH_SIZE))
  }
  const outcomes = await Promise.all(
    chunks.map(async (chunk) => {
      const { error } = await client
        .from(A(table))
        .upsert(chunk, { onConflict })
      if (error) {
        return {
          pushed: 0,
          failed: [`${table}: ${error.message}`],
        }
      }
      return { pushed: chunk.length, failed: [] as string[] }
    }),
  )
  return {
    pushed: outcomes.reduce((total, outcome) => total + outcome.pushed, 0),
    failed: outcomes.flatMap((outcome) => outcome.failed),
  }
}

export async function pushPlatform(userId: string) {
  if (!isSyncEnabled() || !supabase) return { pushed: 0, failed: 0 }
  const started = Date.now()

  const attempts = await loadAttemptsForUser(userId)
  const attemptRows = attempts.map((a) => ({
    id: a.id,
    user_id: userId,
    kind: a.kind,
    simulado_id: a.simuladoId,
    started_at: a.startedAt,
    finished_at: a.finishedAt,
    duration_seconds: a.durationSeconds,
    questions: a.questions,
    score: a.score,
    passed: a.passed,
    answers: a.answers,
    by_domain: a.byDomain,
    error_tags: a.errorTags,
    // Gate 1.4: a nota persistida declara de qual modelo veio. Sem isto,
    // uma média somaria crédito parcial com 1-ponto-por-item.
    scoring_model_version: a.scoringModelVersion ?? SCORING_MODEL_VERSION,
  }))
  const attemptResult = await upsertInChunks(
    supabase,
    'attempts',
    attemptRows,
    'id',
  )

  const doubts = await loadDoubtsForUser(userId)
  const doubtRows = doubts.map((d) => ({
    user_id: userId,
    question_id: d.questionId,
    note: d.note,
    tag: d.tag,
    resolved: d.resolved,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    resolved_at: d.resolved ? d.updatedAt : null,
  }))
  const doubtResult = await upsertInChunks(
    supabase,
    'doubts',
    doubtRows,
    'user_id,question_id',
  )

  const activity = await loadActivityForUser(userId)
  const activityRows = activity.map((act) => ({
    user_id: userId,
    activity_date: act.date,
    kind: act.kind,
    created_at: act.createdAt,
  }))
  const activityResult = await upsertInChunks(
    supabase,
    'activity_log',
    activityRows,
    'user_id,activity_date,kind',
  )

  const suggestions = await loadAllSuggestions()
  const suggestionRows = suggestions
    .filter((s) => s.userId === userId)
    .map((s) => ({
      id: s.id,
      user_id: userId,
      generated_at: s.generatedAt,
      payload: s.payload,
    }))
  const suggestionResult = await upsertInChunks(
    supabase,
    'study_suggestions',
    suggestionRows,
    'id',
  )

  const results = [attemptResult, doubtResult, activityResult, suggestionResult]
  const pushed = results.reduce((total, result) => total + result.pushed, 0)
  const failed = results.flatMap((result) => result.failed)
  if (failed.length > 0) {
    logger.warn(
      'sync',
      `pushPlatform: ${failed.length} falha(s)`,
      failed.slice(0, 5),
    )
  }
  return { pushed, failed: failed.length, ms: Date.now() - started }
}

export async function pullPlatform(userId: string) {
  if (!isSyncEnabled() || !supabase) return { pulled: 0 }
  let pulled = 0

  const { data: attempts, error: ea } = await supabase
    .from(A('attempts'))
    .select('*')
    .eq('user_id', userId)
  if (ea) throw new Error(`pull attempts: ${ea.message}`)
  const localAtt = new Map(
    (await loadAttemptsForUser(userId)).map((a) => [a.id, a]),
  )
  for (const r of attempts ?? []) {
    if (localAtt.has(r.id)) continue
    await saveAttempt(mapAttempt(r))
    pulled++
  }

  const { data: doubts, error: ed } = await supabase
    .from(A('doubts'))
    .select('*')
    .eq('user_id', userId)
  if (ed) throw new Error(`pull doubts: ${ed.message}`)
  const localDoubts = new Map(
    (await loadDoubtsForUser(userId)).map((d) => [d.questionId, d]),
  )
  for (const r of doubts ?? []) {
    const cur = localDoubts.get(r.question_id)
    const rec: DoubtRecord = {
      userId,
      key: doubtKey(userId, r.question_id),
      questionId: r.question_id,
      note: String(r.note ?? ''),
      tag: r.tag ?? null,
      resolved: Boolean(r.resolved),
      createdAt: Number(r.created_at ?? 0),
      updatedAt: Number(r.updated_at ?? 0),
    }
    if (!cur || r.updated_at >= cur.updatedAt) {
      await saveDoubt(rec)
      pulled++
    }
  }

  const { data: activity, error: eAct } = await supabase
    .from(A('activity_log'))
    .select('*')
    .eq('user_id', userId)
  if (eAct) throw new Error(`pull activity: ${eAct.message}`)
  const localAct = new Map(
    (await loadActivityForUser(userId)).map((x) => [`${x.date}:${x.kind}`, x]),
  )
  for (const r of activity ?? []) {
    const key = `${r.activity_date}:${r.kind}`
    const cur = localAct.get(key)
    const rec: ActivityRecord = {
      userId,
      key: activityKey(userId, r.activity_date, r.kind),
      date: r.activity_date,
      kind: r.kind,
      createdAt: Number(r.created_at ?? 0),
    }
    if (!cur || r.created_at >= cur.createdAt) {
      await saveActivity(rec)
      pulled++
    }
  }

  const { data: suggestions, error: es } = await supabase
    .from(A('study_suggestions'))
    .select('*')
    .eq('user_id', userId)
  if (es) throw new Error(`pull suggestions: ${es.message}`)
  const localSug = new Map((await loadAllSuggestions()).map((s) => [s.id, s]))
  for (const r of suggestions ?? []) {
    if (localSug.has(r.id)) continue
    await saveSuggestion({
      id: r.id,
      userId: r.user_id,
      generatedAt: Number(r.generated_at ?? 0),
      payload: r.payload,
    })
    pulled++
  }

  return { pulled }
}

export async function syncNowPlatform(userId: string) {
  if (!isSyncEnabled()) return { enabled: false as const, pulled: 0 }
  const { pulled } = await pullPlatform(userId)
  return { enabled: true as const, pulled }
}

function mapAttempt(r: Record<string, unknown>): AttemptRecord {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    kind: (r.kind === 'seed' ? 'seed' : 'simulado') as AttemptRecord['kind'],
    simuladoId: String(r.simulado_id ?? ''),
    startedAt: Number(r.started_at ?? 0),
    finishedAt: Number(r.finished_at ?? 0),
    durationSeconds: Number(r.duration_seconds ?? 0),
    questions: Number(r.questions ?? 0),
    score: Number(r.score ?? 0),
    passed: Boolean(r.passed),
    answers: (r.answers ?? []) as AttemptRecord['answers'],
    byDomain: (r.by_domain ?? {}) as AttemptRecord['byDomain'],
    errorTags: (r.error_tags ?? {}) as AttemptRecord['errorTags'],
    // Gate 1.4: coluna ausente (migration 005 ainda não aplicada) = 1, que é o
    // que toda linha anterior à migração usou de fato.
    scoringModelVersion:
      r.scoring_model_version == null
        ? SCORING_MODEL_LEGACY
        : Number(r.scoring_model_version),
    createdAt: Number(r.created_at ?? 0),
  }
}

export async function getProfileRole(
  userId: string,
): Promise<'admin' | 'user'> {
  if (!isSyncEnabled() || !supabase) return 'user'
  const { data, error } = await supabase
    .from(A('profiles'))
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    logger.warn('sync', 'leitura de role falhou', { message: error.message })
    return 'user'
  }
  if (!data) {
    logger.info('sync', 'perfil ausente no Supabase; role=user')
    return 'user'
  }
  const role = data.role === 'admin' ? 'admin' : 'user'
  logger.info('sync', 'role lido', { role })
  return role
}

export async function upsertOwnProfile(userId: string, email: string) {
  if (!isSyncEnabled() || !supabase) return
  const row = ProfileRowSchema.parse({ user_id: userId, email })
  const { error } = await supabase.from(A('profiles')).upsert(
    {
      user_id: row.user_id,
      email: row.email,
      // role NÃO é tocado aqui (só admin/owner promovem) — upsert preserva.
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(`upsert profile: ${error.message}`)
}
