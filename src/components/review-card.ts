import { css, html, LitElement } from 'lit'
import type { Question } from '../engine/question-schema.js'
import type { ErrorTag } from '../sync/types.js'

const TAGS: { id: ErrorTag; label: string }[] = [
  { id: 'concept_gap', label: 'Falta de conceito' },
  { id: 'silly_mistake', label: 'Erro bobo' },
  { id: 'misread', label: 'Leitura errada' },
  { id: 'trap', label: 'Caiu na pegadinha' },
  { id: 'timeout', label: 'Faltou tempo' },
]

export class ReviewCard extends LitElement {
  static properties = {
    question: { type: Object },
    given: { type: Array },
    tag: { type: String },
  }

  declare question: Question
  declare given: string[]
  declare tag: ErrorTag | null

  constructor() {
    super()
    this.given = []
    this.tag = null
  }

  emit(tag: ErrorTag) {
    const ev = new CustomEvent<{ questionId: string; tag: ErrorTag }>(
      'tag-selected',
      {
        bubbles: true,
        composed: true,
        detail: { questionId: this.question.id, tag },
      },
    )
    this.dispatchEvent(ev)
    this.tag = tag
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
        ${
          ok
            ? ''
            : html`<div class="tags" role="group" aria-label="Por que errei esta questão?">
                <span class="hint">Por que errei?</span>
                ${TAGS.map(
                  (t) => html`
                    <button
                      type="button"
                      class="${this.tag === t.id ? 'on' : ''}"
                      aria-pressed=${this.tag === t.id ? 'true' : 'false'}
                      @click=${() => this.emit(t.id)}
                    >
                      ${t.label}
                    </button>
                  `,
                )}
              </div>`
        }
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
      margin: 0 0 10px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .hint {
      font-size: 13px;
      color: var(--text-dim);
      margin-right: 4px;
    }
    .tags button {
      font-size: 12px;
      padding: 4px 10px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface-raised);
      color: var(--text);
      cursor: pointer;
    }
    .tags button:hover {
      border-color: var(--brand);
    }
    .tags button.on {
      background: var(--brand);
      color: var(--brand-contrast);
      border-color: var(--brand);
    }
  `
}
customElements.define('review-card', ReviewCard)
