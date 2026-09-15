# ARCHITECTURE.md — PasseiAZ-104

> Decisões (ADRs) + mapa do sistema. Fonte da verdade: `PLAN.md` v6.0.

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

## ADR-005 — Backend espelho (v6.0, Supabase free)

- IDB = fonte de leitura (offline-first intacto); Supabase = espelho (`az104_progress`, `az104_sessions`).
- Auth magic link; gate sem sessão → `login-screen`. RLS `auth.uid() = user_id` em tudo.
- Merge: last-write-wins por `updatedAt`; `box` usa `max()` (Leitner nunca regride).
- Build sem env = modo 100% local; deploy usa GitHub Secrets. `?local=1` = bypass só p/ e2e.

## Mapa

- `src/engine/`: Quiz, Timer, Scoring, Leitner (1/2/4/8/16d, cap 50), Selector, `question-schema.ts` (Zod §3), Explanation (só lê).
- `src/sync/`: IDB (sessions/progress/meta/questions) + tipos + `supabase.ts` + `auth.ts` + `SyncEngine.ts`.
- `src/data/`: QuestionLoader (ADR-001; 8 arquivos particionados).
- `src/components/`: app-shell (gate+header 56), login-screen (logo 180), user-menu, question-card (radiogroup), timer-bar, navigator-grid, review-card, stats-dashboard, theme-toggle.
- `src/styles/`: tokens OKLCH + escala fluida (variables), global, components, dark.
- `scripts/`: validate (Zod+FK+dedup FNV-1a), generate (IA + checkpoint), check-model (probe), build-simulados (seeded), import-community (quarentena).
- `supabase/migrations/`: 001 (tabelas + RLS + índices).
