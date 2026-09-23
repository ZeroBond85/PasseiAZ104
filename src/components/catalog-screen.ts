import { css, html, LitElement } from 'lit'
import { PROPORTIONS, SIMULADOS } from '../data/simulados.js'
import type { SimuladoSpec } from '../engine/question-schema.js'
import {
  btnStyles,
  cardStyles,
  controlStyles,
  srOnlyStyles,
} from '../styles/shared.js'

const DYNAMIC_ID = 'sim-dinamico'

export class CatalogScreen extends LitElement {
  static properties = {
    busy: { type: Boolean },
  }

  declare busy: boolean

  constructor() {
    super()
    this.busy = false
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

  private dynamicSpec(): SimuladoSpec {
    return {
      mode: 'seed',
      id: DYNAMIC_ID,
      title: 'Simulado Dinâmico',
      seed: Date.now() % 100000,
      questionCount: 50,
      timeLimitMinutes: 100,
    }
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

        <section class="card">
          <h2>Simulados oficiais</h2>
          <p class="sub">50 questões · 100 minutos · corte 700 — mesmo formato do exame AZ‑104.</p>
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
                    <span class="meta">${s.mode === 'fixed' ? '50 questões · 100 min' : ''}</span>
                  </button>
                </li>
              `,
            )}
          </ul>
        </section>

        <section class="card">
          <h2>Outros modos</h2>
          <button
            type="button"
            class="row"
            ?disabled=${this.busy}
            @click=${() => this.start(this.dynamicSpec())}
          >
            <span class="t">Simulado Dinâmico</span>
            <span class="meta">Sorteado do banco — 50q · 100min · ${this.noteDistribution()}</span>
          </button>
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
    .sub {
      margin: 0 0 12px;
      font-size: 14px;
      color: var(--text-dim);
      line-height: 1.5;
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
