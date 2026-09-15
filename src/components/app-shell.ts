import { css, html, LitElement } from 'lit'
import { ensureSeeded, getQuestionPool } from '../data/QuestionLoader.js'
import { gradeCard } from '../engine/LeitnerEngine.js'
import { selectQuestions } from '../engine/QuestionSelector.js'
import { QuizEngine } from '../engine/QuizEngine.js'
import type { Question } from '../engine/question-schema.js'
import { type ScoreResult, scoreSession } from '../engine/ScoringEngine.js'
import { TimerEngine } from '../engine/TimerEngine.js'
import { getUserId, onAuthChange } from '../sync/auth.js'
import {
  loadAllProgress,
  loadSession,
  saveProgress,
  saveSession,
} from '../sync/IndexedDB.js'
import { pushProgress, pushSession, syncNow } from '../sync/SyncEngine.js'
import { isSyncEnabled } from '../sync/supabase.js'
import './login-screen.js'
import './navigator-grid.js'
import './user-menu.js'
import './question-card.js'
import './review-card.js'
import './stats-dashboard.js'
import './timer-bar.js'

const TABS = [
  { id: 'home', label: 'Início' },
  { id: 'quiz', label: 'Simulado' },
  { id: 'review', label: 'Revisão' },
  { id: 'stats', label: 'Stats' },
] as const

type TabId = (typeof TABS)[number]['id']

const SIM_ID = 'sim-ig-01'

export class AppShell extends LitElement {
  static properties = {
    tab: { type: String },
    quiz: { type: Object },
    current: { type: Number },
    result: { type: Object },
    savedFlash: { type: Boolean },
    loading: { type: Boolean },
    userId: { type: String },
    authReady: { type: Boolean },
    syncing: { type: Boolean },
  }

  declare tab: TabId
  declare quiz: Question[]
  declare current: number
  declare result: ScoreResult | null
  declare savedFlash: boolean
  declare loading: boolean
  declare userId: string | null
  declare authReady: boolean
  declare syncing: boolean
  private unsubAuth: () => void = () => undefined

  private engine = new QuizEngine()
  private timer = new TimerEngine(100)
  private timerId = 0
  private persistId = 0

  constructor() {
    super()
    this.tab = 'home'
    this.quiz = []
    this.current = 0
    this.result = null
    this.savedFlash = false
    this.loading = false
    this.userId = null
    this.authReady = false
    this.syncing = false
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.onKey)
    void getUserId().then((id) => {
      this.userId = id
      this.authReady = true
      if (id) void this.syncFromCloud()
    })
    this.unsubAuth = onAuthChange((id) => {
      const was = this.userId
      this.userId = id
      if (id && !was) void this.syncFromCloud()
      if (!id) this.requestUpdate()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.onKey)
    this.unsubAuth()
    this.stopLoops()
  }

  get needsLogin() {
    if (
      typeof location !== 'undefined' &&
      new URLSearchParams(location.search).has('local')
    ) {
      return false // bypass de teste e2e (?local=1) — nunca em produção
    }
    return isSyncEnabled() && this.authReady && !this.userId
  }

  private async syncFromCloud() {
    if (!this.userId) return
    this.syncing = true
    try {
      await syncNow(this.userId, SIM_ID).catch(() => undefined)
      // Se a sessão remota era mais nova, o IDB foi atualizado — recarrega estado
      const saved = await loadSession(SIM_ID).catch(() => undefined)
      if (saved && saved.answers.length > 0 && this.quiz.length === 0) {
        this.requestUpdate()
      }
    } finally {
      this.syncing = false
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.tab !== 'quiz' || this.engine.state !== 'active') return
    const q = this.quiz[this.current]
    if (!q) return
    if (e.key === 'ArrowRight')
      this.current = Math.min(this.current + 1, this.quiz.length - 1)
    else if (e.key === 'ArrowLeft') this.current = Math.max(this.current - 1, 0)
    else if (['1', '2', '3', '4'].includes(e.key)) {
      const idx = Number(e.key) - 1
      const opt = q.options[idx]
      if (opt) this.onAnswer([opt.letter])
    }
  }

  private select(tab: TabId) {
    this.tab = tab
    if (tab === 'quiz' && this.quiz.length === 0 && !this.loading)
      void this.startQuiz()
  }

