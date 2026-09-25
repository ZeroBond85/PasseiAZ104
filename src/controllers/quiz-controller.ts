import { ensureSeeded, getQuestionPool } from '../data/QuestionLoader.js'
import { PROPORTIONS, SIMULADOS } from '../data/simulados.js'
import { toggleSelection } from '../engine/keyboard.js'
import { gradeCard } from '../engine/LeitnerEngine.js'
import {
  domainQuotas,
  pickByIds,
  selectQuestions,
} from '../engine/QuestionSelector.js'
import { QuizEngine } from '../engine/QuizEngine.js'
import type { Question, SimuladoSpec } from '../engine/question-schema.js'
import { type ScoreResult, scoreSession } from '../engine/ScoringEngine.js'
import { analyzeAttempt, type StudyGuideResult } from '../engine/StudyGuide.js'
import { TimerEngine } from '../engine/TimerEngine.js'
import {
  loadAllAttempts,
  loadAllProgress,
  loadDoubt,
  loadSession,
  markActivity,
  saveAttempt,
  saveDoubt,
  saveProgress,
  saveSession,
  saveSuggestion,
} from '../sync/IndexedDB.js'
import { pushPlatform, pushProgress, pushSession } from '../sync/SyncEngine.js'
import type {
  AttemptRecord,
  ErrorTag,
  StudyGuidePayload,
} from '../sync/types.js'
import { logger } from '../utils/logger.js'

// Sessão default: 1º simulado oficial (nav "Simulado" direto, sem catálogo).
const DEFAULT_SIM_ID = SIMULADOS[0]?.id ?? 'sim-oficial-01'

