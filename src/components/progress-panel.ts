import { css, html, LitElement } from 'lit'
import { readiness } from '../engine/StudyGuide.js'
import { btnStyles, cardStyles } from '../styles/shared.js'
import { getUserId } from '../sync/auth.js'
import {
  loadAllActivity,
  loadAllAttempts,
  loadAllDoubts,
  loadAllProgress,
  saveDoubt,
} from '../sync/IndexedDB.js'
import type { DoubtRecord } from '../sync/types.js'

const DOMAIN_LABEL: Record<string, string> = {
  'identidade-governanca': 'Identidade e governança',
  storage: 'Storage',
  compute: 'Computação',
  'rede-virtual': 'Rede virtual',
  monitoramento: 'Monitoramento',
}

export class ProgressPanel extends LitElement {
  static properties = {
    loaded: { type: Boolean },
  }

  declare loaded: boolean
  private doubts: DoubtRecord[] = []
  private attempts = 0
  private streak = 0
  private byDomain: Record<string, number> = {}
  private lastScores: { score: number }[] = []
  private ready = readiness([], {}, [])

  constructor() {
    super()
    this.loaded = false
    void this.load()
  }

  private async load() {
    const userId = await getUserId()
    const [attempts, doubts, progress, activity] = await Promise.all([
      loadAllAttempts(),
      loadAllDoubts(),
      loadAllProgress(),
      loadAllActivity(),
    ])
    const mine = userId ? attempts.filter((a) => a.userId === userId) : attempts
    this.attempts = mine.length
    this.doubts = doubts
    this.lastScores = mine.map((a) => ({ score: a.score }))
    this.streak = computeStreak(activity)
    this.byDomain = aggregateDomains(mine)
    this.ready = readiness(this.lastScores, this.byDomain, progress)
    this.loaded = true
    this.requestUpdate()
  }

  private label(d: string) {
    return DOMAIN_LABEL[d] ?? d
  }

  render() {
    if (!this.loaded) return html`<main><p>Carregando…</p></main>`
    return html`
      <main>
        <section class="card">
          <h2>Seu progresso</h2>
          <div class="kpis">
            <div class="kpi"><strong>${this.attempts}</strong> simulados</div>
            <div class="kpi"><strong>${this.streak}</strong> dias ativos</div>
            <div class="kpi">
              <strong>${this.ready.avg5 ?? '—'}</strong> média 5
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Pronto para agendar a prova?</h2>
          ${
            this.ready.ready
              ? html`<p class="ready ok">✅ Aprovado: agende com ~2 semanas.</p>`
              : html`<p class="ready">Faltam:</p>`
          }
          <ul class="checks">
            <li class="${this.ready.avg5 !== null && this.ready.avg5 >= 750 ? 'ok' : 'no'}">
              ${this.ready.avg5 !== null && this.ready.avg5 >= 750 ? '✓' : '✗'}
              Média das últimas 5 provas ≥ 750 (atual: ${this.ready.avg5 ?? '—'})
            </li>
            <li class="${this.ready.domainsOk ? 'ok' : 'no'}">
              ${this.ready.domainsOk ? '✓' : '✗'} Todos os domínios ≥ 70%
            </li>
            <li class="${this.ready.leitnerOk ? 'ok' : 'no'}">
              ${this.ready.leitnerOk ? '✓' : '✗'} Caixa 1 com menos de 10 itens
            </li>
          </ul>
        </section>

        <section class="card">
          <h2>Dificuldade por domínio</h2>
          ${
            Object.keys(this.byDomain).length === 0
              ? html`<p class="dim">Finalize simulados para ver o mapa de dificuldade.</p>`
              : html`<ul class="domains">
                  ${Object.entries(this.byDomain)
                    .sort((a, b) => a[1] - b[1])
                    .map(
                      ([d, pct]) => html`
                        <li>
                          <span>${this.label(d)}</span>
                          <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
                          <span>${pct}%</span>
                        </li>
                      `,
                    )}
                </ul>`
          }
        </section>

        <section class="card">
          <h2>Suas dúvidas</h2>
          ${
            this.doubts.length === 0
              ? html`<p class="dim">Nenhuma dúvida anotada. Na revisão dos simulados, use “Por que errei?”.</p>`
              : html`<ul class="doubts">
                  ${this.doubts.map((d) => {
                    const lang = this.kindLabel(d)
                    return html`
                      <li class="${d.resolved ? 'done' : ''}">
                        <p><strong>${d.questionId}</strong> · ${lang}</p>
                        ${d.note ? html`<p class="note">${d.note}</p>` : ''}
                        <button type="button" .data-qid=${d.questionId} @click=${(
                          e: Event,
                        ) => this.toggleResolve(e)}>
                          ${d.resolved ? 'Reabrir' : 'Resolver'}
                        </button>
                      </li>
                    `
                  })}
                </ul>`
          }
        </section>

        <section class="card">
          <h2>Resumo de notas</h2>
          ${
            this.lastScores.length === 0
              ? html`<p class="dim">Nenhum simulado finalizado.</p>`
              : html`<ol class="scores">
                  ${this.lastScores
                    .slice(0, 10)
                    .map(
                      (s) =>
                        html`<li><span class="${s.score >= 700 ? 'ok' : 'no'}">${s.score}</span> / 1000</li>`,
                    )}
                </ol>`
          }
        </section>
      </main>
    `
  }

