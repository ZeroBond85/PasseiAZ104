import { css, html, LitElement } from 'lit'
import type { Question } from '../engine/question-schema.js'

export class ReviewCard extends LitElement {
  static properties = {
    question: { type: Object },
    given: { type: Array },
  }

  declare question: Question
  declare given: string[]

  constructor() {
    super()
    this.given = []
  }

  render() {
    const q = this.question
    if (!q) return html``
    const expected = new Set(q.correct)
    const given = new Set(this.given)
    const ok =
      expected.size === given.size && [...expected].every((l) => given.has(l))
    return html`
      <article class="card ${ok ? 'ok' : 'miss'}">
        <p class="qid">${q.id} · ${ok ? '✅' : '❌'} sua: ${[...given].join(',') || '—'} · certa: ${[...expected].join(',')}</p>
        <h3>${q.question}</h3>
        <p class="exp">${q.explanation}</p>
      </article>
    `
  }

  static styles = css`
    .card {
      margin-bottom: 12px;
    }
    .ok {
      border-color: var(--brand-green);
    }
    .miss {
      border-color: var(--danger);
    }
    .qid {
      font-size: 13px;
      color: var(--text-dim);
      margin: 0 0 8px;
    }
    h3 {
      font-size: 16px;
      margin: 0 0 8px;
    }
    .exp {
      font-size: 14px;
      margin: 0;
    }
  `
}
customElements.define('review-card', ReviewCard)