  private async startQuiz() {
    this.loading = true
    await ensureSeeded()
    const pool = (await getQuestionPool()) as Question[]
    const progress = await loadAllProgress()
    const usage = new Map(progress.map((p) => [p.questionId, p.usageCount]))
    const picked = selectQuestions(pool, {
      seed: Date.now() % 100000,
      count: Math.min(50, pool.length),
      quotas: {
        [pool[0]?.domain ?? 'identidade-governanca']: Math.min(50, pool.length),
      },
      recentIds: new Set(),
      usageCount: usage,
    })

    // Restaura sessão anterior se existir
    const saved = await loadSession(SIM_ID).catch(() => undefined)
    this.engine.load(picked)
    this.quiz = picked
    if (saved && saved.answers.length > 0) {
      this.engine.restore({
        state: saved.state as never,
        index: saved.index,
        answers: saved.answers,
        flagged: saved.flagged,
      })
      this.timer.remaining = saved.timerRemaining
    }
    this.current = this.engine.index
    this.timer.start()
    this.timerId = window.setInterval(() => {
      this.timer.tick(1)
      if (this.timer.expired) void this.finish(true)
      this.requestUpdate()
    }, 1000)
    this.persistId = window.setInterval(() => void this.persist(), 30000)
    this.loading = false
  }

  private stopLoops() {
    clearInterval(this.timerId)
    clearInterval(this.persistId)
  }

  private async persist() {
    const snap = this.engine.snapshot()
    await saveSession({
      id: SIM_ID,
      state: snap.state,
      index: snap.index,
      answers: snap.answers,
      flagged: snap.flagged,
      timerRemaining: this.timer.remaining,
      updatedAt: Date.now(),
    }).catch(() => undefined)
    if (this.userId) {
      await pushSession(this.userId, SIM_ID).catch(() => undefined)
    }
    this.savedFlash = true
    setTimeout(() => {
      this.savedFlash = false
    }, 2000)
  }

  private onAnswer(letters: string[]) {
    const q = this.quiz[this.current]
    if (!q) return
    this.engine.answer(q.id, letters)
    this.requestUpdate()
  }

  private onFlag() {
    const q = this.quiz[this.current]
    if (!q) return
    this.engine.toggleFlag(q.id)
    this.requestUpdate()
  }

