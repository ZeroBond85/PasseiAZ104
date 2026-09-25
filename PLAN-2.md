# PLAN 2 — v7.1: Fidelidade ao exame + UX de estudo

> Mapa de execução sobre a **v7.0 (PLAN.md, fonte da verdade)**. Verificação feita em 23/set: bugs e gaps
> cruzados com código real. Skill: test-driven-execution. Conceito: red → green por fase.

## Verdict da auditoria (base deste plano)

| # | Alegação | Verdict | Prova |
|---|---|---|---|
| 2.1 | Build quebrado (tsc) | ✅ JÁ FIX em `9713aaf` | `app-shell.ts:43,73-90` |
| 2.2 | Simulado monodomínio | ✅ BUG REAL — saí 100% Compute | `app-shell.ts:283-291` (cota `{[pool[0]?.domain]:50}`; `getAll` key order → pool[0]=`az104-co-001`) |
| 2.2b | 10 oficiais órfãos | ✅ BUG REAL — balanceados perfeitamente, nunca carregados | `data/simulados.json` (ig12·st9·co12·rv10·mo7, 371 ids únicos) |
| 2.3 | Botão "Resolver dúvida" morto | ✅ BUG REAL — Lit `.*=` põe propriedade, `dataset.qid` lê atributo | `progress-panel.ts:139,183` |
| 2.4 | Teclado: substitui multi + sem letras A–D | ✅ BUG PARCIAL — E/F **não existe** (maxOptions=4 medido) | `app-shell.ts:259-271`; schema permite 6, dados máx 4 |
| 3.1 | Navigator 50 botões esmaga mobile | ✅ REAL — 44px×7 col ≈ 340px a 390px | `navigator-grid.ts:62` |
| 3.2 | Revisão espaçada órfã | ✅ REAL — `getDue/gradeCard` existem, UI não usa | `LeitnerEngine.ts`; `renderReview` exige `result` |
| 3.3 | Review-card sem alternativas | ✅ REAL | `review-card.ts:44-77` |
| 3.4 | Login obrigatório sem offline | ✅ REAL — só `?local=1` (e2e) | `app-shell.ts:216-224` |
| 3.5 | Sem catálogo/treino por domínio | ✅ REAL — `SimuladoSchema(mode seed|fixed)` órfão | `question-schema.ts:120-141`; `app-shell.ts renderHome` |
| 3.6 | `confirm()` nativo + vitória mediana | ✅ REAL | `app-shell.ts:366` |

## Estrutura

- **FASE A (P0):** A1 catálogo+quotas+sessão por sim · A2 dúvida fix · A3 teclado toggle+letras
- **FASE B (P1):** B1 review-card com opções · B2 navigator colapsável mobile · B3 sessão Leitner · (B3.5 cases em bloco contíguo)
- **FASE C (P2):** C1 modo local/offline · C2 treino por domínio + pausa (só treino)
- **FASE D (P3):** D1 modal submissão · D2 card vitória · D3 polish visual

## Garantias por fase

`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build` (0 erro) · `npm run budget`
(JS ≤140KB gz) · `npx playwright test` (e2e + axe 0) · screenshots 1526/390 ·
commit+push+fase verde nos **4 workflows** (ci/perf/deploy/security). Docs: `LOG.md` por fase,
`LESSONS.md` se descoberta. Nunca deixar `scripts/_tmp-*` antes do push.

## Status

- [x] FASE A — P0 (bugs de fidelidade ao exame)
- [x] FASE B — P1 (UX de estudo)
- [x] FASE C — P2 (entrada + offline + treino)
- [x] FASE D — P3 (polimento)