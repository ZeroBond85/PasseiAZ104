import { css, html, LitElement } from 'lit'
import { controlStyles } from '../styles/shared.js'

export class NavigatorGrid extends LitElement {
  static properties = {
    total: { type: Number },
    current: { type: Number },
    answered: { type: Array },
    flagged: { type: Array },
    collapsed: { type: Boolean, reflect: true },
  }

  declare total: number
  declare current: number
  declare answered: number[]
  declare flagged: number[]
  declare collapsed: boolean

  constructor() {
    super()
    this.total = 0
    this.current = 0
    this.answered = []
    this.flagged = []
    this.collapsed = false
  }

  private handleResize = () => {
    this.collapsed = window.innerWidth <= 520
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('resize', this.handleResize)
    this.handleResize()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('resize', this.handleResize)
  }

  private toggleCollapsed() {
    this.collapsed = !this.collapsed
  }

  render() {
    return html`
      <div class="navigator">
        <button
          type="button"
          class="toggle"
          aria-expanded=${this.collapsed ? 'false' : 'true'}
          aria-controls="nav-grid"
          aria-label=${this.collapsed ? 'Expandir navegador de questões' : 'Colapsar navegador de questões'}
          @click=${this.toggleCollapsed}
          ?hidden=${window.innerWidth > 520}
        >
          ${this.collapsed ? '▼' : '▲'} Questões (${this.answered.length}/${this.total})
        </button>
        <div
          id="nav-grid"
          class="grid ${this.collapsed ? 'collapsed' : ''}"
          role="navigation"
          aria-label="Questões"
          ?hidden=${this.collapsed && window.innerWidth <= 520}
        >
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
      </div>
    `
  }

  static styles = css`
    ${controlStyles}
    .navigator {
      display: flex;
      flex-direction: column;
    }
    .toggle {
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-raised);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: none;
    }
    @media (max-width: 520px) {
      .toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
      gap: 6px;
      padding: 12px 16px;
    }
    @media (max-width: 520px) {
      .grid.collapsed {
        display: none;
      }
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
