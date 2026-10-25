import { css, html, LitElement, svg } from 'lit'
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

  private radarPoints(r: ScoreResult): string {
    const entries = Object.entries(r.byDomain)
    const n = entries.length
    if (n === 0) return ''
    const cx = 100
    const cy = 100
    const radius = 70
    return entries
      .map(([_, v], i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const r = (radius * Math.max(0, Math.min(100, v.pct))) / 100
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }

  private radarGrid(): ReturnType<typeof svg> {
    const n = 5
    const cx = 100
    const cy = 100
    const radius = 70
    const rings = [0.25, 0.5, 0.75, 1]
    return svg`
      ${rings.map(
        (scale) => svg`
        <polygon
          points=${Array.from({ length: n }, (_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2
            const r = radius * scale
            return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`
          }).join(' ')}
          fill="none"
          stroke="var(--border)"
          stroke-width="0.5"
        />
      `,
      )}
      ${Array.from({ length: n }, (_, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        return svg`<line x1=${cx} y1=${cy} x2=${x.toFixed(1)} y2=${y.toFixed(1)} stroke="var(--border)" stroke-width="0.5" />`
      })}
    `
  }

  render() {
    const r = this.result
    if (!r) return html``
    const entries = Object.entries(r.byDomain)
    const n = entries.length || 5
    const cx = 100
    const cy = 100
    const radius = 70
    return html`
      <section class="card">
        <h2>${r.score} / 1000 ${r.passed ? '✅ APROVADO' : '❌ REPROVADO'}</h2>
        <div class="radar-wrap" role="img" aria-label="Radar de competências por domínio">
          <svg viewBox="0 0 200 200" class="radar" preserveAspectRatio="xMidYMid meet">
            ${this.radarGrid()}
            <polygon
              points=${this.radarPoints(r)}
              fill="color-mix(in oklch, var(--progress) 30%, transparent)"
              stroke="var(--progress)"
              stroke-width="2"
            />
            ${entries.map(([d, v], i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2
              const lx = cx + (radius + 14) * Math.cos(angle)
              const ly = cy + (radius + 14) * Math.sin(angle)
              return svg`<text x=${lx.toFixed(1)} y=${ly.toFixed(1)} text-anchor="middle" dominant-baseline="middle" font-size="8" fill="var(--text-dim)">${ptLabels(d)} ${v.pct}%</text>`
            })}
          </svg>
        </div>
        <table class="domain-table">
          <thead><tr><th>Domínio</th><th>Desempenho</th></tr></thead>
          <tbody>
            ${entries.map(
              ([d, v]) => html`
              <tr>
                <td>${ptLabels(d)}</td>
                <td>
                  <div class="bar"><div class="fill" style="width:${v.pct}%"></div></div>
                  <span>${v.pct}%</span>
                </td>
              </tr>
            `,
            )}
          </tbody>
        </table>
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
    .radar-wrap {
      width: 100%;
      max-width: 260px;
      margin: 0 auto 12px;
    }
    .radar {
      width: 100%;
      height: auto;
      display: block;
    }
    .domain-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .domain-table th,
    .domain-table td {
      padding: 4px 6px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .domain-table td:last-child {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .bar {
      flex: 1;
      height: 8px;
      background: var(--surface-raised);
      border-radius: 4px;
      min-width: 60px;
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
