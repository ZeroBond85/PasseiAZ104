import { css, html, LitElement } from 'lit'

const KEY = 'az104-theme'

export class ThemeToggle extends LitElement {
  static properties = {
    theme: { type: String },
  }

  declare theme: string

  constructor() {
    super()
    this.theme = localStorage.getItem(KEY) ?? 'dark'
    this.apply()
  }

  private apply() {
    document.documentElement.dataset.theme = this.theme
  }

  private toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(KEY, this.theme)
    this.apply()
  }

  render() {
    const next = this.theme === 'dark' ? 'claro' : 'escuro'
    return html`
      <button type="button" @click=${this.toggle} aria-label="Alternar para tema ${next}">
        ${this.theme === 'dark' ? '☾' : '☀'}
      </button>
    `
  }

  static styles = css`
    button {
      background: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      min-width: var(--tap-min);
      cursor: pointer;
    }
  `
}
customElements.define('theme-toggle', ThemeToggle)