  private kindLabel(d: DoubtRecord) {
    const map: Record<string, string> = {
      concept_gap: 'Falha de conceito',
      silly_mistake: 'Erro bobo',
      misread: 'Leitura errada',
      trap: 'Armadilha',
      timeout: 'Faltou tempo',
      null: '',
    }
    return d.tag ? (map[d.tag ?? ''] ?? d.tag) : ''
  }

  private async toggleResolve(e: Event) {
    const qid = (e.currentTarget as HTMLButtonElement).dataset.qid
    if (!qid) return
    const doubt = this.doubts.find((d) => d.questionId === qid)
    if (!doubt) return
    doubt.resolved = !doubt.resolved
    doubt.updatedAt = Date.now()
    await saveDoubt(doubt)
    await this.load()
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    .card {
      margin-bottom: 16px;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
    }
    .kpi {
      background: var(--surface-raised);
      border-radius: var(--radius-sm);
      padding: 12px;
      text-align: center;
      font-size: 13px;
      color: var(--text-dim);
    }
    .kpi strong {
      display: block;
      font-size: 22px;
      color: var(--text);
    }
    .ready {
      margin: 0 0 8px;
    }
    .checks {
      list-style: none;
      margin: 0;
      padding: 0;
      line-height: 1.9;
    }
    .ok {
      color: var(--brand-green);
    }
    .no {
      color: var(--warning);
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
    .dim {
      color: var(--text-dim);
    }
    .doubts {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .doubts li {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .doubts li:last-child {
      border-bottom: none;
    }
    .doubts p {
      margin: 0 0 4px;
    }
    .doubts .note {
      font-size: 13px;
      color: var(--text-dim);
    }
    .doubts li.done {
      opacity: 0.6;
      text-decoration: line-through;
    }
    .scores {
      margin: 0;
      padding-left: 20px;
      line-height: 1.9;
    }
    .scores .ok {
      font-weight: 700;
    }
  `
}

// Streak: dias ativos consecutivos encerrando em hoje (ou ontem se hoje vazio).
export function computeStreak(activity: { date: string }[]) {
  const days = new Set(activity.map((a) => a.date))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const cursor = new Date()
  if (!days.has(fmt(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(fmt(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function aggregateDomains(
  attempts: { id: string; byDomain: Record<string, { pct: number }> }[],
) {
  const acc: Record<string, number> = {}
  for (const a of attempts) {
    for (const [d, v] of Object.entries(a.byDomain)) {
      acc[d] = Math.max(acc[d] ?? 0, v.pct)
    }
  }
  return acc
}

customElements.define('progress-panel', ProgressPanel)
