import { describe, expect, it } from 'vitest'
import { PROPORTIONS, SIMULADOS } from '../../src/data/simulados.js'
import { domainQuotas, pickByIds } from '../../src/engine/QuestionSelector.js'

describe('Catálogo de simulados (A1 §4)', () => {
  it('10 simulados oficiais, cada um 50 ids únicos', () => {
    expect(SIMULADOS).toHaveLength(10)
    for (const s of SIMULADOS) {
      if (s.mode !== 'fixed') continue
      expect(s.questionIds).toHaveLength(50)
      expect(new Set(s.questionIds).size).toBe(50)
    }
  })

  it('distribuição oficial ig12 st9 co12 rv10 mo7 via domainQuotas(50)', () => {
    const quotas = domainQuotas(50, PROPORTIONS)
    expect(quotas).toEqual({
      'identidade-governanca': 12,
      storage: 9,
      compute: 12,
      'rede-virtual': 10,
      monitoramento: 7,
    })
  })

  it('pickByIds preserva a ordem do array de ids', () => {
    const pool = [
      { id: 'az104-co-002' },
      { id: 'az104-co-001' },
      { id: 'az104-ig-007' },
    ] as { id: string }[]
    const out = pickByIds(pool as never, [
      'az104-ig-007',
      'az104-co-002',
      'az104-co-001',
    ])
    expect(out.map((q) => q.id)).toEqual([
      'az104-ig-007',
      'az104-co-002',
      'az104-co-001',
    ])
  })

  it('pickByIds ignora ids ausentes sem quebrar', () => {
    const pool = [{ id: 'az104-co-001' }] as { id: string }[]
    const out = pickByIds(pool as never, [
      'az104-co-001',
      'az104-mo-999',
      'az104-ig-000',
    ])
    expect(out).toHaveLength(1)
  })
})
