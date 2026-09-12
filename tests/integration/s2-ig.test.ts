import { describe, expect, it } from 'vitest'
import questions from '../../data/identidade-governanca.json'
import { QuizEngine } from '../../src/engine/QuizEngine.js'
import { validateQuestion } from '../../src/engine/question-schema.js'
import { scoreSession } from '../../src/engine/ScoringEngine.js'

// Gate S2: 50q fim-a-fim + score §5.3 + review + validate (banco cresce em S8+; usa as 50 primeiras).
describe('S2 fim-a-fim (Identidade, 50q)', () => {
  const FIFTY = (
    questions as unknown as { id: string; correct: string[] }[]
  ).slice(0, 50)
  it('banco válido, quiz completo, score máximo, review total', () => {
    expect(questions.length).toBeGreaterThanOrEqual(50)
    for (const q of questions) {
      expect(validateQuestion(q).success).toBe(true)
    }

    const engine = new QuizEngine()
    engine.load(FIFTY as never)
    expect(engine.state).toBe('active')

    // Responde tudo corretamente, marca 2 para revisão
    for (const q of FIFTY) {
      engine.answer(q.id, q.correct)
    }
    engine.toggleFlag(FIFTY[0].id)
    engine.toggleFlag(FIFTY[49].id)
    expect(engine.unansweredCount()).toBe(0)
    expect(engine.flagged.size).toBe(2)

    const answers = new Map(FIFTY.map((q) => [q.id, q.correct]))
    const result = scoreSession(FIFTY as never, answers)
    expect(result.score).toBe(1000)
    expect(result.passed).toBe(true)

    engine.submit()
    expect(engine.state).toBe('reviewing')
    engine.finish()
    expect(engine.state).toBe('completed')
  })
})
