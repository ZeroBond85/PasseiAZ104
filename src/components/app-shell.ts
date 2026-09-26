import { css, html, LitElement } from 'lit'
import { buildDrillQuestions } from '../controllers/drill-controller.js'
import { QuizController } from '../controllers/quiz-controller.js'
import { SyncController } from '../controllers/sync-controller.js'
import { TreinoController } from '../controllers/treino-controller.js'
import { ensureSeeded, getBankLine } from '../data/QuestionLoader.js'
import { buildDynamicSpec, SIMULADOS } from '../data/simulados.js'
import { getDue, gradeCard } from '../engine/LeitnerEngine.js'
import type { SimuladoSpec } from '../engine/question-schema.js'
import { CODE_BY_DOMAIN } from '../engine/question-schema.js'
import {
  btnStyles,
  cardStyles,
  controlStyles,
  srOnlyStyles,
} from '../styles/shared.js'
import { getUserId, onAuthChange } from '../sync/auth.js'
import {
  loadAllProgress,
  loadSession,
  saveProgress,
} from '../sync/IndexedDB.js'
import {
  getProfileRole,
  syncNow,
  upsertOwnProfile,
} from '../sync/SyncEngine.js'
import { isSyncEnabled, supabase } from '../sync/supabase.js'
import type { ErrorTag } from '../sync/types.js'
import { logger } from '../utils/logger.js'
import './admin-panel.js'
import './catalog-screen.js'
import './login-screen.js'
import './navigator-grid.js'
import './progress-panel.js'
import './user-menu.js'
import './question-card.js'
import { labels as ptLabels } from './study-guide.js'
import './review-card.js'
import './stats-dashboard.js'
import './timer-bar.js'
import './estudo-card.js'
import { isEnabled } from '../config/flags.js'
import './study-hub-panel.js'
import './modal-dialog.js'

const TABS = [
  { id: 'home', label: 'Início' },
  { id: 'quiz', label: 'Simulado' },
  { id: 'treino', label: 'Treino' },
  { id: 'estudo', label: 'Estudo' },
  { id: 'review', label: 'Revisão' },
  { id: 'stats', label: 'Notas' },
] as const

type TabId =
  | (typeof TABS)[number]['id']
  | 'progress'
  | 'admin'
  | 'catalog'
  | 'treino'
  | 'estudo'

// Sessão default: 1º simulado oficial (nav "Simulado" direto, sem catálogo).
// (O id default vive no QuizController.)

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

export class AppShell extends LitElement {
  static properties = {
    tab: { type: String },
    userId: { type: String },
    authReady: { type: Boolean },
    syncing: { type: Boolean },
    syncFail: { type: Number },
    isAdmin: { type: Boolean },
    finishConfirmOpen: { type: Boolean },
    victoryOpen: { type: Boolean },
    treinoResultOpen: { type: Boolean },
    treinoResultMsg: { type: String },
    seedError: { type: String },
    online: { type: Boolean },
    bankLine: { type: String },
  }

  declare tab: TabId
  declare userId: string | null
  declare authReady: boolean
  declare syncing: boolean
  declare syncFail: number
  declare isAdmin: boolean
  declare localMode: boolean
  declare finishConfirmOpen: boolean
  declare finishResolve: ((v: boolean) => void) | null
  declare victoryOpen: boolean
  declare treinoResultOpen: boolean
  declare treinoResultMsg: string
  declare seedError: string | null
  declare online: boolean
  declare bankLine: string
  private unsubAuth: () => void = () => undefined

  private quizCtl = new QuizController(
    () => this.requestUpdate(),
    () => this.userId,
  )
  private treinoCtl = new TreinoController(() => this.requestUpdate())
  private syncCtl = new SyncController()
  private pendingSpec: SimuladoSpec | null = null

