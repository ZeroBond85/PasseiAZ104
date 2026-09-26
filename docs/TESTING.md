# TESTING.md — PasseiAZ-104

> Pirâmide: 67 unit (Vitest) + 16 e2e (Playwright + axe). Contagem sincronizada
> no README por `test:count` (fail-closed no `ci`).

## Unit (Vitest, `tests/unit/` + `tests/integration/`)

- Engines puros e determinísticos: scoring, selector (quotas + Fisher-Yates seedado),
  keyboard, Leitner, IRT (gate n≥30), heatmap/distrator, drill scoring, study-hub,
  treino-controller, question-controller, schema Zod, simulados, pins, logger, studyguide.
- Integração: `s2-ig.test.ts` (50q fim-a-fim + score 1000 + review).
- Regra: engine novo entra com teste; mock de IDB/fetch via `vi.mock` + `vi.stubGlobal`.

## E2E (Playwright, `tests/e2e/`, contra `preview` em :4173)

- quiz (responde/flag/finaliza/revisa) · gate (tema/timer/score) · offline (IDB + SW cache) ·
  login (gate + validação) · catalog (oficiais + dinâmico 5 domínios) · progress
  (attempt→stats/streak/dúvida, admin oculto) · treino (modal info, zero dialog nativo) ·
  estudo (guia + hub) · overflow (scrollWidth ≤390px) · axe home/quiz/progresso (0 violações).
- `?local=1` desliga o gate (test-only, nunca em produção).
- `pageerror` coletado em todo spec (`expect(errors).toEqual([])`).

## RPR — falha vira regressão (§0.11)

1. Teste que reproduz → 2. regressão permanente → 3. `LESSONS.md`.
Re-rodar "pra ver" é proibido (exceções: flake de rede, outage externo, workflow-only).

## Visual manual (sem automação — decisão consciente)

- Screenshots desktop 1526 + mobile 390 via spec temporário `tests/e2e/_*.spec.ts`
  (criar → rodar → **deletar no mesmo comando**), lidos antes de commit visual.
- Visual regression no CI foi avaliado e cortado (flaky); `overflow.spec.ts` (assert
  numérico) cobre a classe de bug que screenshot pegaria.

## Mutation trimestral (manual)

- `npx stryker` restrito a `ScoringEngine`/`QuestionSelector`/`LeitnerEngine`, meta ≥80%.
- Fora do CI (lento); roda manual 1×/trimestre, resultado em `.agent/audits/`.

## Comandos

```bash
npm run test          # unit + integração
npx playwright test   # e2e (precisa build: preview serve dist/)
npm run ci            # lint + build + test + test:count + validate + meta:check + migration:check
```
