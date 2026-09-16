# AGENTS.md — PasseiAZ-104

> Instruções operacionais para agentes. Fonte da verdade: `PLAN.md` v7.0.

## Estado

- `DATA_PROVA=TBD` — agendar só nas 3 condições do §12 (média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10).
- Fase atual: **plataforma v7.0 no ar (QA local ✅) — migration 002 pendente de aplicação manual no Supabase +
  validação com 2 usuários; depois, fase de ESTUDO**. Ver `LOG.md`.

## Gatilhos

| Sinal | Ação |
|---|---|
| Arquivo `data/*.json` > 200KB | Particionar por subdomínio (§9 SIZE GUARD) |
| `needsReview` > 50 | Pausar `generate`, focar review (§4 WIP) |
| Falha no CI | RPR: teste que reproduz → regressão → `LESSONS.md` (§0.11). Re-rodar "pra ver" é proibido |
| Novo modelo Gemini / EOL anunciado | Atualizar lista §7 + `meta.json.generatedWith`; validado por `check-model.mjs` |
| Questão sem `source`/`sourceUrl` | Bloquear commit (Zod §3) |
| `npm install <x>` sem pin | Proibido — `.npmrc save-exact=true` (§1) |
| Senha/chave em chat ou arquivo commitado | Senha Postgres: rotacionar + nunca repetir. Anon Supabase: só `.env.local` (gitignored) e GitHub Secrets |
| Migration 002 não aplicada no Supabase | Aba Admin fica oculta (fail-closed por RLS) — não dar "false green": validar admin com 2 usuários antes de assumir |
| Key path de store IDB contendo `:` | Bloqueado — IndexedDB não aceita (usar campo `key` explícito, LESSONS 16/set) |

## Skills ativas

`test-driven-execution` · `code-review` · `doc-sync` · `dependency-audit` · `frontend-design` (neutralizada) · repo: `accessibility`.
