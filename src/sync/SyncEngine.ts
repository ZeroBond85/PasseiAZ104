import {
  loadAllProgress,
  loadSession,
  saveProgress,
  saveSession,
} from './IndexedDB.js'
import { isSyncEnabled, supabase } from './supabase.js'
import type { ProgressRecord, SessionRecord } from './types.js'

// Sync L2: IDB é fonte de leitura (offline-first). Supabase é espelho.
// Conflito: updatedAt maior vence; box de Leitner usa max() (nunca regride).
export async function pushProgress(userId: string) {
  if (!isSyncEnabled() || !supabase) return { pushed: 0 }
  const local = await loadAllProgress()
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
  const local = new Map((await loadAllProgress()).map((p) => [p.questionId, p]))
  let pulled = 0
  for (const r of data ?? []) {
    const cur = local.get(r.question_id)
    const record: ProgressRecord = {
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
  const pulled = await pullProgress(userId)
  if (simuladoId) {
    const remote = await pullSession(userId, simuladoId)
    const local = await loadSession(simuladoId)
    if (remote && (!local || remote.updatedAt > local.updatedAt)) {
      await saveSession(remote)
    }
  }
  const pushed = await pushProgress(userId)
  if (simuladoId) await pushSession(userId, simuladoId)
  return { enabled: true as const, ...pulled, ...pushed }
}
