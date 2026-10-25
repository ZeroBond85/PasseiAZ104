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
  // Trava client-side: não rebaixa a si mesmo.
  if (actorId === userId && role === 'user') {
    return {
      ok: false,
      audited: false,
      error: 'Não é possível rebaixar a si mesmo',
    }
  }
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
    const msg = error.message.includes('self_demotion')
      ? 'Não é possível rebaixar a si mesmo'
      : error.message.includes('last_admin')
        ? 'Não é possível rebaixar o último administrador'
        : `Falha ao alterar role: ${error.message}`
    return { ok: false, audited: false, error: msg }
  }
  // O log é gravado pelo trigger AFTER UPDATE (atômico, inescapável).
  return { ok: true, audited: true }
}
