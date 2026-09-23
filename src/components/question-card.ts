import { css, html, LitElement } from 'lit'
import type { Question } from '../engine/question-schema.js'
import { cardStyles, controlStyles } from '../styles/shared.js'

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
        <div
          class="opts"
          role=${q.type === 'multiple' ? 'group' : 'radiogroup'}
          aria-label="Alternativas (teclas 1 a ${q.options.length})"
        >
          ${q.options.map(
            (o, i) => html`
              <button
                type="button"
                class=${this.selected.includes(o.letter) ? 'opt sel' : 'opt'}
                ?disabled=${this.locked}
                role=${q.type === 'multiple' ? 'checkbox' : 'radio'}
                aria-checked=${this.selected.includes(o.letter) ? 'true' : 'false'}
                @click=${() => this.toggle(o.letter)}
              >
                <span class="key" aria-hidden="true">${i + 1} · ${o.letter}</span>
                <span>${o.text}</span>
              </button>
            `,
          )}
        </div>
      </article>
    `
  }

  static styles = css`
    ${cardStyles}
    ${controlStyles}
    .qid {
      color: var(--text-dim);
      font-size: var(--fs-xs);
      letter-spacing: var(--tracking-wide);
      text-transform: uppercase;
      margin: 0 0 10px;
    }
    h2 {
      font-size: var(--fs-xl);
      font-weight: 650;
      line-height: 1.45;
      margin: 0 0 18px;
    }
    .opts {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .opt {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      text-align: left;
      min-height: 48px;
      padding: 13px 14px;
      font-size: var(--fs-base);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface-raised);
      color: var(--text);
      cursor: pointer;
      line-height: 1.55;
    }
    @media (prefers-reduced-motion: no-preference) {
      .opt {
        transition:
          border-color 0.12s ease,
          box-shadow 0.12s ease,
          transform 0.12s ease;
      }
    }
    .opt:hover {
      border-color: var(--progress);
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.3);
    }
    .opt:active {
      transform: translateY(1px);
    }
    .opt.sel {
      border-color: var(--progress);
      outline: 2px solid var(--progress);
      background: rgb(59 130 246 / 0.12);
    }
    .opt:disabled {
      cursor: default;
    }
    .key {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      white-space: nowrap;
    }
  `
}
customElements.define('question-card', QuestionCard)
