# AGENTS.md — PasseiAZ-104

> Instruções operacionais para agentes. Fonte da verdade: `PLAN.md` v7.0.

## Estado

- `DATA_PROVA=TBD` — agendar só nas 3 condições do §12 (média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10).
- Fase atual: **plataforma v7.0 no ar (QA local ✅) — migration 002 aplicada + probe RLS validado (0 falhas) + validada 2 usuários (admin vê / user não vê) + gate de segredo no pre-push/ci + G16 fechado (55 SLA→outline, validate 1000/0) + v0.1.0 publicada; R3 completo (0 sem sourceUrl, 100% auditado); fase de ESTUDO**. Ver `LOG.md`.

## Ambiente: rodar dentro do WSL

- O projeto vive no WSL: `~/projects/PasseiSimuladosTI/AZ104`. Se a sessão abrir
  num shell Windows/git-bash, rode via `wsl.exe -e bash -lc 'cd ~/projects/PasseiSimuladosTI/AZ104 && <cmd>'`.
- `node_modules` tem binário nativo **linux-x64** (`@biomejs/cli-linux-x64`).
  `Exec format error` = "binário Linux chamado pelo shell Windows", **não** "falta
  binário win32". **Nunca** instalar `@*-win32-x64` aqui: o `.exe` não roda no
  Linux e o `npm` ainda falha nos symlinks de `.bin` do share UNC (`EISDIR`).

## Regra de CI: até verde, sem erro e sem warning

**Bloqueante e sem exceção.** Vale acima de qualquer "está pronto", "funciona na
minha máquina" ou "o erro é pré-existente".

- **Um gate só fecha com o comando em código de saída 0.**
- **Warning é falha.** `27 errors, 11 warnings, 3 infos` **não** está verde.
- **Erro e warning pré-existentes se corrigem** — não se anotam nem se adiam.
  Hoje `npm run lint` está nesse estado e isso trava a Onda 0 da v9.0.
- Gate que só imprime "AVISO" com exit 0 é **gate quebrado**: corrija o gate
  (`npm run secrets` hoje faz isso sobre o histórico do git).
- **Nenhum comando inventado:** só o que existe em `package.json`/CI.
  `npx playwright test` não é `npm run test:e2e` (o script não existe).
- Falha → reproduzir com saída integral → causa raiz citando `arquivo:linha` →
  corrigir → rodar até 0. **Re-rodar "pra ver" é proibido.**
- Correção que quebra gate anterior → `LESSONS.md` (§0.11).

## Gatilhos

| Sinal | Ação |
|---|---|
| Qualquer gate do `npm run ci` != 0, ou com warning | **Não entregar.** Ver "Regra de CI" acima; corrigir pré-existente incluso |
| Sessão abriu em shell Windows em vez de WSL | `wsl.exe -e bash -lc 'cd ~/projects/PasseiSimuladosTI/AZ104 && <cmd>'`; não instalar binário win32 |
| Arquivo `data/*.json` > 200KB | Particionar por subdomínio (§9 SIZE GUARD) |
| `needsReview` > 50 | Pausar `generate`, focar review (§4 WIP) |
| Falha no CI | RPR: teste que reproduz → regressão → `LESSONS.md` (§0.11). Re-rodar "pra ver" é proibido |
| Novo modelo Gemini / EOL anunciado | Atualizar lista §7 + `meta.json.generatedWith`; validado por `check-model.mjs` |
| Questão sem `source`/`sourceUrl` | Bloquear commit (Zod §3) |
| `npm install <x>` sem pin | Proibido — `.npmrc save-exact=true` (§1) |
| Segredo de dono (Postgres, service_role, GitHub token, chave PEM) em chat ou arquivo commitado | Rotacionar + nunca repetir. **Anon key (VITE_*) é pública por definição — `SELECT` com ela é seguro por construção e usado para provar RLS; não é segredo.** |
| Migration 002 não aplicada no Supabase | Aba Admin fica oculta (fail-closed por RLS) — não dar "false green": validar admin com 2 usuários antes de assumir |
| Key path de store IDB contendo `:` | Bloqueado — IndexedDB não aceita (usar campo `key` explícito, LESSONS 16/set) |
| `pre-push` ou `ci` falhando em `secrets` | Não faça push; rotacione a credencial exposta; `scripts/check-secrets.mjs` detalha o achado |
| Particionou `data/*.json` | Atualizar juntos `QuestionLoader.ts` + testes + scripts com a lista de arquivos; o gate é o e2e do quiz (unit usa mock e não pega) |
| Script temporário em `scripts/` | Quebra `biome check .` — gerar em `/tmp` ou apagar antes do CI; nunca `rm` com wildcard em `scripts/` (apaga ferramentas originais) |

## Skills ativas (repo `.opencode/skills/`)

`accessibility` · `ui-visual-composition` · `ux-writing-content-design`.
