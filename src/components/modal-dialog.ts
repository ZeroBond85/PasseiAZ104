import { css, html, LitElement } from 'lit'
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

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.onCancel()
    if (e.key === 'Enter' && this.variant !== 'success') this.onConfirm()
  }

  render() {
    if (!this.open) return html``
    return html`
      <div class="backdrop" @click=${this.onCancel} aria-hidden="true" data-testid="modal-backdrop"></div>
      <dialog class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" @keydown=${this.handleKeydown} data-testid="modal-dialog" ?open=${this.open}>
        <header class="modal-header">
          <h3 id="modal-title">${this.title}</h3>
        </header>
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
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgb(0 0 0 / 0.5);
      z-index: 100;
      animation: fadeIn 0.15s ease;
    }
    .modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 101;
      min-width: 320px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      animation: slideUp 0.2s ease;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, -40%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
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
