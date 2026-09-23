import { css, html, LitElement } from 'lit'
import { controlStyles } from '../styles/shared.js'
import { signOut } from '../sync/auth.js'
import { isSyncEnabled, supabase } from '../sync/supabase.js'

export class UserMenu extends LitElement {
  static properties = {
    email: { type: String },
  }

  declare email: string

  constructor() {
    super()
    this.email = ''
    void this.load()
  }

  private async load() {
    if (!isSyncEnabled() || !supabase) return
    const { data } = await supabase.auth.getUser()
    this.email = data.user?.email ?? ''
  }

  private async logout() {
    await signOut()
    this.dispatchEvent(
      new CustomEvent('logout', { bubbles: true, composed: true }),
    )
  }

  render() {
    if (!isSyncEnabled() || !this.email) return html``
    const initial = (this.email[0] ?? '?').toUpperCase()
    return html`
      <div class="user" title=${this.email}>
        <span class="avatar" aria-hidden="true">${initial}</span>
        <button type="button" @click=${this.logout} aria-label="Sair (${this.email})">Sair</button>
      </div>
    `
  }

  static styles = css`
    ${controlStyles}
    .user {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--btn-primary-bg);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }
    button {
      background: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-dim);
      cursor: pointer;
      min-height: var(--tap-min);
      padding: 0 12px;
    }
  `
}
customElements.define('user-menu', UserMenu)
