import { css, html, LitElement } from 'lit'

export class TimerBar extends LitElement {
  static properties = {
    remaining: { type: Number },
    total: { type: Number },
    saved: { type: Boolean },
  }

  declare remaining: number
  declare total: number
  declare saved: boolean

  constructor() {
    super()
    this.remaining = 0
    this.total = 1
    this.saved = false
  }

  private fmt(s: number) {
    const m = Math.floor(Math.max(0, s) / 60)
    const r = Math.max(0, s) % 60
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  }

  render() {
    const pct = Math.max(0, Math.min(100, (this.remaining / this.total) * 100))
    return html`
      <section class="timer-sticky" aria-label="Tempo restante">
        <div class="row">
          <strong aria-live="polite">${this.fmt(this.remaining)}</strong>
          ${this.saved ? html`<span class="saved">progresso salvo ✓</span>` : html``}
        </div>
        <div
          class="bar"
          role="progressbar"
          aria-label="Tempo restante de prova"
          aria-valuenow=${pct}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="fill" style="width:${pct}%"></div>
        </div>
      </section>
    `
  }

  static styles = css`
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px 6px;
    }
    strong {
      font-family: var(--font-mono);
      font-size: var(--fs-lg);
      letter-spacing: 0.02em;
    }
    .saved {
      color: var(--brand-green);
      font-size: var(--fs-xs);
    }
    .bar {
      height: 6px;
      background: var(--surface-raised);
      margin: 0 16px 8px;
      border-radius: 3px;
    }
    .fill {
      height: 100%;
      background: var(--progress);
      border-radius: 3px;
    }
  `
}
customElements.define('timer-bar', TimerBar)
