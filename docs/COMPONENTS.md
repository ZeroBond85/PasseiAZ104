# COMPONENTS.md — PasseiAZ-104

> Catálogo dos componentes Lit (`src/components/`): props, eventos, estados e a11y.
> Todos usam Shadow DOM (estilos via `static styles` + primitivos `src/styles/shared.ts`:
> `cardStyles`, `btnStyles`, `controlStyles`, `srOnlyStyles`). Regra travada: só componha
> o bloco que o template realmente usa (LESSONS 2026-09-25).

## app-shell — orquestrador

- Props: `tab`, `userId`, `authReady`, `syncing`, `syncFail`, `isAdmin`, `localMode`,
  `finishConfirmOpen`, `victoryOpen`, `treinoResultOpen/treinoResultMsg`, `seedError`, `online`, `bankLine`.
- Delega quiz/treino/sync p/ controllers (`quizCtl`, `treinoCtl`, `syncCtl`); renderiza abas + modais.
- Abas: Início · Simulado · Treino · Estudo · Revisão · Notas · Progresso (+Admin se `isAdmin`).

## login-screen — gate de entrada

- Props: `email`, `sending`, `sent`, `error`, `coolUntil` (cooldown 60s anti rate-limit 429).
- Emite `local-mode` (modo sem conta, IDB only). `sr-only` labels + `aria-describedby` + `role="status/alert"`.

## question-card — questão (reuso quiz + treino)

- Props: `question`, `selected: string[]`. Emite `answer` (letras).
- `radiogroup` (single/yes-no) ou `group` (multiple/case) + `aria-checked`; teclado 1–4/A–D só no quiz.

## timer-bar — cronômetro

- Props: `remaining`, `totalSeconds`, `saved` (flash "progresso salvo ✓"). Sticky, mono tabular.

## navigator-grid — mapa de 50 questões

- Props: `total`, `current`, `answered: number[]`, `flagged: number[]`. Emite `goto` (índice).
- Colapsável ≤520px (`aria-expanded`); ✅/⚑/○ por botão.

## review-card — revisão pós-simulado

- Props: `question`, `given: string[]`. Alternativas com ✓ verde (correta) / ✗ vermelho (sua errada).
- 5 tags de erro (`concept_gap`, `silly_mistake`, `misread`, `trap`, `timeout`) → evento `tag-selected`
  (alimenta `attempts.error_tags` + `az104_doubts`).

## stats-dashboard — placar

- Prop: `result` (`ScoreResult`). Score /1000 + APROVADO/REPROVADO + barras por domínio + fracos <70%.

## modal-dialog — confirmação/sucesso/info (substitui `confirm()`/`alert()` nativos)

- Props: `open`, `title`, `message`, `confirmText`, `cancelText`, `variant: 'confirm'|'success'|'info'`.
- Emite `confirm`/`cancel`. `role="dialog"`, focus trap, ESC cancela, Enter confirma.
- Usos: finalizar simulado (confirm) · vitória (success) · fim de treino (info).

## catalog-screen — catálogo de simulados

- Emite `start` (`SimuladoSpec`). Dinâmico primeiro (★ Recomendado) + 10 fixos com última atividade.
- 10 oficiais `fixed` 50q/100min + dinâmico `seed` (quotas por `domainQuotas`).

## estudo-card — revisão Leitner

- Props: `questionId`, `box`, `dueAt`. Emite `grade` (quality 0/1/3/4).
- Autoavaliação Again/Hard/Good/Easy → `gradeCard` → `saveProgress`.

## study-guide — "O que estudar" pós-simulado

- Props: `guide` (`StudyGuideResult`), `questions`, `links` (`StudyLinkRef[]`, carregado async).
- Domínios com barras + por tipo/dificuldade + tips + seção MS Learn (`study-link-card` sem toggle).

## study-link-card — link de estudo

- Props: `link` (`StudyLink`), `showSeen` (default true). Emite `toggle-seen` (topicId).
- Externo sempre `target="_blank" rel="noopener"`.

## study-hub-panel — "O que estudar agora" (aba Estudo)

- Prop: `userId`. Auto-carrega `generateStudyPlan`; "Marcar lido" persiste no perfil. Emite `start-drill`.
- Atrás de flag `study-hub` (`src/config/flags.ts`).

## progress-panel — progresso + heatmap

- Auto-carrega: histórico, streak, weak-map, dúvidas CRUD, painel §12 (`readiness`),
  heatmap "Onde você mais erra" (subdomínio×tipo×dificuldade + tendência ↗→↘).

## admin-panel — visível só p/ `role='admin'`

- KPIs, usuários (role com confirmação em 2 cliques, sparkline SVG), analytics por questão
  (distrator + tags), fila `needsReview` (leitura; aprovação via PR), fila dúvidas, CSV, auditoria.
- RLS é a fronteira — a aba é só UX (ADR-006).

## user-menu / theme-toggle

- `user-menu`: email + selo "Admin" + Sair (emite `logout`). `theme-toggle`: claro/escuro (opt-in).
