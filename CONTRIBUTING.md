# Contributing — PasseiAZ-104

> Leia `PLAN.md`, `REGRAS.md` e `AGENTS.md` antes de qualquer PR.

1. Tudo no WSL Debian; `.npmrc save-exact=true` (sem `^`/`~`).
2. Questão nova: checklist `docs/QUESTION-GUIDELINES.md` + `npm run validate` limpo.
3. Código: `npm run ci` verde local antes do push (lint+build+test+validate).
4. Arquivo `data/*.json` ≤200KB — estourou, particiona por subdomínio.
5. Falha no CI = RPR: teste que reproduz → regressão → `LESSONS.md`.
6. Nunca commite `.env`, segredos ou `VITE_*` com segredo.
