import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Estes testes exercitam update/insert que falham; o logger.warn esperado
// escrevia em stderr e enterrava o relatório do vitest.
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

afterAll(() => {
  vi.restoreAllMocks()
})

const h = vi.hoisted(() => ({
  updates: [] as {
    table: string
    payload: Record<string, unknown>
    eq: string
  }[],
  inserts: [] as { table: string; payload: Record<string, unknown> }[],
  updateError: null as { message: string } | null,
  insertError: null as { message: string } | null,
}))

vi.mock('../../src/sync/supabase.js', () => ({
  isSyncEnabled: () => true,
  supabase: {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => ({
        eq: async (col: string, val: string) => {
          h.updates.push({ table, payload, eq: `${col}=${val}` })
          return { error: h.updateError }
        },
      }),
      insert: async (payload: Record<string, unknown>) => {
        h.inserts.push({ table, payload })
        return { error: h.insertError }
      },
    }),
  },
}))

import {
  adminLogRow,
  changeUserRole,
  recordAdminLog,
} from '../../src/sync/admin.js'

const ACTOR = '11111111-1111-1111-1111-111111111111'
const TARGET = '22222222-2222-2222-2222-222222222222'

describe('admin: auditoria de acoes administrativas', () => {
  beforeEach(() => {
    h.updates.length = 0
    h.inserts.length = 0
    h.updateError = null
    h.insertError = null
  })

  it('adminLogRow monta a linha no formato de az104_admin_logs', () => {
    expect(
      adminLogRow(ACTOR, 'role.change', 'profile', TARGET, { role: 'admin' }),
    ).toEqual({
      actor_id: ACTOR,
      action: 'role.change',
      target_type: 'profile',
      target_id: TARGET,
      meta: { role: 'admin' },
    })
  })

  it('recordAdminLog insere em az104_admin_logs e devolve true', async () => {
    const ok = await recordAdminLog(
      adminLogRow(ACTOR, 'role.change', 'profile', TARGET, { role: 'admin' }),
    )
    expect(ok).toBe(true)
    expect(h.inserts).toHaveLength(1)
    expect(h.inserts[0].table).toBe('az104_admin_logs')
  })

  it('recordAdminLog nunca lança quando o insert falha', async () => {
    h.insertError = { message: 'permissao negada' }
    const ok = await recordAdminLog(
      adminLogRow(ACTOR, 'role.change', 'profile', TARGET, { role: 'admin' }),
    )
    expect(ok).toBe(false)
  })

  it('changeUserRole altera a role E registra a auditoria', async () => {
    const r = await changeUserRole(ACTOR, TARGET, 'admin')
    expect(r.ok).toBe(true)
    expect(r.audited).toBe(true)
    expect(h.updates).toEqual([
      {
        table: 'az104_profiles',
        payload: { role: 'admin' },
        eq: `user_id=${TARGET}`,
      },
    ])
    expect(h.inserts).toHaveLength(1)
    expect(h.inserts[0].payload).toMatchObject({
      actor_id: ACTOR,
      action: 'role.change',
      target_type: 'profile',
      target_id: TARGET,
      meta: { role: 'admin' },
    })
  })

  it('changeUserRole nao audita quando o update falha', async () => {
    h.updateError = { message: 'sem permissao' }
    const r = await changeUserRole(ACTOR, TARGET, 'user')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('sem permissao')
    expect(h.inserts).toHaveLength(0)
  })

  it('changeUserRole mantem a role alterada quando a auditoria falha (UI nao quebra)', async () => {
    h.insertError = { message: 'auditoria indisponivel' }
    const r = await changeUserRole(ACTOR, TARGET, 'user')
    expect(r.ok).toBe(true)
    expect(r.audited).toBe(false)
    expect(h.updates).toHaveLength(1)
  })
})
