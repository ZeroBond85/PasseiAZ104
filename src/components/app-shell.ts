import { css, html, LitElement } from 'lit'
import { ensureSeeded, getQuestionPool } from '../data/QuestionLoader.js'
import { PROPORTIONS, SIMULADOS } from '../data/simulados.js'
import { toggleSelection } from '../engine/keyboard.js'
import { getDue, gradeCard } from '../engine/LeitnerEngine.js'
import {
  domainQuotas,
  pickByIds,
  selectQuestions,
} from '../engine/QuestionSelector.js'
import { QuizEngine } from '../engine/QuizEngine.js'
import type { Question, SimuladoSpec } from '../engine/question-schema.js'
import { CODE_BY_DOMAIN } from '../engine/question-schema.js'
import { type ScoreResult, scoreSession } from '../engine/ScoringEngine.js'
import { analyzeAttempt, type StudyGuideResult } from '../engine/StudyGuide.js'
import { TimerEngine } from '../engine/TimerEngine.js'
import {
  btnStyles,
  cardStyles,
  controlStyles,
  srOnlyStyles,
} from '../styles/shared.js'
import { getUserId, onAuthChange } from '../sync/auth.js'
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
import {
  getProfileRole,
  pushPlatform,
  pushProgress,
  pushSession,
  syncNow,
  upsertOwnProfile,
} from '../sync/SyncEngine.js'
import { isSyncEnabled, supabase } from '../sync/supabase.js'
import type {
  AttemptRecord,
  ErrorTag,
  StudyGuidePayload,
} from '../sync/types.js'
import { logger } from '../utils/logger.js'
import './admin-panel.js'
import './catalog-screen.js'
import './login-screen.js'
import './navigator-grid.js'
import './progress-panel.js'
import './user-menu.js'
import './question-card.js'
import './review-card.js'
import './stats-dashboard.js'
import './study-guide.js'
import './timer-bar.js'
import './estudo-card.js'
import './modal-dialog.js'

const TABS = [
  { id: 'home', label: 'Início' },
  { id: 'quiz', label: 'Simulado' },
  { id: 'treino', label: 'Treino' },
  { id: 'estudo', label: 'Estudo' },
  { id: 'review', label: 'Revisão' },
  { id: 'stats', label: 'Stats' },
] as const

type TabId =
  | (typeof TABS)[number]['id']
  | 'progress'
  | 'admin'
  | 'catalog'
  | 'treino'
  | 'estudo'

// Sessão default: 1º simulado oficial (nav "Simulado" direto, sem catálogo).
const DEFAULT_SIM_ID = SIMULADOS[0]?.id ?? 'sim-oficial-01'

