import { css, html, LitElement } from 'lit'

const TABS = [
  { id: 'home', label: 'Início' },
  { id: 'quiz', label: 'Simulado' },
  { id: 'review', label: 'Revisão' },
  { id: 'stats', label: 'Stats' },
] as const

type TabId = (typeof TABS)[number]['id']

export class AppShell extends LitElement {
  static properties = {
    tab: { type: String },
  }

  declare tab: TabId

  constructor() {
    super()
    this.tab = 'home'
  }

  private select(tab: TabId) {
    this.tab = tab
  }

  render() {
    return html`
      <header>
        <img src="icons/source.png" alt="Passei AZ-104" width="32" height="32" />
        <strong>Passei AZ-104</strong>
        <span class="spacer"></span>
        <theme-toggle></theme-toggle>
      </header>
      <main>
        <section class="card">
          <h1>${TABS.find((t) => t.id === this.tab)?.label}</h1>
          <p>Motor de questões entra em S2. Shell + tema: S1-D4.</p>
        </section>
      </main>
      <nav aria-label="Navegação principal">
        ${TABS.map(
          (t) => html`
            <button
              type="button"
              aria-current=${this.tab === t.id ? 'page' : 'false'}
              @click=${() => this.select(t.id)}
            >
              ${t.label}
            </button>
          `,
        )}
      </nav>
    `
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background-color: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    header img {
      width: 32px;
      height: 32px;
    }
    .spacer {
      flex: 1;
    }
    main {
      flex: 1;
      padding: 16px;
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
    nav {
      display: flex;
      position: sticky;
      bottom: 0;
      background-color: var(--surface);
      border-top: 1px solid var(--border);
      padding-bottom: env(safe-area-inset-bottom);
    }
    nav button {
      flex: 1;
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
    }
    nav button[aria-current="page"] {
      color: var(--progress);
    }
    @media (min-width: 768px) {
      :host {
        flex-direction: column;
      }
      nav {
        position: static;
        order: -1;
        border-top: none;
        border-bottom: 1px solid var(--border);
        justify-content: center;
      }
      nav button {
        flex: 0 1 auto;
        padding: 0 24px;
      }
    }
  `
}
customElements.define('app-shell', AppShell)
