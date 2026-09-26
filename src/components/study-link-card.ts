import { css, html, LitElement } from 'lit'
import type { StudyLink } from '../study/study-hub.js'
import { btnStyles, cardStyles } from '../styles/shared.js'
import { labels as ptLabels } from './study-guide.js'

// Card de link de estudo (usado no hub e no pós-simulado).
// Props + evento `toggle-seen`; persistência fica no pai.
export class StudyLinkCard extends LitElement {
  static properties = {
    link: { type: Object },
    showSeen: { type: Boolean },
  }

  declare link: StudyLink
  declare showSeen: boolean

  constructor() {
    super()
    this.showSeen = true
    this.link = {
      topicId: '',
      domain: '',
      label: '',
      url: '',
      priority: 'medium',
      seen: false,
    }
  }

  private toggle() {
    this.dispatchEvent(
      new CustomEvent<string>('toggle-seen', {
        detail: this.link.topicId,
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    const l = this.link
    if (!l?.url) return html``
    // showSeen=false (ex.: pós-simulado sem perfil): só o link, sem toggle
    if (!this.showSeen) {
      return html`
        <article class="card link-card">
          <div class="row">
            <div>
              <strong>${l.label}</strong>
              <span class="meta">${ptLabels(l.domain)}</span>
            </div>
          </div>
          <div class="actions">
            <a
              class="btn btn-primary"
              href=${l.url}
              target="_blank"
              rel="noopener"
              >Abrir ↗</a
            >
          </div>
        </article>
      `
    }
    return html`
      <article class="card link-card ${l.seen ? 'seen' : ''}">
        <div class="row">
          <div>
            <strong>${l.label}</strong>
            <span class="meta">${ptLabels(l.domain)}</span>
          </div>
          <span class="tag">${l.priority === 'high' ? 'prioridade' : 'complementar'}</span>
        </div>
        <div class="actions">
          <a
            class="btn btn-primary"
            href=${l.url}
            target="_blank"
            rel="noopener"
            >Abrir ↗</a
          >
          <button type="button" class="btn" @click=${this.toggle}>
            ${l.seen ? '✓ Lido' : 'Marcar lido'}
          </button>
        </div>
      </article>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    .link-card {
      margin-bottom: 12px;
      padding: 14px 16px;
    }
    .link-card.seen {
      opacity: 0.75;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
    }
    .meta {
      display: block;
      font-size: 13px;
      color: var(--text-dim);
      margin-top: 2px;
    }
    .tag {
      font-size: 12px;
      color: var(--progress-ink);
      border: 1px solid var(--progress-ink);
      border-radius: 999px;
      padding: 1px 10px;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    a.btn {
      text-decoration: none;
    }
  `
}
customElements.define('study-link-card', StudyLinkCard)