  constructor() {
    super()
    this.tab = 'home'
    this.userId = null
    this.authReady = false
    this.syncing = false
    this.syncFail = 0
    this.isAdmin = false
    this.localMode = false
    this.finishConfirmOpen = false
    this.finishResolve = null
    this.victoryOpen = false
    this.treinoResultOpen = false
    this.treinoResultMsg = ''
    this.seedError = null
    this.online = typeof navigator !== 'undefined' ? navigator.onLine : true
    this.bankLine = ''
    this.quizCtl.onExpire(() => void this.finish(true))
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('online', this.onNet)
    window.addEventListener('offline', this.onNet)
    this.addEventListener('local-mode', this.onLocalMode)
    void getBankLine().then((t) => {
      this.bankLine = t
    })
    void getUserId().then((id) => {
      this.userId = id
      this.authReady = true
      if (id) {
        void this.ensureProfile(id)
        void this.syncFromCloud()
        this.syncCtl.attach(id, this.quizCtl.simId)
      }
      this.requestUpdate()
    })
    this.unsubAuth = onAuthChange((id) => {
      const was = this.userId
      this.userId = id
      if (id && !was) {
        void this.ensureProfile(id)
        void this.syncFromCloud()
        this.syncCtl.attach(id, this.quizCtl.simId)
      }
      if (!id) {
        this.isAdmin = false
        this.syncCtl.detach()
      }
      this.requestUpdate()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('online', this.onNet)
    window.removeEventListener('offline', this.onNet)
    this.removeEventListener('local-mode', this.onLocalMode)
    this.unsubAuth()
    this.syncCtl.detach()
    this.quizCtl.stopLoops()
  }

  private onLocalMode = () => {
    this.localMode = true
    this.userId = 'local'
    this.authReady = true
    this.requestUpdate()
  }

  private onNet = () => {
    this.online = navigator.onLine
  }

  private async retrySeed() {
    try {
      localStorage.removeItem('az104-seed-version')
    } catch {
      // sem localStorage: tenta o seed direto mesmo assim
    }
    this.seedError = null
    this.requestUpdate()
    try {
      await ensureSeeded()
    } catch (err) {
      this.seedError =
        err instanceof Error ? err.message : 'Falha ao carregar o banco.'
      logger.warn('quiz', 'retrySeed: seed ainda incompleto', this.seedError)
    }
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
      const res = await syncNow(this.userId, this.quizCtl.simId).catch(
        hush('sync', 'syncFromCloud: syncNow falhou (best-effort)'),
      )
      this.syncFail = res?.enabled ? (res.pushFailed ?? 0) : this.syncFail
      // Se a sessão remota era mais nova, o IDB foi atualizado — recarrega estado
      const saved = await loadSession(this.quizCtl.simId).catch(
        hush('data', 'syncFromCloud: leitura de sessão falhou'),
      )
      if (saved && saved.answers.length > 0 && this.quizCtl.quiz.length === 0) {
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
      this.syncCtl.attach(this.userId, this.quizCtl.simId)
      this.syncFail = await this.syncCtl.flush()
    } finally {
      this.syncing = false
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (this.tab !== 'quiz') return
    this.quizCtl.handleKey(e)
  }

  private select(tab: TabId) {
    this.tab = tab
    // Aba Simulado abre sempre um dinâmico novo (seed fresco a cada clique),
    // exceto quando o usuário escolheu um fixo no catálogo (pendingSpec).
    if (tab === 'quiz' && !this.pendingSpec)
      this.pendingSpec = buildDynamicSpec()
    if (tab === 'estudo') void this.loadEstudo()
  }

  private async startQuiz(spec: SimuladoSpec) {
    this.pendingSpec = spec
    this.seedError = null
    try {
      const ok = await this.quizCtl.start(spec)
      if (!ok) this.tab = 'catalog'
    } catch (err) {
      this.seedError =
        err instanceof Error ? err.message : 'Falha ao carregar o banco.'
      logger.warn('quiz', 'startQuiz: seed incompleto', this.seedError)
      return
    }
    if (this.userId) this.syncCtl.attach(this.userId, spec.id)
  }

  private async finish(auto = false) {
    const missing = this.quizCtl.unansweredCount()
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
    const { result, syncFailed } = await this.quizCtl.complete()
    if (this.userId) this.syncFail = syncFailed
    if (result.passed) {
      this.victoryOpen = true
    }
    this.tab = 'review'
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
        ${this.syncFail > 0 ? html`<button type="button" class="sync warn" role="status" @click=${() => void this.retrySync()}>Falha ao sincronizar (${this.syncFail}) — tentar de novo ↻</button>` : ''}
        ${!this.online ? html`<span class="sync warn" role="status">🔴 offline — dados salvos localmente</span>` : ''}
        ${this.seedError ? html`<button type="button" class="sync warn" role="status" @click=${() => void this.retrySeed()}>⚠ Banco incompleto — recarregar</button>` : ''}
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
        message="${this.finishMessage()}"
        confirmText="Finalizar"
        cancelText="Voltar"
        @confirm=${this.onFinishConfirm}
        @cancel=${this.onFinishCancel}
      ></modal-dialog>
      <modal-dialog
        .open=${this.victoryOpen}
        variant="success"
        title="Parabéns! 🎉"
        message="Você foi aprovado no simulado! Pontuação: ${this.quizCtl.result?.score ?? 0}/1000"
        confirmText="Ver revisão"
        @confirm=${this.onVictoryClose}
      ></modal-dialog>
      <modal-dialog
        .open=${this.treinoResultOpen}
        variant="info"
        title="Treino concluído"
        message="${this.treinoResultMsg}"
        confirmText="OK"
        @confirm=${this.onTreinoResultConfirm}
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
          <p>Do seu jeito, até a aprovação no AZ‑104: simule a prova real, revise o que
            errou e estude no seu ritmo — em qualquer dispositivo.</p>
          <p class="cert">Simulado e guia de estudo em português para o Exame AZ-104 —
            Administrador de Azure Associado (Microsoft).</p>
          ${this.bankLine ? html`<p class="bank">${this.bankLine}</p>` : ''}
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
            Este simulado usa o mesmo formato do exame de <strong>Administrador de
            Azure Associado (AZ‑104)</strong>: 50 questões, 100 minutos,
            nota de corte <strong>700</strong>. Nenhuma pausa é permitida após
            o início, então garanta tempo e foco antes de começar.
          </p>
          <ul class="checks">
            <li><strong>50 questões</strong> — escolha única, múltipla escolha,
            estudos de caso e verdadeiro/falso.</li>
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
    const ctl = this.quizCtl
    if (ctl.loading) return html`<main><p>Carregando questões…</p></main>`
    if (ctl.quiz.length === 0 && !ctl.isActive) return this.renderOrientation()
    const q = ctl.currentQuestion
    if (!q)
      return html`<main><p>Não foi possível carregar as questões. Use “Recarregar banco” no topo e tente de novo.</p></main>`
    return html`
      <timer-bar .remaining=${ctl.timer.remaining} .total=${ctl.timer.totalSeconds} .saved=${ctl.savedFlash}></timer-bar>
      <navigator-grid
        .total=${ctl.quiz.length}
        .current=${ctl.current}
        .answered=${ctl.answeredIndexes()}
        .flagged=${ctl.flaggedIndexes()}
        @goto=${(e: CustomEvent) => {
          ctl.goTo(e.detail)
        }}
      ></navigator-grid>
      <main>
        <h1 class="sr-only">Simulado</h1>
        <p class="progress" aria-live="polite">
          Questão ${ctl.current + 1} de ${ctl.quiz.length}
        </p>
        <question-card
          .question=${q}
          .selected=${ctl.answerOf(q.id)}
          @answer=${(e: CustomEvent) => ctl.answer(e.detail)}
        ></question-card>
        <div class="actions">
          <button type="button" class="btn" @click=${() => ctl.toggleFlag()}>
            ${ctl.isFlagged(q.id) ? '⚑ Desmarcar' : '⚑ Marcar revisão'}
          </button>
          <button type="button" class="btn btn-primary" @click=${() => void this.finish()}>
            Finalizar (${ctl.unansweredCount()} sem responder)
          </button>
        </div>
      </main>
    `
  }

  private renderReview() {
    const ctl = this.quizCtl
    if (!ctl.result)
      return html`<main><p>Finalize um simulado para ver a revisão.</p></main>`
    return html`
      <main>
        <stats-dashboard .result=${ctl.result}></stats-dashboard>
        ${
          ctl.lastGuide
            ? html`<study-guide .guide=${ctl.lastGuide} .questions=${ctl.quiz}></study-guide>`
            : ''
        }
        ${ctl.quiz.map(
          (q) => html`
            <review-card
              .question=${q}
              .given=${ctl.answerOf(q.id)}
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

  private estudoDue: { questionId: string; box: number; dueAt: number }[] = []
  private estudoTruncated = false
  private estudoLoaded = false

  private async loadEstudo() {
    this.estudoLoaded = false
    const now = Date.now()
    const allProgress = await loadAllProgress().catch(
      hushArr('data', 'estudo: load progress falhou'),
    )
    const { due, truncated } = getDue(allProgress, now, 50)
    this.estudoDue = due
    this.estudoTruncated = truncated
    this.estudoLoaded = true
    this.requestUpdate()
  }

  private renderEstudo() {
    if (!this.estudoLoaded)
      return html`<main><p>Carregando revisões…</p></main>`
    const due = this.estudoDue
    const truncated = this.estudoTruncated

    if (due.length === 0) {
      return html`
        ${this.renderGuideCard()}
        ${
          isEnabled('study-hub')
            ? html`<study-hub-panel
              .userId=${this.userId ?? 'local'}
              @start-drill=${() => void this.onStartDrill()}
            ></study-hub-panel>`
            : ''
        }
        <main class="center">
          <p class="empty">Nada para revisar agora. 🎉</p>
          <p class="hint">Termine um simulado e volte aqui para fixar o que errou.</p>
        </main>
      `
    }

    return html`
      <main>
        ${this.renderGuideCard()}
        ${
          isEnabled('study-hub')
            ? html`<study-hub-panel
              .userId=${this.userId ?? 'local'}
              @start-drill=${() => void this.onStartDrill()}
            ></study-hub-panel>`
            : ''
        }
        <header class="estudo-header">
          <h2>Fixe o que errou</h2>
          ${truncated ? html`<p class="hint">Mostrando 50 de ${due.length} para revisar — comece pela primeira.</p>` : ''}
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

  private renderGuideCard() {
    return html`
      <section class="card guide-official">
        <h2>Guia oficial da Microsoft</h2>
        <p>O roteiro oficial do Exame AZ-104: o que esperar da prova, os tópicos
          cobrados e links de estudo — em português.</p>
        <a
          class="btn"
          href="https://learn.microsoft.com/pt-br/credentials/certifications/resources/study-guides/az-104"
          target="_blank"
          rel="noopener"
          >Abrir guia oficial ↗</a
        >
      </section>
    `
  }

  private async onStartDrill() {
    const qs = await buildDrillQuestions(this.userId ?? 'local').catch(() => [])
    if (qs.length === 0) return
    await this.treinoCtl.startCustom(qs, 'Meus erros')
    this.tab = 'treino'
  }

  private renderTreino() {
    if (this.treinoCtl.domain) {
      return this.renderTreinoQuiz()
    }
    return html`
      <main>
        <header class="treino-header">
          <h2>Treino por domínio</h2>
          <p class="hint">Escolha um domínio para praticar com 20 questões focadas.</p>
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
                <span class="label">${ptLabels(domain)}</span>
              </button>
            `,
          )}
        </div>
      </main>
    `
  }

  private async startTreino(domain: string) {
    this.seedError = null
    try {
      await this.treinoCtl.start(domain)
    } catch (err) {
      this.seedError =
        err instanceof Error ? err.message : 'Falha ao carregar o banco.'
      logger.warn('quiz', 'startTreino: seed incompleto', this.seedError)
    }
  }

  private renderTreinoQuiz() {
    const ctl = this.treinoCtl
    const q = ctl.currentQuestion
    if (!q)
      return html`<main><p>Não há questões aqui. Volte e escolha um domínio para começar.</p></main>`
    const progress = `${ctl.current + 1} / ${ctl.quiz.length}`
    return html`
      <main>
        <header class="treino-quiz-header">
          <h2>Treino: ${ctl.domain ? ptLabels(ctl.domain) : ''}</h2>
          <div class="treino-progress">
            <span>${progress}</span>
            ${
              !ctl.paused
                ? html`<button type="button" class="btn" @click=${() => ctl.pause()}>Pausar</button>`
                : html`<button type="button" class="btn btn-primary" @click=${() => ctl.resume()}>Continuar</button>`
            }
            <button type="button" class="btn btn-secondary" @click=${() => ctl.exit()}>Sair</button>
          </div>
        </header>
        <p class="progress" aria-live="polite">Questão ${progress}</p>
        <question-card
          .question=${q}
          .selected=${ctl.answerOf(q.id)}
          @answer=${(e: CustomEvent) => ctl.answer(e.detail)}
        ></question-card>
        <div class="actions">
          <button
            type="button"
            class="btn"
            @click=${() => ctl.toggleFlag()}
            ?disabled=${ctl.paused}
          >
            ${ctl.isFlagged(q.id) ? '⚑ Desmarcar' : '⚑ Marcar revisão'}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click=${() => this.finishTreino()}
            ?disabled=${ctl.paused}
          >
            Finalizar
          </button>
        </div>
      </main>
    `
  }

  private finishTreino() {
    const r = this.treinoCtl.finish()
    if (!r) return
    this.treinoResultMsg = `Treino concluído: ${r.correct}/${r.total} (${r.pct}%)`
    this.treinoResultOpen = true
  }

  private onTreinoResultConfirm() {
    this.treinoResultOpen = false
    this.treinoCtl.exit()
  }

  private renderAdmin() {
    if (!this.isAdmin)
      return html`<main><p>Área restrita — só para administradores.</p></main>`
    return html`<admin-panel></admin-panel>`
  }

  private onTagSelected(e: Event) {
    const d = (e as CustomEvent<{ questionId: string; tag: ErrorTag }>).detail
    void (async () => {
      const failed = await this.quizCtl.tagError(d.questionId, d.tag)
      if (failed > 0) this.syncFail = failed
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

  private finishMessage(): string {
    const n = this.quizCtl.unansweredCount()
    const q =
      n === 1 ? '1 questão sem responder' : `${n} questões sem responder`
    return `${q}. Tem certeza que deseja finalizar?`
  }

  private renderStats() {
    const result = this.quizCtl.result
    return html`
      <main>
        ${
          result
            ? html`<stats-dashboard .result=${result}></stats-dashboard>`
            : html`<section class="card"><p>Sem resultados ainda. Finalize um simulado e seu desempenho aparece aqui.</p></section>`
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
      margin: 0 0 12px;
      line-height: 1.6;
    }
    .hero .cert {
      color: var(--text-dim);
      font-size: var(--fs-sm);
      margin: 0 0 8px;
      line-height: 1.5;
    }
    .hero .bank {
      color: var(--text-dim);
      font-size: 13px;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .guide-official {
      margin-bottom: 16px;
    }
    .guide-official p {
      color: var(--text-dim);
      font-size: var(--fs-sm);
      line-height: 1.55;
      margin: 0 0 12px;
    }
    .guide-official a.btn {
      text-decoration: none;
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
    @media (max-width: 520px) {
      nav {
        flex-wrap: wrap;
      }
      nav button {
        flex: 1 1 30%;
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
      }
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
