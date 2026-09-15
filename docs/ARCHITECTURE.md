# ARCHITECTURE.md — PasseiAZ-104

> Decisões (ADRs) + mapa do sistema. Fonte da verdade: `PLAN.md` v5.0.

## ADR-001 — QuestionLoader: fetch + precache SW + IDB primeiro

- Banco em `data/*.json` (particionado ≤200KB, §9). `public/data` é symlink → `../data`, seguido pelo Vite para `dist/data`.
- 1ª carga: `fetch()` valida (Zod) e semeia o IDB; seguintes: IDB primeiro (`seedVersion` em `meta.json` dispara reseed).
- Bundle nunca embute o banco.

## ADR-002 — Writer único de sessão

- `QuizEngine.snapshot()` grava tudo (respostas + `timerRemaining`) a cada 30s numa transação IDB.
- `TimerEngine` só expõe `remaining`; nunca grava (sem corrida de records).

## ADR-003 — Scoring determinístico

- `W={easy:15, medium:20, hard:25}`; `maxRaw` por dificuldade; múltipla `w×(k/n)`, erro zera; `round(raw/max×1000)`; corte 700; `weakAreas<70%`.

## ADR-004 — Seleção determinística

- Fisher-Yates + mulberry32 (seed do simulado); quotas por domínio via largest-remainder; exclui últimas 100/domínio; `usageCount` ASC.

## Mapa

- `src/engine/`: Quiz, Timer, Scoring, Leitner (1/2/4/8/16d, cap 50), Selector, schemas Zod, Explanation (só lê).
- `src/sync/`: IDB (sessions/progress/meta/questions) + tipos.
- `src/data/`: QuestionLoader (ADR-001).
- `src/components/`: app-shell, question-card, timer-bar, navigator-grid, review-card, stats-dashboard, theme-toggle.
- `scripts/`: validate (Zod+FK+dedup FNV-1a), generate (IA + checkpoint), check-model (probe), build-simulados (seeded), import-community (quarentena).
