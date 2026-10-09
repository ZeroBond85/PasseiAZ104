import { css, html, LitElement } from 'lit'
import { query } from 'lit/decorators.js'
import { btnStyles, cardStyles, controlStyles } from '../styles/shared.js'

export class ModalDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    title: { type: String },
    message: { type: String },
    confirmText: { type: String },
    cancelText: { type: String },
    variant: { type: String }, // 'confirm' | 'success' | 'info'
  }

  declare open: boolean
  declare title: string
  declare message: string
  declare confirmText: string
  declare cancelText: string
  declare variant: 'confirm' | 'success' | 'info'

  @query('dialog')
  private dialog?: HTMLDialogElement
  private previouslyFocused: Element | null = null

  constructor() {
    super()
    this.open = false
    this.title = ''
    this.message = ''
    this.confirmText = 'Confirmar'
    this.cancelText = 'Cancelar'
    this.variant = 'confirm'
  }

  private onConfirm() {
    this.dispatchEvent(
      new CustomEvent('confirm', {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    )
    this.close()
  }

  private onCancel() {
    this.dispatchEvent(
      new CustomEvent('cancel', {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    )
    this.close()
  }

  private close() {
    this.open = false
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties)
    if (!changedProperties.has('open')) return
    if (this.open) {
      this.previouslyFocused = document.activeElement
      void this.updateComplete.then(() => {
        if (this.dialog && !this.dialog.open) this.dialog.showModal()
        this.dialog
          ?.querySelector<HTMLButtonElement>('button:not([disabled])')
          ?.focus()
      })
    } else if (this.previouslyFocused instanceof HTMLElement) {
      this.previouslyFocused.focus()
      this.previouslyFocused = null
    }
  }

  private handleNativeCancel(event: Event) {
    // O Escape nativo fecharia o <dialog> sem avisar o app-shell.
    event.preventDefault()
    this.onCancel()
  }

  private handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [
      ...(this.dialog?.querySelectorAll<HTMLButtonElement>(
        'button:not([disabled])',
      ) ?? []),
    ]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  render() {
    if (!this.open) return html``
    return html`
      <dialog
        class="modal"
        aria-labelledby="modal-title"
        @cancel=${this.handleNativeCancel}
        @keydown=${this.handleKeydown}
        data-testid="modal-dialog"
      >
        <div class="modal-header">
          <h3 id="modal-title">${this.title}</h3>
        </div>
        <div class="modal-body">
          <p>${this.message}</p>
          ${
            this.variant === 'success'
              ? html`<div class="celebration" aria-hidden="true">🎉</div>`
              : ''
          }
        </div>
        <footer class="modal-footer">
          ${
            this.variant === 'success' || this.variant === 'info'
              ? html`
                <button type="button" class="btn btn-primary" @click=${this.onConfirm} data-testid="modal-confirm">
                  ${this.confirmText}
                </button>
              `
              : html`
                <button type="button" class="btn btn-secondary" @click=${this.onCancel} data-testid="modal-cancel">
                  ${this.cancelText}
                </button>
                <button type="button" class="btn btn-primary" @click=${this.onConfirm} data-testid="modal-confirm">
                  ${this.confirmText}
                </button>
              `
          }
        </footer>
      </dialog>
    `
  }

  static styles = css`
    ${cardStyles}
    ${btnStyles}
    ${controlStyles}
    .modal {
      margin: auto;
      min-width: 320px;
      max-width: min(480px, 90vw);
      max-height: 80vh;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--text);
      padding: 0;
      animation: slideUp 0.2s ease;
    }
    .modal::backdrop {
      background: rgb(0 0 0 / 0.5);
    }
    @keyframes slideUp {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    .modal-header {
      padding: 16px 20px 0;
      margin: 0;
    }
    .modal-header h3 {
      margin: 0;
      font-size: 18px;
    }
    .modal-body {
      padding: 16px 20px;
      text-align: center;
      max-height: 60vh;
      overflow-y: auto;
    }
    .modal-body p {
      margin: 0 0 12px;
      font-size: 15px;
      line-height: 1.5;
    }
    .celebration {
      font-size: 48px;
      line-height: 1;
      margin-bottom: 8px;
      animation: bounce 0.6s ease;
    }
    @keyframes bounce {
      0%,
      100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.2);
      }
    }
    .modal-footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 0 20px 20px;
      flex-wrap: wrap;
    }
    .modal-footer .btn {
      min-width: 100px;
    }
  `
}
customElements.define('modal-dialog', ModalDialog)
