import { describe, expect, it } from 'vitest'
import { getDue, gradeCard } from '../../src/engine/LeitnerEngine.js'
import { QuizEngine } from '../../src/engine/QuizEngine.js'
import type { Question } from '../../src/engine/question-schema.js'
import { TimerEngine } from '../../src/engine/TimerEngine.js'

const base: Question = {
  id: 'az104-ig-001',
  domain: 'identidade-governanca',
  subdomain: 'entra-id',
  type: 'single',
  difficulty: 'medium',
  question: 'Questão de teste com mais de cinquenta caracteres para valer.',
  options: [
    { letter: 'A', text: 'a' },
    { letter: 'B', text: 'b' },
    { letter: 'C', text: 'c' },
    { letter: 'D', text: 'd' },
  ],
  correct: ['A'],
  explanation:
    'Explicação de teste com mais de cem caracteres para satisfazer o mínimo exigido pelo schema.',
  source: 'original',
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
}

describe('QuizEngine', () => {
  it('ciclo idle→loading→active→reviewing→completed + flags + snapshot/restore', () => {
    const e = new QuizEngine()
    expect(e.state).toBe('idle')
    e.load([base, { ...base, id: 'az104-ig-002' }])
    expect(e.state).toBe('active')
    e.answer('az104-ig-001', ['A'])
    e.toggleFlag('az104-ig-002')
    expect(e.unansweredCount()).toBe(1)
    e.next()
    expect(e.index).toBe(1)
    const snap = e.snapshot()
    const e2 = new QuizEngine()
    e2.load([base, { ...base, id: 'az104-ig-002' }])
    e2.restore(snap)
    expect(e2.answers.get('az104-ig-001')).toEqual(['A'])
    expect(e2.flagged.has('az104-ig-002')).toBe(true)
    e2.pause()
    expect(e2.state).toBe('paused')
    e2.resume()
    e2.submit()
    expect(e2.state).toBe('reviewing')
    e2.finish()
    expect(e2.state).toBe('completed')
  })
})

describe('TimerEngine', () => {
  it('100min, avisos 30/15/5/1 e expiração', () => {
    const t = new TimerEngine(100)
    t.start()
    expect(t.tick(70 * 60)).toEqual([30])
    expect(t.tick(15 * 60)).toEqual([15])
    expect(t.tick(10 * 60)).toEqual([5])
    expect(t.tick(4 * 60)).toEqual([1])
    expect(t.expired).toBe(false)
    t.tick(60)
    expect(t.expired).toBe(true)
  })
})

describe('LeitnerEngine', () => {
  it('acerto sobe caixa, erro volta a 0; getDue ordena caixa 1 e capa em 50', () => {
    const now = 1_000_000
    const up = gradeCard({ questionId: 'a', box: 0, dueAt: 0 }, true, now)
    expect(up.box).toBe(1)
    const down = gradeCard({ questionId: 'a', box: 3, dueAt: 0 }, false, now)
    expect(down.box).toBe(0)
    const cards = Array.from({ length: 60 }, (_, i) => ({
      questionId: `${i}`,
      box: 0,
      dueAt: 0,
    }))
    const { due, truncated } = getDue(cards, now)
    expect(due).toHaveLength(50)
    expect(truncated).toBe(true)
  })
})
