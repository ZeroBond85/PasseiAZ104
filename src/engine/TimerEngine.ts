// TimerEngine §5 — expõe remaining; quem GRAVA é o QuizEngine (writer único).
export const WARNINGS = [30, 15, 5, 1] as const // minutos restantes

export class TimerEngine {
  totalSeconds: number
  remaining: number
  running = false
  private fired = new Set<number>()

  constructor(totalMinutes = 100) {
    this.totalSeconds = totalMinutes * 60
    this.remaining = this.totalSeconds
  }

  start() {
    this.running = true
  }

  pause() {
    this.running = false
  }

  tick(seconds = 1): number[] {
    if (!this.running) return []
    this.remaining = Math.max(0, this.remaining - seconds)
    if (this.remaining === 0) this.running = false
    const minutesLeft = Math.ceil(this.remaining / 60)
    const hit: number[] = []
    for (const w of WARNINGS) {
      if (minutesLeft === w && !this.fired.has(w)) {
        this.fired.add(w)
        hit.push(w)
      }
    }
    return hit
  }

  get expired() {
    return this.remaining <= 0
  }
}
