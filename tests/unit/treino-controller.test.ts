import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  pool: [] as { id: string; domain: string }[],
}))

vi.mock('../../src/data/QuestionLoader.js', () => ({
  ensureSeeded: vi.fn().mockResolvedValue(undefined),
  getQuestionPool: vi.fn().mockImplementation(() => Promise.resolve(h.pool)),
}))

import { TreinoController } from '../../src/controllers/treino-controller.js'

const q = (id: string, domain: string) => ({
  id,
  domain,
  subdomain: 'x',
  type: 'single',
  difficulty: 'easy',
  question: 'Questao de teste com mais de cinquenta caracteres para valer.',
  options: [
    { letter: 'A', text: 'a' },
    { letter: 'B', text: 'b' },
    { letter: 'C', text: 'c' },
    { letter: 'D', text: 'd' },
  ],
  correct: ['A'],
  explanation:
    'Explicacao de teste deliberadamente longa para passar do minimo de cem caracteres.',
  source: 'original',
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
})

describe('TreinoController shuffle (Fisher-Yates, nao enviesado)', () => {
  beforeEach(() => {
    h.pool = []
  })

  it('seleciona 20 questoes sem duplicata quando pool >= 20', async () => {
    h.pool = Array.from({ length: 50 }, (_, i) =>
      q(`az104-co-${String(i + 1).padStart(3, '0')}`, 'compute'),
    )
    const ctrl = new TreinoController()
    await ctrl.start('compute')
    expect(ctrl.quiz.length).toBe(20)
    const ids = ctrl.quiz.map((q) => q.id)
    expect(new Set(ids).size).toBe(20)
  })

  it('retorna pool completo (sem duplicata) quando pool < 20', async () => {
    h.pool = Array.from({ length: 12 }, (_, i) =>
      q(`az104-st-${String(i + 1).padStart(3, '0')}`, 'storage'),
    )
    const ctrl = new TreinoController()
    await ctrl.start('storage')
    expect(ctrl.quiz.length).toBe(12)
    const ids = ctrl.quiz.map((q) => q.id)
    expect(new Set(ids).size).toBe(12)
  })

  it('todas as questoes selecionadas pertencem ao pool original', async () => {
    h.pool = Array.from({ length: 30 }, (_, i) =>
      q(`az104-rv-${String(i + 1).padStart(3, '0')}`, 'rede-virtual'),
    )
    const ctrl = new TreinoController()
    await ctrl.start('rede-virtual')
    const originalIds = new Set(h.pool.map((q) => q.id))
    for (const q of ctrl.quiz) expect(originalIds.has(q.id)).toBe(true)
  })

  it('startCustom preserva o pool passado (sem shuffle extra)', async () => {
    h.pool = [q('az104-ig-001', 'identidade-governanca')]
    const ctrl = new TreinoController()
    const ok = await ctrl.startCustom(h.pool, 'ig')
    expect(ok).toBe(true)
    expect(ctrl.quiz).toHaveLength(1)
    expect(ctrl.quiz[0].id).toBe('az104-ig-001')
  })
})
