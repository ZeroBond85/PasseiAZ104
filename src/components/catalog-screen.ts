import { css, html, LitElement } from 'lit'
import { getBankLine } from '../data/QuestionLoader.js'
import {
  buildDynamicSpec,
  DYNAMIC_ID,
  PROPORTIONS,
  SIMULADOS,
} from '../data/simulados.js'
import type { SimuladoSpec } from '../engine/question-schema.js'
import {
  btnStyles,
  cardStyles,
  controlStyles,
  srOnlyStyles,
} from '../styles/shared.js'
import { loadAllAttempts } from '../sync/IndexedDB.js'

export class CatalogScreen extends LitElement {
  static properties = {
    busy: { type: Boolean },
    bankLine: { type: String },
  }

  declare busy: boolean
  declare bankLine: string
  private lastBySim = new Map<string, { score: number; at: number }>()

  constructor() {
    super()
    this.busy = false
    this.bankLine = ''
  }

  connectedCallback() {
    super.connectedCallback()
    void getBankLine().then((t) => {
      this.bankLine = t
    })
    void this.loadLastActivity()
  }

  private async loadLastActivity() {
    const attempts = await loadAllAttempts().catch(() => [])
    for (const a of attempts) {
      const cur = this.lastBySim.get(a.simuladoId)
      if (!cur || a.finishedAt > cur.at)
        this.lastBySim.set(a.simuladoId, { score: a.score, at: a.finishedAt })
    }
    this.requestUpdate()
  }

  private lastText(simId: string): string {
    const last = this.lastBySim.get(simId)
    if (!last) return 'nunca feito'
    const date = new Date(last.at)
      .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
      .replace('.', '')
    return `última: ${last.score} em ${date}`
  }

  private start(spec: SimuladoSpec) {
    this.busy = true
    this.dispatchEvent(
      new CustomEvent<SimuladoSpec>('start', {
        detail: spec,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private noteDistribution() {
    return PROPORTIONS.map(
      (p) => `${p.domain.split('-').join(' ')} ${Math.round(p.share * 100)}%`,
    ).join(' · ')
  }

  render() {
    const oficiais = SIMULADOS.filter((s) => s.mode === 'fixed')
    return html`
      <main>
        <h1 class="sr-only">Escolha um simulado</h1>
        <p class="cert">Simulado e guia de estudo em português para o Exame AZ-104 —
          Administrador de Azure Associado (Microsoft).</p>
        <p class="cert-link"><a href="https://learn.microsoft.com/pt-br/credentials/certifications/resources/study-guides/az-104" target="_blank" rel="noopener">Guia de estudo oficial do Exame AZ-104 ↗</a></p>
        ${this.bankLine ? html`<p class="bank">${this.bankLine}</p>` : ''}

        <section class="card dynamic">
          <h2>Simulado Dinâmico <span class="rec">★ Recomendado</span></h2>
          <p class="sub">Um simulado novo a cada clique — 50 questões · 100 min.</p>
          <button
            type="button"
            class="row"
            ?disabled=${this.busy}
            @click=${() => this.start(buildDynamicSpec())}
          >
            <span class="t">Começar agora</span>
            <span class="meta">${this.noteDistribution()} · ${this.lastText(DYNAMIC_ID)}</span>
          </button>
        </section>

        <section class="card">
          <h2>Simulados fixos</h2>
          <p class="sub">10 provas prontas — mesmas 50 questões toda vez · 100 minutos.</p>
          <ul class="list">
            ${oficiais.map(
              (s) => html`
                <li>
                  <button
                    type="button"
                    class="row"
                    ?disabled=${this.busy}
                    @click=${() => this.start(s)}
                  >
                    <span class="t">${s.title}</span>
                    <span class="meta">50 questões · 100 min · ${this.lastText(s.id)}</span>
                  </button>
                </li>
              `,
            )}
          </ul>
        </section>
      </main>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    ${srOnlyStyles}
    ${controlStyles}
    main {
      max-width: 960px;
      margin: 0 auto;
      padding: 16px;
      box-sizing: border-box;
      width: 100%;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 20px;
    }
    .rec {
      font-size: 13px;
      font-weight: 600;
      color: var(--brand-green);
      border: 1px solid var(--brand-green);
      border-radius: 999px;
      padding: 1px 10px;
      margin-left: 8px;
      white-space: nowrap;
    }
    .sub {
      margin: 0 0 12px;
      font-size: 14px;
      color: var(--text-dim);
      line-height: 1.5;
    }
    .cert {
      margin: 0 0 4px;
      font-size: 14px;
      color: var(--text-dim);
      line-height: 1.5;
    }
    .cert-link {
      margin: 0 0 16px;
      font-size: 14px;
    }
    .cert-link a {
      color: var(--progress-ink);
    }
    .bank {
      margin: 0 0 16px;
      font-size: 13px;
      color: var(--text-dim);
    }
    .card {
      margin-bottom: 16px;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .list li + li {
      border-top: 1px solid var(--border);
    }
    .row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      padding: 12px 4px;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .row:hover {
      background: var(--surface-raised);
    }
    .row:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .t {
      font-weight: 650;
      font-size: 16px;
    }
    .meta {
      font-size: 13px;
      color: var(--text-dim);
      text-transform: capitalize;
    }
  `
}

customElements.define('catalog-screen', CatalogScreen)
