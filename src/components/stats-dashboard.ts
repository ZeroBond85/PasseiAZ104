import { css, html, LitElement } from 'lit'
import type { ScoreResult } from '../engine/ScoringEngine.js'
import { cardStyles } from '../styles/shared.js'
import { labels as ptLabels } from './study-guide.js'

export class StatsDashboard extends LitElement {
  static properties = {
    result: { type: Object },
  }

  declare result: ScoreResult | null

  constructor() {
    super()
    this.result = null
  }

  render() {
    const r = this.result
    if (!r) return html``
    return html`
      <section class="card">
        <h2>${r.score} / 1000 ${r.passed ? '✅ APROVADO' : '❌ REPROVADO'}</h2>
        ${Object.entries(r.byDomain).map(
          ([d, v]) => html`
            <div class="row">
              <span>${ptLabels(d)}</span>
              <div class="bar"><div class="fill" style="width:${v.pct}%"></div></div>
              <span>${v.pct}%</span>
            </div>
          `,
        )}
        ${
          r.weakAreas.length > 0
            ? html`<p class="weak">Para reforçar (&lt;70%): ${r.weakAreas.join(', ')}</p>`
            : html`<p class="weak ok">Nenhum domínio abaixo de 70%.</p>`
        }
      </section>
    `
  }

  static styles = css`
    ${cardStyles}
    h2 {
      margin: 0 0 12px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .row span:first-child {
      flex: 0 0 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bar {
      flex: 1;
      height: 8px;
      background: var(--surface-raised);
      border-radius: 4px;
    }
    .fill {
      height: 100%;
      background: var(--progress);
      border-radius: 4px;
    }
    .weak {
      color: var(--warning);
    }
    .weak.ok {
      color: var(--brand-green);
    }
  `
}
customElements.define('stats-dashboard', StatsDashboard)
