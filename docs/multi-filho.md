# Multi-filho — PasseiSimuladosTI (pai) → certificações (filhos)

> Receita para criar o 2º simulado (ex.: DP-900) reaproveitando tudo.

## Convenção

- 1 projeto Supabase para todos os filhos (free cobre).
- Tabelas com prefixo do filho: `az104_progress`, `az104_sessions` (+ plataforma `az104_attempts`, `az104_doubts`, `az104_activity_log`, `az104_study_suggestions`, `az104_admin_logs`, `az104_profiles`) → `dp900_*`.
- Colunas idênticas; RLS idêntico. Copie `supabase/migrations/001_*.sql` **e `002_*.sql`** (v7.0: profiles/role/email + administração via `az104_is_admin()`) trocando o prefixo.
- Login único: o mesmo usuário transita entre filhos; progresso isolado por prefixo.

## Novo filho no app (checklist)

1. Copiar migration com novo prefixo + rodar no SQL Editor.
2. Banco de questões em `data/<dominio>.json` + `meta.json` + `build-simulados.mts`.
3. Trocar `SIM_ID`, quotas §4 e textos da certificação (novo `PLAN.md` filho ou seção).
4. `SyncEngine` aceita prefixo como parâmetro (refator pontual quando o 2º filho nascer).

## Regras duras (valem para todos os filhos)

- Senha do Postgres **nunca** em chat, env ou repo. Vazou → rotaciona no dashboard.
- `.env.local` gitignored; `VITE_*` no deploy via GitHub Secrets.
- Offline-first sempre: IDB fonte de leitura, Supabase espelho.
