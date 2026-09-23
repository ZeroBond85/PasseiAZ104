import { css, html, LitElement } from 'lit'
import { controlStyles } from '../styles/shared.js'

export class NavigatorGrid extends LitElement {
  static properties = {
    total: { type: Number },
    current: { type: Number },
    answered: { type: Array },
    flagged: { type: Array },
  }

  declare total: number
  declare current: number
  declare answered: number[]
  declare flagged: number[]

  constructor() {
    super()
    this.total = 0
    this.current = 0
    this.answered = []
    this.flagged = []
  }

  render() {
    return html`
      <div class="grid" role="navigation" aria-label="Questões">
        ${Array.from({ length: this.total }, (_, i) => {
          const n = i + 1
          const cls = [
            'cell',
            i === this.current ? 'cur' : '',
            this.answered.includes(i) ? 'ans' : '',
            this.flagged.includes(i) ? 'flag' : '',
          ].join(' ')
          return html`
            <button
              type="button"
              class=${cls}
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('goto', {
                    detail: i,
                    bubbles: true,
                    composed: true,
                  }),
                )}
              aria-label="Questão ${n}${this.answered.includes(i) ? ', respondida' : ', sem responder'}${this.flagged.includes(i) ? ', marcada' : ''}"
            >
              ${this.flagged.includes(i) ? '⚑' : ''}${n}
            </button>
          `
        })}
      </div>
    `
  }

  static styles = css`
    ${controlStyles}
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
      gap: 6px;
      padding: 12px 16px;
    }
    .cell {
      min-height: var(--tap-min);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-dim);
      cursor: pointer;
      font-size: 13px;
    }
    .cell.ans {
      background: var(--surface-raised);
      color: var(--text);
    }
    .cell.cur {
      border-color: var(--progress);
      outline: 2px solid var(--progress);
    }
    .cell.flag {
      color: var(--warning);
    }
  `
}
customElements.define('navigator-grid', NavigatorGrid)