  private async finish(auto = false) {
    const missing = this.engine.unansweredCount()
    if (
      !auto &&
      missing > 0 &&
      !confirm(`${missing} sem responder. Finalizar mesmo assim?`)
    )
      return
    this.stopLoops()
    this.engine.submit()
    const answers = new Map(this.engine.answers)
    this.result = scoreSession(this.quiz, answers)
    // Leitner: grava progresso (acerto = todas certas, sem erro)
    const now = Date.now()
    const prior = new Map(
      (await loadAllProgress().catch(() => [])).map((p) => [p.questionId, p]),
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
      }).catch(() => undefined)
    }
    this.engine.finish()
    if (this.userId) {
      await pushProgress(this.userId).catch(() => undefined)
      await pushSession(this.userId, SIM_ID).catch(() => undefined)
    }
    this.tab = 'review'
  }

  render() {
    if (this.needsLogin) return html`<login-screen></login-screen>`
    return html`
      <header>
        <img src="icons/header-112.png" alt="Passei AZ-104" width="56" height="56" />
        <div class="brand">
          <strong>Passei AZ-104</strong>
          <span>Simulado + revisão espaçada</span>
        </div>
        <span class="spacer"></span>
        ${this.syncing ? html`<span class="sync" role="status">sincronizando ☁</span>` : ''}
        <user-menu @logout=${() => this.requestUpdate()}></user-menu>
        <theme-toggle></theme-toggle>
      </header>
      ${this.tab === 'quiz' ? this.renderQuiz() : ''}
      ${this.tab === 'home' ? this.renderHome() : ''}
      ${this.tab === 'review' ? this.renderReview() : ''}
      ${this.tab === 'stats' ? this.renderStats() : ''}
      <nav aria-label="Navegação principal">
        ${TABS.map(
          (t) => html`
            <button type="button" aria-current=${this.tab === t.id ? 'page' : 'false'} @click=${() => this.select(t.id)}>
              ${t.label}
            </button>
          `,
        )}
      </nav>
    `
  }

  private renderHome() {
    return html`
      <main>
        <section class="card hero">
          <img src="icons/icon-192.png" alt="" width="96" height="96" aria-hidden="true" />
          <h1>Passei AZ-104</h1>
          <p>950 questões validadas · 50 por simulado · 100 min · corte 700.<br />Estude offline, revise com Leitner, sincronize entre dispositivos.</p>
          <button type="button" class="btn btn-primary" @click=${() => this.select('quiz')}>Começar simulado</button>
        </section>
      </main>
    `
  }

  private renderQuiz() {
    if (this.loading) return html`<main><p>Carregando questões…</p></main>`
    const q = this.quiz[this.current]
    if (!q) return html`<main><p>Nenhuma questão carregada.</p></main>`
    const idxById = new Map(this.quiz.map((x, i) => [x.id, i]))
    return html`
      <timer-bar .remaining=${this.timer.remaining} .total=${this.timer.totalSeconds} .saved=${this.savedFlash}></timer-bar>
      <navigator-grid
        .total=${this.quiz.length}
        .current=${this.current}
        .answered=${[...this.engine.answers.keys()].map((id) => idxById.get(id) ?? -1)}
        .flagged=${[...this.engine.flagged].map((id) => idxById.get(id) ?? -1)}
        @goto=${(e: CustomEvent) => {
          this.current = e.detail
        }}
      ></navigator-grid>
      <main>
        <h1 class="sr-only">Simulado</h1>
        <question-card
          .question=${q}
          .selected=${this.engine.answers.get(q.id) ?? []}
          @answer=${(e: CustomEvent) => this.onAnswer(e.detail)}
        ></question-card>
        <div class="actions">
          <button type="button" class="btn" @click=${() => this.onFlag()}>
            ${this.engine.flagged.has(q.id) ? '⚑ Desmarcar' : '⚑ Marcar revisão'}
          </button>
          <button type="button" class="btn btn-primary" @click=${() => void this.finish()}>
            Finalizar (${this.engine.unansweredCount()} sem responder)
          </button>
        </div>
      </main>
    `
  }

  private renderReview() {
    if (!this.result)
      return html`<main><p>Finalize um simulado para ver a revisão.</p></main>`
    return html`
      <main>
        <stats-dashboard .result=${this.result}></stats-dashboard>
        ${this.quiz.map(
          (q) => html`
            <review-card .question=${q} .given=${this.engine.answers.get(q.id) ?? []}></review-card>
          `,
        )}
      </main>
    `
  }

  private renderStats() {
    return html`
      <main>
        ${
          this.result
            ? html`<stats-dashboard .result=${this.result}></stats-dashboard>`
            : html`<section class="card"><p>Sem resultados ainda.</p></section>`
        }
      </main>
    `
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: linear-gradient(180deg, var(--surface-raised), var(--surface));
      border-bottom: 1px solid var(--border);
    }
    header img {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.4);
    }
    .brand {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }
    .brand strong {
      font-size: 20px;
      letter-spacing: 0.2px;
    }
    .brand span {
      font-size: 12px;
      color: var(--text-dim);
    }
    .sync {
      color: var(--text-dim);
      font-size: 13px;
    }
    .spacer {
      flex: 1;
    }
    main {
      flex: 1;
      padding: 16px;
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    nav {
      display: flex;
      position: sticky;
      bottom: 0;
      background-color: var(--surface);
      border-top: 1px solid var(--border);
      padding-bottom: env(safe-area-inset-bottom);
    }
    nav button {
      flex: 1;
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      border-radius: var(--radius-sm);
      margin: 6px 4px;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }
    nav button[aria-current='page'] {
      color: #93c5fd;
      background-color: var(--surface-raised);
      outline: 1px solid #93c5fd;
    }
    @media (min-width: 768px) {
      nav {
        position: static;
        order: -1;
        border-top: none;
        border-bottom: 1px solid var(--border);
        justify-content: center;
      }
      nav button {
        flex: 0 1 auto;
        padding: 0 24px;
      }
    }
  `
}
customElements.define('app-shell', AppShell)
