import { ensureSeeded, getQuestionPool } from '../data/QuestionLoader.js'
import { QuizEngine } from '../engine/QuizEngine.js'
import type { Question } from '../engine/question-schema.js'

export interface TreinoResult {
  correct: number
  total: number
  pct: number
}

// TreinoController (Sprint 3, PLAN-3): treino por domínio fora do app-shell.
// Classe pura: recebe `notify` (re-render); sem acesso ao DOM.
// FIX (achado na extração): o engine nunca recebia `load()` — ficava `idle` e
// `answer()` descartava tudo em silêncio, então o placar do treino era sempre 0.
// Agora `start()` ativa o engine; regressão travada em treino-controller.test.ts.
export class TreinoController {
  readonly engine = new QuizEngine()
  domain: string | null = null
  quiz: Question[] = []
  current = 0
  paused = false

  private notify: () => void

  constructor(notify: () => void = () => undefined) {
    this.notify = notify
  }

  get currentQuestion(): Question | undefined {
    return this.quiz[this.current]
  }

  answerOf(questionId: string): string[] {
    return this.engine.answers.get(questionId) ?? []
  }

  isFlagged(questionId: string): boolean {
    return this.engine.flagged.has(questionId)
  }

  async start(domain: string): Promise<boolean> {
    await ensureSeeded()
    const pool = await getQuestionPool()
    const candidates = pool.filter((q) => q.domain === domain)
    if (candidates.length === 0) return false
    const picked = [...candidates].sort(() => Math.random() - 0.5).slice(0, 20)
    this.domain = domain
    this.quiz = picked
    this.current = 0
    this.engine.load(picked)
    this.paused = false
    this.notify()
    return true
  }

  answer(letters: string[]) {
    if (this.paused) return
    const q = this.quiz[this.current]
    if (!q) return
    this.engine.answer(q.id, letters)
    this.notify()
  }

  toggleFlag() {
    if (this.paused) return
    const q = this.quiz[this.current]
    if (!q) return
    if (this.engine.flagged.has(q.id)) this.engine.flagged.delete(q.id)
    else this.engine.flagged.add(q.id)
    this.notify()
  }

  pause() {
    this.paused = true
    this.notify()
  }

  resume() {
    this.paused = false
    this.notify()
  }

  exit() {
    this.domain = null
    this.quiz = []
    this.current = 0
    this.paused = false
    this.notify()
  }

  /** Retorna o placar (o shell decide como exibir — Sprint 5 troca alert por modal). */
  finish(): TreinoResult | null {
    if (this.paused) return null
    const correct = this.quiz.filter((q) => {
      const given = this.engine.answers.get(q.id) ?? []
      const expected = new Set(q.correct)
      return (
        given.length === expected.size &&
        [...expected].every((l) => given.includes(l))
      )
    }).length
    const total = this.quiz.length
    const pct = total === 0 ? 0 : Math.round((correct / total) * 100)
    return { correct, total, pct }
  }
}