function localDate(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

// Falhas best-effort (IDB local) viram debug log em vez de silêncio.
type HushScope = 'sync' | 'quiz' | 'data'
const hush =
  (scope: HushScope, msg: string) =>
  (err: unknown): undefined => {
    logger.debug(scope, msg, err instanceof Error ? err.message : String(err))
    return undefined
  }
const hushArr =
  (scope: HushScope, msg: string) =>
  (err: unknown): never[] => {
    logger.debug(scope, msg, err instanceof Error ? err.message : String(err))
    return []
  }
const hushSync =
  (scope: HushScope, msg: string) =>
  (err: unknown): { pushed: number; failed: number } => {
    logger.debug(scope, msg, err instanceof Error ? err.message : String(err))
    return { pushed: 0, failed: 0 }
  }

function toPayload(g: StudyGuideResult): StudyGuidePayload {
  return {
    score: g.score,
    passed: g.passed,
    weakDomains: g.weakDomains,
    byType: g.byType,
    byDifficulty: g.byDifficulty,
    topErrors: g.topErrors.map((t) => ({
      questionId: t.question.id,
      domain: t.question.domain,
      subdomain: t.question.subdomain,
    })),
    tips: g.tips,
  }
}

// QuizController (Sprint 3, PLAN-3): todo o fluxo do simulado oficial fora do
// app-shell (que vira orquestrador fino: roteia, delega, renderiza).
// Classe pura: recebe `notify` (re-render) e `getUserId`; sem acesso ao DOM.
export class QuizController {
  readonly engine = new QuizEngine()
  timer = new TimerEngine(100)
  quiz: Question[] = []
  current = 0
  result: ScoreResult | null = null
  loading = false
  savedFlash = false
  lastGuide: StudyGuideResult | null = null
  simId = DEFAULT_SIM_ID

  private timerId = 0
  private persistId = 0
  private startedAt = 0
  private onFinishExpired: (() => void) | null = null
  private notify: () => void
  private getUserId: () => string | null

  constructor(
    notify: () => void = () => undefined,
    getUserId: () => string | null = () => null,
  ) {
    this.notify = notify
    this.getUserId = getUserId
  }

  get isActive() {
    return this.engine.state === 'active'
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

  unansweredCount(): number {
    return this.engine.unansweredCount()
  }

  answeredIndexes(): number[] {
    const idxById = new Map(this.quiz.map((x, i) => [x.id, i]))
    return [...this.engine.answers.keys()].map((id) => idxById.get(id) ?? -1)
  }

  flaggedIndexes(): number[] {
    const idxById = new Map(this.quiz.map((x, i) => [x.id, i]))
    return [...this.engine.flagged].map((id) => idxById.get(id) ?? -1)
  }

  /** Chamado pelo shell quando o timer expira (auto-submit sem modal). */
  onExpire(fn: (() => void) | null) {
    this.onFinishExpired = fn
  }

  async start(spec: SimuladoSpec): Promise<boolean> {
    this.loading = true
    this.notify()
    await ensureSeeded()
    const pool = (await getQuestionPool()) as Question[]
    const progress = await loadAllProgress().catch(
      hushArr('data', 'startQuiz: leitura de progresso falhou'),
    )
    const usage = new Map(progress.map((p) => [p.questionId, p.usageCount]))
    const picked =
      spec.mode === 'fixed'
        ? pickByIds(pool, spec.questionIds)
        : selectQuestions(pool, {
            seed: spec.seed,
            count: Math.min(spec.questionCount, pool.length),
            quotas: domainQuotas(
              Math.min(spec.questionCount, pool.length),
              PROPORTIONS,
            ),
            recentIds: new Set(),
            usageCount: usage,
          })
    this.simId = spec.id
    if (picked.length === 0) {
      this.loading = false
      logger.warn('quiz', 'startQuiz: nenhuma questão selecionável')
      this.notify()
      return false
    }

    // Restaura sessão anterior do MESMO sim (cada sim persiste separado)
    const saved = await loadSession(spec.id).catch(
      hush('data', 'startQuiz: restauração de sessão falhou'),
    )
    this.engine.load(picked)
    this.quiz = picked
    this.current = this.engine.index
    this.timer = new TimerEngine(spec.timeLimitMinutes)
    if (saved && saved.answers.length > 0) {
      this.engine.restore({
        state: saved.state as never,
        index: saved.index,
        answers: saved.answers,
        flagged: saved.flagged,
      })
      this.timer.remaining = saved.timerRemaining
      this.current = this.engine.index
    }
    this.timer.start()
    this.startedAt = Date.now()
    this.timerId = window.setInterval(() => {
      this.timer.tick(1)
      if (this.timer.expired && this.onFinishExpired) this.onFinishExpired()
      this.notify()
    }, 1000)
    this.persistId = window.setInterval(() => void this.persist(), 30000)
    this.loading = false
    logger.info('quiz', 'simulado iniciado', { id: spec.id })
    this.notify()
    return true
  }

  stopLoops() {
    clearInterval(this.timerId)
    clearInterval(this.persistId)
  }

  async persist() {
    const snap = this.engine.snapshot()
    await saveSession({
      id: this.simId,
      state: snap.state,
      index: snap.index,
      answers: snap.answers,
      flagged: snap.flagged,
      timerRemaining: this.timer.remaining,
      updatedAt: Date.now(),
    }).catch(hush('data', 'persist: saveSession falhou'))
    const userId = this.getUserId()
    if (userId) {
      await pushSession(userId, this.simId).catch(
        hush('sync', 'persist: pushSession falhou'),
      )
    }
    this.savedFlash = true
    this.notify()
    setTimeout(() => {
      this.savedFlash = false
      this.notify()
    }, 2000)
  }

  answer(letters: string[]) {
    const q = this.quiz[this.current]
    if (!q) return
    this.engine.answer(q.id, letters)
    this.notify()
  }

  toggleFlag() {
    const q = this.quiz[this.current]
    if (!q) return
    this.engine.toggleFlag(q.id)
    this.notify()
  }

  goTo(i: number) {
    this.current = Math.min(Math.max(i, 0), this.quiz.length - 1)
    this.notify()
  }

  step(d: number) {
    this.goTo(this.current + d)
  }

  handleKey(e: KeyboardEvent) {
    if (this.engine.state !== 'active') return
    const q = this.quiz[this.current]
    if (!q) return
    if (e.key === 'ArrowRight') this.step(1)
    else if (e.key === 'ArrowLeft') this.step(-1)
    else {
      const letter = keyToLetter(e.key)
      const opt = letter
        ? q.options.find((o) => o.letter === letter)
        : undefined
      if (opt) {
        const isMultiple = q.type === 'multiple'
        this.answer(
          toggleSelection(
            this.engine.answers.get(q.id) ?? [],
            opt.letter,
            isMultiple,
          ),
        )
      }
    }
  }

  /** Pós-confirmação do modal (o shell decide confirmar ou não). */
  async complete(): Promise<{ result: ScoreResult; syncFailed: number }> {
    this.stopLoops()
    this.engine.submit()
    const answers = new Map(this.engine.answers)
    this.result = scoreSession(this.quiz, answers)
    // Leitner: grava progresso (acerto = todas certas, sem erro)
    const now = Date.now()
    const prior = new Map(
      (
        await loadAllProgress().catch(
          hushArr(
            'data',
            'finish: leitura de progresso falhou; Leitner sem histórico',
          ),
        )
      ).map((p) => [p.questionId, p]),
    )
    for (const q of this.quiz) {
      const given = new Set(answers.get(q.id) ?? [])
      const expected = new Set(q.correct)
      const ok =
        given.size === expected.size && [...expected].every((l) => given.has(l))
      const prev = prior.get(q.id)
      const card = gradeCard(
        { questionId: q.id, box: prev?.box ?? 0, dueAt: 0 },
        ok,
        now,
      )
      await saveProgress({
        questionId: q.id,
        box: card.box,
        dueAt: card.dueAt,
        usageCount: (prev?.usageCount ?? 0) + 1,
        lastSeenAt: now,
      }).catch(hush('data', 'finish: saveProgress falhou'))
    }
    this.engine.finish()
    // v7.0 P2/P3: grava attempt + dia ativo + estudo guiado (local, idempotente)
    await this.recordAttempt(now)
    let syncFailed = 0
    const userId = this.getUserId()
    if (userId) {
      await pushProgress(userId).catch(
        hush('sync', 'finish: pushProgress falhou'),
      )
      await pushSession(userId, this.simId).catch(
        hush('sync', 'finish: pushSession falhou'),
      )
      const res = await pushPlatform(userId).catch(
        hushSync('sync', 'finish: pushPlatform falhou'),
      )
      syncFailed = res.failed
    }
    this.notify()
    return { result: this.result, syncFailed }
  }

  private async recordAttempt(now: number) {
    const answers = new Map(this.engine.answers)
    const result = scoreSession(this.quiz, answers)
    const userId = this.getUserId() ?? 'local'
    const attempt: AttemptRecord = {
      id: crypto.randomUUID(),
      userId,
      kind: 'simulado',
      simuladoId: this.simId,
      startedAt: this.startedAt || now,
      finishedAt: now,
      durationSeconds: Math.max(0, Math.round((now - this.startedAt) / 1000)),
      questions: this.quiz.length,
      score: result.score,
      passed: result.passed,
      answers: this.quiz.map((q) => {
        const given = answers.get(q.id) ?? []
        const expected = q.correct
        const g = new Set(given)
        const e = new Set(expected)
        const correct = e.size === g.size && [...e].every((l) => g.has(l))
        return { questionId: q.id, correct, given, expected }
      }),
      byDomain: result.byDomain,
      errorTags: {},
      createdAt: now,
    }
    await saveAttempt(attempt).catch((err) =>
      logger.warn(
        'data',
        'recordAttempt: saveAttempt falhou (attempt perdido)',
        err instanceof Error ? err.message : err,
      ),
    )
    await markActivity(localDate(new Date(now)), 'simulado').catch(
      hush('data', 'recordAttempt: markActivity falhou'),
    )
    // Estudo guiado recalculado (client-side) + snapshot
    const guide = analyzeAttempt(
      this.quiz,
      answers,
      await loadAllProgress().catch(
        hushArr('data', 'recordAttempt: progresso p/ guia falhou'),
      ),
    )
    this.lastGuide = guide
    if (userId !== 'local') {
      await saveSuggestion({
        id: crypto.randomUUID(),
        userId,
        generatedAt: now,
        payload: toPayload(guide),
      }).catch(hush('data', 'recordAttempt: saveSuggestion falhou'))
    }
  }

  /** Tag de erro (review-card) → attempts + doubts + push. Retorna falhas p/ banner. */
  async tagError(questionId: string, tag: ErrorTag): Promise<number> {
    const userId = this.getUserId() ?? 'local'
    const attempts = await loadAllAttempts().catch(
      hushArr('data', 'tag de erro: leitura de attempts falhou'),
    )
    const latest = attempts
      .filter((a) => a.userId === userId && a.kind === 'simulado')
      .slice(0, 5)
    for (const a of latest) {
      if (!a.errorTags[questionId]) {
        a.errorTags[questionId] = tag
        await saveAttempt(a).catch(
          hush('data', 'tag de erro: saveAttempt falhou'),
        )
      }
    }
    const doubt = await loadDoubt(questionId).catch(
      hush('data', 'tag de erro: loadDoubt falhou'),
    )
    await saveDoubt({
      questionId,
      note: doubt?.note ?? '',
      tag,
      resolved: doubt?.resolved ?? false,
      createdAt: doubt?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }).catch((err) =>
      logger.warn(
        'data',
        'tag de erro: saveDoubt falhou (dúvida perdida)',
        err instanceof Error ? err.message : err,
      ),
    )
    const res = await pushPlatform(userId).catch(
      hushSync('sync', 'tag de erro: pushPlatform falhou'),
    )
    return res.failed
  }
}

function keyToLetter(key: string): string | null {
  const idx = Number(key) - 1
  if (Number.isInteger(idx) && idx >= 0 && idx < 4)
    return String.fromCharCode(65 + idx)
  if (/^[a-dA-D]$/.test(key)) return key.toUpperCase()
  return null
}
