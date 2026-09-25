import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TreinoController } from '../../src/controllers/treino-controller.js'
import { ensureSeeded, getQuestionPool } from '../../src/data/QuestionLoader.js'
import type { Question } from '../../src/engine/question-schema.js'

vi.mock('../../src/data/QuestionLoader.js', () => ({
  ensureSeeded: vi.fn(),
  getBankLine: vi.fn(),
  getBankMeta: vi.fn(),
  getQuestionPool: vi.fn(),
}))

const q = (id: string, domain: string, correct: string[] = ['A']): Question =>
  ({
    id,
    domain,
    subdomain: 'testes',
    type: 'single',
    difficulty: 'medium',
    question: 'Questão de teste com mais de cinquenta caracteres para valer.',
    options: [
      { letter: 'A', text: 'a' },
      { letter: 'B', text: 'b' },
      { letter: 'C', text: 'c' },
      { letter: 'D', text: 'd' },
    ],
    correct,
    explanation:
      'Explicação de teste deliberadamente longa para passar do mínimo de cem caracteres.',
    source: 'original',
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
  }) as Question

// RPR (LESSONS 2026-09-25): startTreino() criava QuizEngine sem load() —
// state `idle` fazia answer() descartar tudo e o placar era sempre 0/N.
describe('TreinoController', () => {
  beforeEach(() => {
    vi.mocked(getQuestionPool).mockResolvedValue([
      q('az104-co-001', 'compute'),
      q('az104-co-002', 'compute'),
      q('az104-ig-001', 'identidade-governanca'),
    ])
  })

  it('start ativa o engine e filtra por domínio', async () => {
    const t = new TreinoController()
    expect(await t.start('compute')).toBe(true)
    // Garante o seed antes de ler o pool (botão morto em perfil zerado se não)
    expect(ensureSeeded).toHaveBeenCalled()
    expect(t.quiz.map((x) => x.id).sort()).toEqual([
      'az104-co-001',
      'az104-co-002',
    ])
    expect(t.engine.state).toBe('active')
    expect(t.paused).toBe(false)
  })

  it('start em domínio vazio retorna false', async () => {
    const t = new TreinoController()
    expect(await t.start('inexistente')).toBe(false)
    expect(t.quiz).toEqual([])
  })

  it('resposta registra e finish pontua (não mais 0 fixo)', async () => {
    const t = new TreinoController()
    await t.start('compute')
    // Ordem embaralhada: localiza por id (co-001 correta, co-002 errada)
    t.current = t.quiz.findIndex((x) => x.id === 'az104-co-001')
    t.answer(['A'])
    expect(t.answerOf('az104-co-001')).toEqual(['A'])
    t.current = t.quiz.findIndex((x) => x.id === 'az104-co-002')
    t.answer(['B'])
    const r = t.finish()
    expect(r).toEqual({ correct: 1, total: 2, pct: 50 })
  })

  it('pausa bloqueia answer/flag/finish; resume libera', async () => {
    const t = new TreinoController()
    await t.start('compute')
    const id = t.quiz[0].id
    t.pause()
    expect(t.paused).toBe(true)
    t.answer(['A'])
    expect(t.answerOf(id)).toEqual([])
    t.toggleFlag()
    expect(t.isFlagged(id)).toBe(false)
    expect(t.finish()).toBeNull()
    t.resume()
    t.answer(['A'])
    expect(t.answerOf(id)).toEqual(['A'])
  })

  it('exit limpa tudo', async () => {
    const t = new TreinoController()
    await t.start('compute')
    t.exit()
    expect(t.domain).toBeNull()
    expect(t.quiz).toEqual([])
    expect(t.current).toBe(0)
    expect(t.paused).toBe(false)
  })
})
