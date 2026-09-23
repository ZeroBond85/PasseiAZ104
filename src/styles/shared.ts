// Primitivos visuais compartilhados (src/styles/shared.ts).
// Por que existe: CSS global NÃO atravessa shadow DOM (Lição 2026-09-15) —
// cada componente Lit compõe estes blocos no próprio `static styles`.
// Fonte da verdade visual: variables.css (tokens) + components.css (layout fora do shadow).
import { css } from 'lit'

export const cardStyles = css`
  .card {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  }
`

export const btnStyles = css`
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: var(--tap-min);
    padding: 0 18px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background-color: var(--surface-raised);
    color: var(--text);
    font: inherit;
    cursor: pointer;
  }
  .btn-primary {
    background-color: var(--btn-primary-bg);
    border-color: transparent;
    color: #fff;
  }
  .btn-primary:hover {
    filter: brightness(1.1);
  }
`

export const srOnlyStyles = css`
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`

// Controles herdarem a tipografia: a UA impõe `font: 400 13px Arial` em
// button/input/select, e o CSS global não atravessa shadow DOM — sem isto,
// cada botão cru dentro de componente cai em Arial.
export const controlStyles = css`
  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }
`
