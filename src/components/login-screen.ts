import { css, html, LitElement } from 'lit'
import { btnStyles, cardStyles, srOnlyStyles } from '../styles/shared.js'
import { signInWithEmail } from '../sync/auth.js'
import { isSyncEnabled } from '../sync/supabase.js'

export class LoginScreen extends LitElement {
  static properties = {
    email: { type: String },
    sending: { type: Boolean },
    sent: { type: Boolean },
    error: { type: String },
  }

  declare email: string
  declare sending: boolean
  declare sent: boolean
  declare error: string

  constructor() {
    super()
    this.email = ''
    this.sending = false
    this.sent = false
    this.error = ''
  }

  private async submit(e: Event) {
    e.preventDefault()
    if (!this.email.includes('@')) {
      this.error = 'Digite um e-mail válido.'
      return
    }
    this.sending = true
    this.error = ''
    try {
      await signInWithEmail(this.email.trim())
      this.sent = true
    } catch (err) {
      this.error =
        err instanceof Error ? err.message : 'Falha ao enviar o link.'
    } finally {
      this.sending = false
    }
  }

  render() {
    return html`
      <main class="login">
        <section class="card login-card">
          <img
            class="logo"
            src="icons/source-logo.webp"
            alt=""
            width="320"
            height="203"
          />
          <h1 class="sr-only">Passei AZ-104</h1>
          <p class="sub">
            Do seu jeito, até a aprovação: simule a prova real, revise o que
            errou e estude no seu ritmo — em qualquer dispositivo.
          </p>
          ${
            this.sent
              ? html`<p class="ok" role="status">Link enviado! Abra o e-mail e clique para entrar. ✅</p>`
              : html`
                <form @submit=${this.submit} novalidate>
                  <label class="sr-only" for="email">E-mail</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="voce@email.com"
                    autocomplete="email"
                    .value=${this.email}
                    @input=${(e: Event) => {
                      this.email = (e.target as HTMLInputElement).value
                    }}
                    ?disabled=${this.sending}
                    aria-describedby="email-hint"
                  />
                  <button type="submit" class="btn btn-primary" ?disabled=${this.sending}>
                    ${this.sending ? 'Enviando…' : 'Entrar com link mágico'}
                  </button>
                  <p id="email-hint" class="hint">
                    Você receberá um link de acesso no e-mail.
                  </p>
                </form>
              `
          }
          ${this.error ? html`<p class="err" role="alert">${this.error}</p>` : ''}
          ${
            isSyncEnabled()
              ? ''
              : html`<p class="warn">Sync desativado neste ambiente (sem Supabase). O app funciona 100% local.</p>`
          }
        </section>
      </main>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    ${srOnlyStyles}
    .login {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: 16px;
      box-sizing: border-box;
    }
    .login-card {
      text-align: center;
      max-width: 420px;
      width: 100%;
      padding: 32px 24px 28px;
    }
    .logo {
      width: min(280px, 72%);
      height: auto;
      display: block;
      margin: 0 auto 20px;
    }
    h1 {
      margin: 12px 0 4px;
    }
    .sub {
      color: var(--text-dim);
      margin: 0 0 24px;
      line-height: 1.55;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    input {
      min-height: var(--tap-min);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface-raised);
      color: var(--text);
      padding: 0 14px;
      font: inherit;
    }
    .hint {
      margin: 2px 0 0;
      font-size: 13px;
      color: var(--text-dim);
    }
    .ok {
      color: var(--brand-green);
    }
    .err {
      color: var(--danger);
    }
    .warn {
      color: var(--warning);
      font-size: 13px;
    }
  `
}
customElements.define('login-screen', LoginScreen)
