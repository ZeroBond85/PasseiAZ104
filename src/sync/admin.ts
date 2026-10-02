import { logger } from '../utils/logger.js'
import { supabase } from './supabase.js'

// Acoes administrativas auditadas em `az104_admin_logs` (migration 002).
// A tabela tem RLS `for all` com `az104_is_admin()`, entao admin logado insere
// sem migration. Regra: **falha de auditoria nunca desfaz nem bloqueia a acao**
// (a role ja foi alterada) — mas precisa ficar no buffer de log (suporte).

export interface AdminLogRow {
  actor_id: string
  action: string
  target_type: string
  target_id: string
  meta: Record<string, unknown>
}

export function adminLogRow(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {},
): AdminLogRow {
  return {
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    meta,
  }
}

export async function recordAdminLog(row: AdminLogRow): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('az104_admin_logs').insert(row)
  if (error) {
    logger.warn('sync', 'auditoria admin falhou', {
      action: row.action,
      target: row.target_id,
      message: error.message,
    })
    return false
  }
  return true
}

export async function changeUserRole(
  actorId: string,
  userId: string,
  role: 'admin' | 'user',
): Promise<{ ok: boolean; audited: boolean; error?: string }> {
  if (!supabase)
    return { ok: false, audited: false, error: 'Sincronizacao desativada' }
  const { error } = await supabase
    .from('az104_profiles')
    .update({ role })
    .eq('user_id', userId)
  if (error) {
    logger.warn('sync', 'changeUserRole falhou', {
      target: userId,
      role,
      message: error.message,
    })
    return {
      ok: false,
      audited: false,
      error: `Falha ao alterar role: ${error.message}`,
    }
  }
  const audited = await recordAdminLog(
    adminLogRow(actorId, 'role.change', 'profile', userId, { role }),
  )
  return { ok: true, audited }
}
