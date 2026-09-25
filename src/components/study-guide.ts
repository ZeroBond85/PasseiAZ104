import { css, html, LitElement } from 'lit'
import type { Question } from '../engine/question-schema.js'
import type { StudyGuideResult } from '../engine/StudyGuide.js'
import { btnStyles, cardStyles } from '../styles/shared.js'

export function labels(d: string) {
  const map: Record<string, string> = {
    'identidade-governanca': 'Identidade e governança',
    storage: 'Storage',
    compute: 'Computação',
    'rede-virtual': 'Rede virtual',
    monitoramento: 'Monitoramento',
    single: 'Escolha única',
    multiple: 'Múltipla escolha',
    'case-study': 'Cenário',
    'yes-no': 'Verdadeiro/falso',
    easy: 'Fáceis',
    medium: 'Médias',
    hard: 'Difíceis',
  }
  return map[d] ?? d
}

export class StudyGuide extends LitElement {
  static properties = {
    guide: { type: Object },
    questions: { type: Array },
  }

  declare guide: StudyGuideResult
  declare questions: Question[]

  constructor() {
    super()
    this.questions = []
  }

  render() {
    const g = this.guide
    if (!g) return html``
    const domainAgg = new Map<string, { total: number; correct: number }>()
    const typeAgg = new Map<string, { total: number; correct: number }>()
    const diffAgg = new Map<string, { total: number; correct: number }>()
    for (const q of this.questions ?? []) {
      const missed = (g.topErrors ?? []).some((t) => t.question.id === q.id)
      const d = domainAgg.get(q.domain) ?? { total: 0, correct: 0 }
      d.total++
      if (!missed) d.correct++
      domainAgg.set(q.domain, d)
      for (const [m, agg] of [
        [typeAgg, q.type],
        [diffAgg, q.difficulty],
      ] as const) {
        const s = m.get(agg) ?? { total: 0, correct: 0 }
        s.total++
        if (!missed) s.correct++
        m.set(agg, s)
      }
    }

    return html`
      <section class="card guide">
        <h2>O que estudar a partir deste simulado</h2>
        <p class="intro" aria-label="análise do simulado">
          ${g.score} / 1000 · ${g.passed ? 'aprovado ✅' : 'abaixo do corte 700'}
        </p>

        <h3>Onde errou mais</h3>
        ${
          domainAgg.size === 0
            ? html`<p class="empty">Sem dados deste simulado.</p>`
            : html`<ul class="domains">
                ${[...domainAgg.entries()].map(([d, s]) => {
                  const pct = s.total
                    ? Math.round((s.correct / s.total) * 100)
                    : 100
                  return html`
                      <li>
                        <span>${labels(d)}</span>
                        <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
                        <span>${pct}%</span>
                      </li>
                    `
                })}
              </ul>`
        }

        <h3>Por tipo e dificuldade</h3>
        <div class="grid2">
          <ul class="kv">
            ${[...typeAgg.entries()].map(([t, s]) => {
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0
              return html`<li>${labels(t)}: <strong>${pct}%</strong></li>`
            })}
          </ul>
          <ul class="kv">
            ${[...diffAgg.entries()].map(([t, s]) => {
              const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0
              return html`<li>${labels(t)}: <strong>${pct}%</strong></li>`
            })}
          </ul>
        </div>

        <h3>Recomendações</h3>
        <ul class="tips">
          ${(g.tips ?? []).map((t) => html`<li>${t}</li>`)}
        </ul>
        ${
          'leitnerTip' in g && g.leitnerTip
            ? html`<p class="leitner">${g.leitnerTip}</p>`
            : ''
        }
      </section>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    .guide {
      margin-bottom: 16px;
    }
    .guide h2 {
      margin: 0 0 8px;
    }
    .guide h3 {
      margin: 16px 0 8px;
      font-size: 15px;
    }
    .intro {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .domains {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .domains li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .domains li span:first-child {
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
    .grid2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .kv {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.8;
    }
    .tips {
      margin: 0;
      padding-left: 20px;
      line-height: 1.6;
      font-size: 14px;
    }
    .leitner {
      color: var(--warning);
      font-size: 14px;
      margin: 12px 0 0;
    }
    .empty {
      color: var(--text-dim);
    }
  `
}
customElements.define('study-guide', StudyGuide)
