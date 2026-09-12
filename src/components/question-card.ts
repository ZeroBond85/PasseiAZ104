import { css, html, LitElement } from 'lit'
import type { Question } from '../engine/question-schema.js'

export class QuestionCard extends LitElement {
  static properties = {
    question: { type: Object },
    selected: { type: Array },
    locked: { type: Boolean },
  }

  declare question: Question
  declare selected: string[]
  declare locked: boolean

  constructor() {
    super()
    this.selected = []
    this.locked = false
  }

  private toggle(letter: string) {
    if (this.locked || !this.question) return
    const multi = this.question.type === 'multiple'
    const next = multi
      ? this.selected.includes(letter)
        ? this.selected.filter((l) => l !== letter)
        : [...this.selected, letter]
      : [letter]
    this.dispatchEvent(
      new CustomEvent('answer', {
        detail: next,
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    const q = this.question
    if (!q) return html``
    return html`
      <article class="card">
        <p class="qid">${q.id} · ${q.subdomain} · ${q.difficulty}</p>
        <h2>${q.question}</h2>
        <div class="opts" role="group" aria-label="Alternativas">
          ${q.options.map(
            (o, i) => html`
              <button
                type="button"
                class=${this.selected.includes(o.letter) ? 'opt sel' : 'opt'}
                ?disabled=${this.locked}
                @click=${() => this.toggle(o.letter)}
              >
                <span class="key">${i + 1} · ${o.letter}</span>
                <span>${o.text}</span>
              </button>
            `,
          )}
        </div>
      </article>
    `
  }

  static styles = css`
    .qid {
      color: var(--text-dim);
      font-size: 13px;
      margin: 0 0 8px;
    }
    h2 {
      font-size: 18px;
      margin: 0 0 16px;
    }
    .opts {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .opt {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      text-align: left;
      min-height: var(--tap-min);
      padding: 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface-raised);
      color: var(--text);
      cursor: pointer;
    }
    .opt.sel {
      border-color: var(--progress);
      outline: 2px solid var(--progress);
    }
    .key {
      font-family: var(--font-mono);
      color: var(--text-dim);
      white-space: nowrap;
    }
  `
}
customElements.define('question-card', QuestionCard)
