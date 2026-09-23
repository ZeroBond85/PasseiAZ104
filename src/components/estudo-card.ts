import { css, html, LitElement } from 'lit'
import { getQuestionPool } from '../data/QuestionLoader.js'
import type { Question } from '../engine/question-schema.js'
import { cardStyles, controlStyles } from '../styles/shared.js'

export class EstudoCard extends LitElement {
  static properties = {
    questionId: { type: String },
    box: { type: Number },
    dueAt: { type: Number },
    question: { type: Object, state: true },
    showAnswer: { type: Boolean, state: true },
  }

  declare questionId: string
  declare box: number
  declare dueAt: number
  declare question: Question | null
  declare showAnswer: boolean

  async connectedCallback() {
    super.connectedCallback()
    const pool = await getQuestionPool()
    this.question = pool.find((q) => q.id === this.questionId) ?? null
  }

  private emitGrade(quality: number) {
    const ev = new CustomEvent<{ questionId: string; quality: number }>(
      'grade',
      {
        bubbles: true,
        composed: true,
        detail: { questionId: this.questionId, quality },
      },
    )
    this.dispatchEvent(ev)
    this.showAnswer = false
  }

  private renderAnswer() {
    const q = this.question
    if (!q) return html``
    const expected = new Set(q.correct)
    return html`
      <div class="answer" role="group" aria-label="Resposta correta">
        ${q.options.map(
          (opt) => html`
            <div
              class="opt ${expected.has(opt.letter) ? 'correct' : ''}"
              role="listitem"
            >
              <span class="letter">${opt.letter}</span>
              <span class="text">${opt.text}</span>
              ${
                expected.has(opt.letter)
                  ? html`<span class="badge correct" aria-hidden="true">✓</span>`
                  : ''
              }
            </div>
          `,
        )}
        <p class="exp">${q.explanation}</p>
      </div>
    `
  }

  private renderGradeButtons() {
    return html`
      <div class="grade-btns" role="group" aria-label="Como foi para você?">
        <button type="button" class="again" @click=${() => this.emitGrade(0)}>De novo</button>
        <button type="button" class="hard" @click=${() => this.emitGrade(1)}>Difícil</button>
        <button type="button" class="good" @click=${() => this.emitGrade(3)}>Bom</button>
        <button type="button" class="easy" @click=${() => this.emitGrade(4)}>Fácil</button>
      </div>
    `
  }

  render() {
    const q = this.question
    if (!q) return html`<div class="card loading">Carregando…</div>`
    const boxLabels = ['Nova', '1 dia', '2 dias', '4 dias', '8 dias', '16 dias']
    return html`
      <article class="card">
        <header class="card-header">
          <p class="qid">${q.id} · ${q.subdomain} · ${q.difficulty}</p>
          <span class="box-info">Caixa ${this.box} · Próxima: ${boxLabels[this.box]}</span>
        </header>
        <h3>${q.question}</h3>
        ${
          !this.showAnswer
            ? this.renderGradeButtons()
            : html`${this.renderAnswer()} ${this.renderGradeButtons()}`
        }
      </article>
    `
  }

  static styles = css`
    ${cardStyles}
    ${controlStyles}
    .card {
      margin-bottom: 12px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .qid {
      font-size: 12px;
      color: var(--text-dim);
      margin: 0;
    }
    .box-info {
      font-size: 11px;
      color: var(--brand);
      background: color-mix(in srgb, var(--brand) 15%, var(--surface));
      padding: 2px 8px;
      border-radius: 999px;
    }
    h3 {
      font-size: 16px;
      margin: 0 0 16px;
    }
    .answer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .answer .opt {
      display: flex;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-raised);
      margin-bottom: 6px;
    }
    .answer .opt.correct {
      border-color: var(--brand-green);
      background: color-mix(in srgb, var(--brand-green) 12%, var(--surface-raised));
    }
    .answer .letter {
      flex: 0 0 28px;
      font-weight: 700;
      font-size: 14px;
    }
    .answer .opt.correct .letter {
      color: var(--brand-green);
    }
    .answer .text {
      flex: 1;
      font-size: 14px;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
    }
    .badge.correct {
      background: var(--brand-green);
      color: var(--brand-green-contrast);
    }
    .exp {
      margin: 10px 0 0;
      font-size: 14px;
      color: var(--text);
    }
    .grade-btns {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .grade-btns button {
      flex: 1;
      min-width: 70px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-raised);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .grade-btns button:hover {
      border-color: var(--brand);
    }
    .grade-btns .again {
      border-color: var(--danger);
      color: var(--danger);
    }
    .grade-btns .again:hover {
      background: color-mix(in srgb, var(--danger) 12%, var(--surface-raised));
    }
    .grade-btns .hard {
      border-color: var(--warning);
      color: var(--warning);
    }
    .grade-btns .hard:hover {
      background: color-mix(in srgb, var(--warning) 12%, var(--surface-raised));
    }
    .grade-btns .good {
      border-color: var(--brand-green);
      color: var(--brand-green);
    }
    .grade-btns .good:hover {
      background: color-mix(in srgb, var(--brand-green) 12%, var(--surface-raised));
    }
    .grade-btns .easy {
      border-color: var(--brand);
      color: var(--brand);
    }
    .grade-btns .easy:hover {
      background: color-mix(in srgb, var(--brand) 12%, var(--surface-raised));
    }
    .empty {
      text-align: center;
      font-size: 18px;
      margin: 32px 0 8px;
    }
    .hint {
      text-align: center;
      color: var(--text-dim);
      font-size: 14px;
    }
    .center {
      text-align: center;
      padding: 40px 16px;
    }
    .estudo-header {
      margin-bottom: 16px;
    }
    .estudo-header h2 {
      margin: 0 0 4px;
    }
  `
}
customElements.define('estudo-card', EstudoCard)