function localDate(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

// Falhas best-effort (IDB local) viram debug log em vez de silêncio:
// console limpo por padrão, buffer guarda p/ diagnóstico (?debug=1).
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

export class AppShell extends LitElement {
  protected createRenderRoot() {
    return this // light DOM for shadow-piercing selectors in tests
  }

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
    syncFail: { type: Number },
    isAdmin: { type: Boolean },
    finishConfirmOpen: { type: Boolean },
    victoryOpen: { type: Boolean },
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
  declare syncFail: number
  declare isAdmin: boolean
  declare lastGuide: StudyGuideResult | null
  declare localMode: boolean
  declare treinoDomain: string | null
  declare treinoPaused: boolean
  declare treinoQuiz: Question[]
  declare treinoCurrent: number
  declare treinoEngine: QuizEngine
  declare finishConfirmOpen: boolean
  declare finishResolve: ((v: boolean) => void) | null
  declare victoryOpen: boolean
  private unsubAuth: () => void = () => undefined

  private engine = new QuizEngine()
  private timer = new TimerEngine(100)
  private timerId = 0
  private persistId = 0
  private startedAt = 0
  private simId = DEFAULT_SIM_ID
  private pendingSpec: SimuladoSpec | null = null

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
    this.syncFail = 0
    this.isAdmin = false
    this.lastGuide = null
    this.localMode = false
    this.treinoDomain = null
    this.treinoPaused = false
    this.treinoQuiz = []
    this.treinoCurrent = 0
    this.treinoEngine = new QuizEngine()
    this.finishConfirmOpen = false
    this.finishResolve = null
    this.victoryOpen = false
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.onKey)
    this.addEventListener('local-mode', this.onLocalMode)
    void getUserId().then((id) => {
      this.userId = id
      this.authReady = true
      if (id) {
        void this.ensureProfile(id)
        void this.syncFromCloud()
      }
      this.requestUpdate()
    })
    this.unsubAuth = onAuthChange((id) => {
      const was = this.userId
      this.userId = id
      if (id && !was) {
        void this.ensureProfile(id)
        void this.syncFromCloud()
      }
      if (!id) this.isAdmin = false
      this.requestUpdate()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.onKey)
    this.removeEventListener('local-mode', this.onLocalMode)
    this.unsubAuth()
    this.stopLoops()
  }

  private onLocalMode = () => {
    this.localMode = true
    this.userId = 'local'
    this.authReady = true
    this.requestUpdate()
  }

  private async ensureProfile(id: string) {
    if (!isSyncEnabled() || !supabase) return
    try {
      const { data } = await supabase.auth.getUser()
      if (data.user?.email) {
        await upsertOwnProfile(id, data.user.email).catch((err) =>
          logger.warn(
            'sync',
            'falha ao salvar perfil',
            err instanceof Error ? err.message : err,
          ),
        )
      }
      const role = await getProfileRole(id)
      this.isAdmin = role === 'admin'
      logger.info('sync', 'perfil verificado', { isAdmin: this.isAdmin })
      this.requestUpdate()
    } catch (err) {
      logger.warn(
        'sync',
        'ensureProfile falhou',
        err instanceof Error ? err.message : err,
      )
    }
  }

  get needsLogin() {
    if (this.localMode) return false
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
      const res = await syncNow(this.userId, this.simId).catch(
        hush('sync', 'syncFromCloud: syncNow falhou (best-effort)'),
      )
      this.syncFail = res?.enabled ? (res.pushFailed ?? 0) : this.syncFail
      // Se a sessão remota era mais nova, o IDB foi atualizado — recarrega estado
      const saved = await loadSession(this.simId).catch(
        hush('data', 'syncFromCloud: leitura de sessão falhou'),
      )
      if (saved && saved.answers.length > 0 && this.quiz.length === 0) {
        this.requestUpdate()
      }
    } finally {
      this.syncing = false
    }
  }

  private async retrySync() {
    if (!this.userId) return
    this.syncing = true
    try {
      const res = await syncNow(this.userId, this.simId).catch(
        hush('sync', 'retrySync: syncNow falhou (banner mantido)'),
      )
      this.syncFail = res?.enabled ? (res.pushFailed ?? 0) : this.syncFail
    } finally {
      this.syncing = false
    }
  }

  private keyToLetter(key: string): string | null {
    const idx = Number(key) - 1
    if (Number.isInteger(idx) && idx >= 0 && idx < 4)
      return String.fromCharCode(65 + idx)
    if (/^[a-dA-D]$/.test(key)) return key.toUpperCase()
    return null
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (this.tab !== 'quiz' || this.engine.state !== 'active') return
    const q = this.quiz[this.current]
    if (!q) return
    if (e.key === 'ArrowRight')
      this.current = Math.min(this.current + 1, this.quiz.length - 1)
    else if (e.key === 'ArrowLeft') this.current = Math.max(this.current - 1, 0)
    else {
      const letter = this.keyToLetter(e.key)
      const opt = letter
        ? q.options.find((o) => o.letter === letter)
        : undefined
      if (opt) {
        const isMultiple = q.type === 'multiple'
        this.onAnswer(
          toggleSelection(
            this.engine.answers.get(q.id) ?? [],
            opt.letter,
            isMultiple,
          ),
        )
      }
    }
  }

  private select(tab: TabId) {
    this.tab = tab
  }

  private async startQuiz(spec: SimuladoSpec) {
    this.loading = true
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
    this.pendingSpec = spec
    this.simId = spec.id
    if (picked.length === 0) {
      this.loading = false
      this.tab = 'catalog'
      logger.warn('quiz', 'startQuiz: nenhuma questão selecionável')
      return
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
      if (this.timer.expired) void this.finish(true)
      this.requestUpdate()
    }, 1000)
    this.persistId = window.setInterval(() => void this.persist(), 30000)
    this.loading = false
    logger.info('quiz', 'simulado iniciado', { id: spec.id })
  }

  private stopLoops() {
    clearInterval(this.timerId)
    clearInterval(this.persistId)
  }

  private async persist() {
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
    if (this.userId) {
      await pushSession(this.userId, this.simId).catch(
        hush('sync', 'persist: pushSession falhou'),
      )
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
    if (!auto && missing > 0) {
      this.finishConfirmOpen = true
      this.requestUpdate()
      await this.updateComplete
      const confirmed = await new Promise<boolean>((resolve) => {
        this.finishResolve = resolve
      })
      this.finishConfirmOpen = false
      this.finishResolve = null
      if (!confirmed) return
    }
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
    if (this.userId) {
      await pushProgress(this.userId).catch(
        hush('sync', 'finish: pushProgress falhou'),
      )
      await pushSession(this.userId, this.simId).catch(
        hush('sync', 'finish: pushSession falhou'),
      )
      const res = await pushPlatform(this.userId).catch(
        hushSync('sync', 'finish: pushPlatform falhou'),
      )
      this.syncFail = res.failed
    }
    if (this.result.passed) {
      this.victoryOpen = true
    }
    this.tab = 'review'
  }

  private async recordAttempt(now: number) {
    const answers = new Map(this.engine.answers)
    const result = scoreSession(this.quiz, answers)
    const userId = this.userId ?? 'local'
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

  render() {
    if (this.needsLogin) return html`<login-screen></login-screen>`
    return html`
      <header>
        <span class="logo-chip"><img src="icons/source-logo.webp" alt="" width="1008" height="309" /></span>
        <div class="brand">
          <strong>Passei AZ-104</strong>
          <span>Estudo para o exame AZ-104</span>
        </div>
        <span class="spacer"></span>
        ${this.syncing ? html`<span class="sync" role="status">sincronizando ☁</span>` : ''}
        ${this.syncFail > 0 ? html`<button type="button" class="sync warn" role="status" @click=${() => void this.retrySync()}>sync falhou (${this.syncFail}) — tocar para repetir ↻</button>` : ''}
        <user-menu .isAdmin=${this.isAdmin} @logout=${() => this.requestUpdate()}></user-menu>
        <theme-toggle></theme-toggle>
      </header>
      ${this.tab === 'quiz' ? this.renderQuiz() : ''}
      ${this.tab === 'home' ? this.renderHome() : ''}
      ${this.tab === 'catalog' ? this.renderCatalog() : ''}
      ${this.tab === 'treino' ? this.renderTreino() : ''}
      ${this.tab === 'estudo' ? this.renderEstudo() : ''}
      ${this.tab === 'review' ? this.renderReview() : ''}
      ${this.tab === 'stats' ? this.renderStats() : ''}
      ${this.tab === 'progress' ? this.renderProgress() : ''}
      ${this.tab === 'admin' ? this.renderAdmin() : ''}
      <nav aria-label="Navegação principal">
        ${this.navTabs.map(
          (t) => html`
            <button type="button" aria-current=${this.tab === t.id ? 'page' : 'false'} @click=${() => this.select(t.id)}>
              ${t.label}
            </button>
          `,
        )}
      </nav>
      <modal-dialog
        .open=${this.finishConfirmOpen}
        title="Finalizar simulado?"
        message="${this.engine.unansweredCount()} questão(ões) sem responder. Tem certeza que deseja finalizar?"
        confirmText="Finalizar"
        cancelText="Voltar"
        @confirm=${this.onFinishConfirm}
        @cancel=${this.onFinishCancel}
      ></modal-dialog>
      <modal-dialog
        .open=${this.victoryOpen}
        variant="success"
        title="Parabéns! 🎉"
        message="Você foi aprovado no simulado! Pontuação: ${this.result?.score ?? 0}/1000"
        confirmText="Ver revisão"
        @confirm=${this.onVictoryClose}
      ></modal-dialog>
    `
  }

  private get navTabs() {
    const tabs: { id: TabId; label: string }[] = [...TABS]
    tabs.push({ id: 'progress', label: 'Progresso' })
    if (this.isAdmin) tabs.push({ id: 'admin', label: 'Admin' })
    return tabs
  }

  private renderCatalog() {
    return html`<catalog-screen
      @start=${(e: CustomEvent<SimuladoSpec>) => this.onCatalogStart(e.detail)}
    ></catalog-screen>`
  }

  private onCatalogStart(spec: SimuladoSpec) {
    this.pendingSpec = spec
    this.simId = spec.id
    this.tab = 'quiz'
  }

  private renderHome() {
    return html`
      <main>
        <section class="card hero">
          <div class="logo-wrap">
            <img src="icons/source-logo.webp" alt="" width="1008" height="309" aria-hidden="true" class="hero-logo" />
          </div>
          <h1 class="sr-only">Passei AZ-104</h1>
          <p>950 questões e simulados no formato, tempo e nota do exame AZ‑104. Estude offline e continue de qualquer dispositivo.</p>
          <div class="hero-actions">
            <button type="button" class="btn btn-primary" @click=${() => this.select('quiz')}>Começar simulado</button>
            <button type="button" class="btn" @click=${() => this.select('catalog')}>Escolher um simulado</button>
          </div>
        </section>
      </main>
    `
  }

  private renderOrientation() {
    const title = this.pendingSpec?.title ?? SIMULADOS[0]?.title ?? 'Simulado'
    return html`
      <main>
        <section class="card orientation">
          <h1 class="sr-only">Orientação do simulado</h1>
          <h2>${title} — antes de começar</h2>
          <p>
            Este simulado usa o mesmo formato do exame <strong>Azure
            Administrator Associate (AZ‑104)</strong>: 50 questões, 100 minutos,
            nota de corte <strong>700</strong>. Nenhuma pausa é permitida após
            o início, então garanta tempo e foco antes de começar.
          </p>
          <ul class="checks">
            <li><strong>50 questões</strong> — escolha única, múltipla escolha,
            cenários (case studies) e verdadeiro/falso.</li>
            <li><strong>100 minutos</strong> — cronômetro regressivo visível
            durante toda a prova.</li>
            <li><strong>Nota de corte 700</strong> — aprovado quem chega a
            700/1000, no mesmo critério da prova oficial.</li>
            <li><strong>Pular</strong> questões com as setas ← → e voltar a
            qualquer momento pelo mapa de questões.</li>
            <li><strong>Marcar revisão</strong> (⚑) em qualquer questão para
            revisá-la antes de finalizar.</li>
            <li>Ao final, veja a <strong>revisão completa</strong>: sua resposta,
            a correta e a explicação de cada questão.</li>
          </ul>
          <div class="hero-actions">
            <button type="button" class="btn btn-primary" @click=${() => void this.startQuiz(this.pendingSpec ?? SIMULADOS[0])}>
              Começar simulado
            </button>
            <button type="button" class="btn" @click=${() => this.select('catalog')}>
              Escolher outro simulado
            </button>
          </div>
        </section>
      </main>
    `
  }

  private renderQuiz() {
    if (this.loading) return html`<main><p>Carregando questões…</p></main>`
    if (this.quiz.length === 0 && this.engine.state !== 'active')
      return this.renderOrientation()
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
        <p class="progress" aria-live="polite">
          Questão ${this.current + 1} de ${this.quiz.length}
        </p>
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
        ${
          this.lastGuide
            ? html`<study-guide .guide=${this.lastGuide} .questions=${this.quiz}></study-guide>`
            : ''
        }
        ${this.quiz.map(
          (q) => html`
            <review-card
              .question=${q}
              .given=${this.engine.answers.get(q.id) ?? []}
              @tag-selected=${this.onTagSelected}
            ></review-card>
          `,
        )}
      </main>
    `
  }

  private renderProgress() {
    return html`<progress-panel></progress-panel>`
  }

  private async renderEstudo() {
    const now = Date.now()
    const allProgress = await loadAllProgress().catch(
      hushArr('data', 'estudo: load progress falhou'),
    )
    const { due, truncated } = getDue(allProgress, now, 50)

    if (due.length === 0) {
      return html`
        <main class="center">
          <p class="empty">Nenhuma questão pendente para revisão. 🎉</p>
          <p class="hint">Termine um simulado ou aguarde o próximo ciclo.</p>
        </main>
      `
    }

    return html`
      <main>
        <header class="estudo-header">
          <h2>Estudo espaçado (Leitner)</h2>
          ${truncated ? html`<p class="hint">Mostrando as 50 mais urgentes de ${due.length} pendentes.</p>` : ''}
        </header>
        ${due.map(
          (card) => html`
            <estudo-card
              .questionId=${card.questionId}
              .box=${card.box}
              .dueAt=${card.dueAt}
              @grade=${this.onGradeEstudo}
            ></estudo-card>
          `,
        )}
      </main>
    `
  }

  private renderTreino() {
    if (this.treinoDomain) {
      return this.renderTreinoQuiz()
    }
    return html`
      <main>
        <header class="treino-header">
          <h2>Treino por domínio</h2>
          <p class="hint">Escolha um domínio para praticar questões focadas.</p>
        </header>
        <div class="treino-grid">
          ${Object.entries(CODE_BY_DOMAIN).map(
            ([domain, code]) => html`
              <button
                type="button"
                class="treino-btn"
                @click=${() => void this.startTreino(domain)}
              >
                <span class="code">${code.toUpperCase()}</span>
                <span class="label">${domain}</span>
              </button>
            `,
          )}
        </div>
      </main>
    `
  }

  private async startTreino(domain: string) {
    const pool = await getQuestionPool()
    const domainQuestions = pool.filter((q) => q.domain === domain)
    if (domainQuestions.length === 0) return

    // Pick 20 questions from this domain
    const picked = domainQuestions.sort(() => Math.random() - 0.5).slice(0, 20)

    this.treinoDomain = domain
    this.treinoQuiz = picked
    this.treinoCurrent = 0
    this.treinoEngine = new QuizEngine()
    this.treinoPaused = false
    this.requestUpdate()
  }

  private renderTreinoQuiz() {
    const q = this.treinoQuiz[this.treinoCurrent]
    if (!q) return html`<main><p>Nenhuma questão.</p></main>`
    const progress = `${this.treinoCurrent + 1} / ${this.treinoQuiz.length}`
    return html`
      <main>
        <header class="treino-quiz-header">
          <h2>Treino: ${this.treinoDomain}</h2>
          <div class="treino-progress">
            <span>${progress}</span>
            ${
              !this.treinoPaused
                ? html`<button type="button" class="btn" @click=${() => this.pauseTreino()}>Pausar</button>`
                : html`<button type="button" class="btn btn-primary" @click=${() => this.resumeTreino()}>Continuar</button>`
            }
            <button type="button" class="btn btn-secondary" @click=${() => this.exitTreino()}>Sair</button>
          </div>
        </header>
        <p class="progress" aria-live="polite">Questão ${progress}</p>
        <question-card
          .question=${q}
          .selected=${this.treinoEngine.answers.get(q.id) ?? []}
          @answer=${(e: CustomEvent) => this.onTreinoAnswer(e.detail)}
        ></question-card>
        <div class="actions">
          <button
            type="button"
            class="btn"
            @click=${() => this.onTreinoFlag(q.id)}
            ?disabled=${this.treinoPaused}
          >
            ${this.treinoEngine.flagged.has(q.id) ? '⚑ Desmarcar' : '⚑ Marcar'}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click=${() => void this.finishTreino()}
            ?disabled=${this.treinoPaused}
          >
            Finalizar
          </button>
        </div>
      </main>
    `
  }

  private onTreinoAnswer(ans: string[]) {
    if (this.treinoPaused) return
    this.treinoEngine.answer(this.treinoQuiz[this.treinoCurrent].id, ans)
    this.requestUpdate()
  }

  private onTreinoFlag(qid: string) {
    if (this.treinoPaused) return
    if (this.treinoEngine.flagged.has(qid)) {
      this.treinoEngine.flagged.delete(qid)
    } else {
      this.treinoEngine.flagged.add(qid)
    }
    this.requestUpdate()
  }

  private pauseTreino() {
    this.treinoPaused = true
    this.requestUpdate()
  }

  private resumeTreino() {
    this.treinoPaused = false
    this.requestUpdate()
  }

  private exitTreino() {
    this.treinoDomain = null
    this.treinoQuiz = []
    this.treinoCurrent = 0
    this.treinoPaused = false
    this.requestUpdate()
  }

  private finishTreino() {
    if (this.treinoPaused) return
    const correct = this.treinoQuiz.filter((q) => {
      const given = this.treinoEngine.answers.get(q.id) ?? []
      const expected = new Set(q.correct)
      return (
        given.length === expected.size &&
        [...expected].every((l) => given.includes(l))
      )
    }).length
    const total = this.treinoQuiz.length
    const pct = Math.round((correct / total) * 100)
    alert(`Treino concluído: ${correct}/${total} (${pct}%)`)
    this.exitTreino()
  }

  private renderAdmin() {
    if (!this.isAdmin) return html`<main><p>Acesso restrito.</p></main>`
    return html`<admin-panel></admin-panel>`
  }

  private onTagSelected(e: Event) {
    const d = (e as CustomEvent<{ questionId: string; tag: ErrorTag }>).detail
    const userId = this.userId ?? 'local'
    void (async () => {
      const attempts = await loadAllAttempts().catch(
        hushArr('data', 'tag de erro: leitura de attempts falhou'),
      )
      const latest = attempts
        .filter((a) => a.userId === userId && a.kind === 'simulado')
        .slice(0, 5)
      for (const a of latest) {
        if (!a.errorTags[d.questionId]) {
          a.errorTags[d.questionId] = d.tag
          await saveAttempt(a).catch(
            hush('data', 'tag de erro: saveAttempt falhou'),
          )
        }
      }
      const doubt = await loadDoubt(d.questionId).catch(
        hush('data', 'tag de erro: loadDoubt falhou'),
      )
      await saveDoubt({
        questionId: d.questionId,
        note: doubt?.note ?? '',
        tag: d.tag,
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
      if (res.failed > 0) this.syncFail = res.failed
    })()
  }

  private onGradeEstudo(e: Event) {
    const d = (e as CustomEvent<{ questionId: string; quality: number }>).detail
    const now = Date.now()
    void (async () => {
      const allProgress = await loadAllProgress().catch(
        hushArr('data', 'grade: load falhou'),
      )
      const prev = allProgress.find((p) => p.questionId === d.questionId)
      const card = gradeCard(
        {
          questionId: d.questionId,
          box: prev?.box ?? 0,
          dueAt: prev?.dueAt ?? 0,
        },
        d.quality >= 3, // Good (3) e Easy (4) = correto; Again (0), Hard (1) = incorreto
        now,
      )
      await saveProgress({
        questionId: d.questionId,
        box: card.box,
        dueAt: card.dueAt,
        usageCount: (prev?.usageCount ?? 0) + 1,
        lastSeenAt: now,
      }).catch(hush('data', 'grade: saveProgress falhou'))
      this.requestUpdate()
    })()
  }

  private onFinishConfirm() {
    this.finishResolve?.(true)
  }

  private onFinishCancel() {
    this.finishResolve?.(false)
  }

  private onVictoryClose() {
    this.victoryOpen = false
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
    ${cardStyles}
    ${btnStyles}
    ${srOnlyStyles}
    ${controlStyles}
    .hero {
      text-align: center;
      padding: 32px 24px;
    }
    .hero .logo-wrap {
      background: #ffffff;
      border: 1px solid rgb(0 0 0 / 0.08);
      border-radius: 14px;
      box-shadow: 0 8px 28px rgb(0 0 0 / 0.35);
      padding: 10px 12px;
      width: min(340px, 86%);
      margin: 0 auto;
      box-sizing: border-box;
    }
    .hero img.hero-logo {
      width: 100%;
      height: auto;
      display: block;
    }
    .hero h1 {
      margin: 16px 0 8px;
      font-size: 28px;
    }
    .hero p {
      color: var(--text-dim);
      margin: 0 0 20px;
      line-height: 1.6;
    }
    .hero-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
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
    header .logo-chip {
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.4);
      padding: 5px 8px;
      display: inline-flex;
      align-items: center;
    }
    header .logo-chip img {
      width: auto;
      height: 38px;
      display: block;
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
    @media (max-width: 520px) {
      header {
        gap: 10px;
        padding: 10px 12px;
      }
      .brand strong {
        font-size: 18px;
        white-space: nowrap;
      }
      .brand span {
        display: none;
      }
    }
    .sync {
      color: var(--text-dim);
      font-size: 13px;
    }
    .sync.warn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: var(--warning);
      text-decoration: underline;
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
    .progress {
      color: var(--text-dim);
      font-size: var(--fs-sm);
      margin: 0 0 12px;
    }
    .orientation {
      text-align: center;
      padding: 28px 24px;
    }
    .orientation h2 {
      margin: 0 0 12px;
      font-size: 22px;
    }
    .orientation > p {
      color: var(--text-dim);
      line-height: 1.6;
      margin: 0 0 16px;
    }
    .orientation .checks {
      list-style: none;
      margin: 0 auto 20px;
      padding: 0;
      max-width: 560px;
      text-align: left;
      line-height: 1.6;
    }
    .orientation .checks li {
      padding: 6px 0 6px 24px;
      position: relative;
    }
    .orientation .checks li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--progress-ink);
      font-weight: 700;
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
      min-width: 0;
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      border-radius: var(--radius-sm);
      margin: 6px 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (prefers-reduced-motion: no-preference) {
      nav button {
        transition:
          background-color 0.15s ease,
          color 0.15s ease;
      }
    }
    nav button[aria-current='page'] {
      color: var(--progress-ink);
      background-color: var(--surface-raised);
      outline: 1px solid var(--progress-ink);
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
    .treino-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .treino-header h2 {
      margin: 0 0 8px;
      font-size: 22px;
    }
    .treino-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    .treino-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-raised);
      color: var(--text);
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .treino-btn:hover {
      border-color: var(--brand);
      box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
    }
    .treino-btn .code {
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 700;
      color: var(--brand);
    }
    .treino-btn .label {
      font-size: 13px;
      color: var(--text-dim);
    }
    .treino-quiz-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .treino-quiz-header h2 {
      margin: 0;
      font-size: 18px;
    }
    .treino-progress {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .treino-progress .btn {
      font-size: 13px;
      padding: 6px 12px;
    }
  `
}
customElements.define('app-shell', AppShell)
