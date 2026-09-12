import type { Question } from './question-schema.js'

export type QuizState =
  | 'idle'
  | 'loading'
  | 'active'
  | 'paused'
  | 'reviewing'
  | 'completed'

export class QuizEngine {
  state: QuizState = 'idle'
  questions: Question[] = []
  answers = new Map<string, string[]>()
  flagged = new Set<string>()
  index = 0

  load(questions: Question[]) {
    this.state = 'loading'
    this.questions = questions
    this.answers = new Map()
    this.flagged = new Set()
    this.index = 0
    this.state = 'active'
  }

  answer(questionId: string, letters: string[]) {
    if (this.state !== 'active') return
    this.answers.set(questionId, [...letters])
  }

  toggleFlag(questionId: string) {
    if (this.flagged.has(questionId)) this.flagged.delete(questionId)
    else this.flagged.add(questionId)
  }

  go(i: number) {
    if (i >= 0 && i < this.questions.length) this.index = i
  }

  next() {
    this.go(this.index + 1)
  }

  prev() {
    this.go(this.index - 1)
  }

  pause() {
    if (this.state === 'active') this.state = 'paused'
  }

  resume() {
    if (this.state === 'paused') this.state = 'active'
  }

  unansweredCount() {
    return this.questions.filter((q) => !this.answers.has(q.id)).length
  }

  submit() {
    if (this.state === 'active' || this.state === 'paused')
      this.state = 'reviewing'
  }

  finish() {
    if (this.state === 'reviewing') this.state = 'completed'
  }

  snapshot() {
    return {
      state: this.state,
      index: this.index,
      answers: [...this.answers.entries()],
      flagged: [...this.flagged],
    }
  }

  restore(s: {
    state: QuizState
    index: number
    answers: [string, string[]][]
    flagged: string[]
  }) {
    this.state = s.state
    this.index = s.index
    this.answers = new Map(s.answers)
    this.flagged = new Set(s.flagged)
  }
}
