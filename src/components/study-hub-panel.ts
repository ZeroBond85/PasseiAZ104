import { css, html, LitElement } from 'lit'
import { generateStudyPlan, type StudyPlan } from '../study/study-hub.js'
import {
  isSeen,
  loadProfile,
  markSeen,
  saveProfile,
} from '../study/study-profile.js'
import { btnStyles, cardStyles } from '../styles/shared.js'
import { labels as ptLabels } from './study-guide.js'
import './study-link-card.js'

// Painel "O que estudar agora": domínios fracos + links MS Learn priorizados.
// Auto-suficiente: carrega o plano no connect; "lido" persiste no perfil.
export class StudyHubPanel extends LitElement {
  static properties = {
    userId: { type: String },
    loaded: { type: Boolean },
  }

  declare userId: string
  declare loaded: boolean
  private plan: StudyPlan | null = null

  constructor() {
    super()
    this.userId = ''
    this.loaded = false
  }

  connectedCallback() {
    super.connectedCallback()
    void this.refresh()
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('userId')) void this.refresh()
  }

  async refresh() {
    if (!this.userId) return
    this.loaded = false
    this.plan = await generateStudyPlan(this.userId).catch(() => null)
    this.loaded = true
    this.requestUpdate()
  }

  private startDrill() {
    this.dispatchEvent(
      new CustomEvent('start-drill', { bubbles: true, composed: true }),
    )
  }

  private onToggleSeen(e: Event) {
    const topicId = (e as CustomEvent<string>).detail
    if (!topicId || !this.userId) return
    const p = loadProfile(this.userId)
    if (isSeen(p, topicId)) return
    saveProfile(this.userId, markSeen(p, topicId))
    if (this.plan) {
      for (const l of this.plan.links) if (l.topicId === topicId) l.seen = true
    }
    this.requestUpdate()
  }

  render() {
    if (!this.loaded) return html`<main><p>Montando seu plano…</p></main>`
    const plan = this.plan
    // Sem attempts: não renderiza nada (a aba já tem estado vazio próprio)
    if (plan?.hasData !== true) return html``
    return html`
      <main @toggle-seen=${this.onToggleSeen}>
        ${
          plan.weakDomains.length > 0
            ? html`<section class="card">
              <h2>O que estudar agora</h2>
              <ul class="weak">
                ${plan.weakDomains.map(
                  (w) =>
                    html`<li><strong>${ptLabels(w.domain)}</strong> · ${w.pct}%</li>`,
                )}
              </ul>
              ${
                plan.leitnerDue >= 10
                  ? html`<p class="warn">+ ${plan.leitnerDue} revisões vencidas — faça 15 minutos hoje.</p>`
                  : ''
              }
            </section>`
            : html`<section class="card">
              <h2>O que estudar agora</h2>
              <p class="ok">Nenhum domínio abaixo de 70% — mantenha o ritmo. 🎉</p>
            </section>`
        }
        ${plan.links.map(
          (l) => html`<study-link-card .link=${l}></study-link-card>`,
        )}
        <button type="button" class="btn btn-primary" @click=${this.startDrill}>
          🎯 Treinar meus erros
        </button>
      </main>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    .card {
      margin-bottom: 16px;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 18px;
    }
    .weak {
      list-style: none;
      margin: 0;
      padding: 0;
      line-height: 1.8;
      font-size: 14px;
    }
    .warn {
      color: var(--warning);
      font-size: 14px;
      margin: 10px 0 0;
    }
    .ok {
      color: var(--brand-green);
      margin: 0;
    }
    .dim {
      color: var(--text-dim);
    }
  `
}
customElements.define('study-hub-panel', StudyHubPanel)
