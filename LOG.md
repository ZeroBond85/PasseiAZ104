# LOG.md — PasseiAZ-104

> Diário de execução. Scores de simulados e decisões entram aqui.

## 2026-09-11 — Dia 1 (S1)

- Ambiente: WSL Debian + nvm + Node v24.21.0 + npm 11.19.0. Shell não-interativo não carrega nvm sozinho → usar PATH direto (`~/.nvm/versions/node/v24.21.0/bin`) ou `bash -ic`.
- Repo: `.git` fresco (sem commits, branch `master` → será `main`), remote `origin` = `https://github.com/ZeroBond85/PasseiAZ104.git`.
- Stash: `/tmp/az104-stash` e `~/az104-stash` inexistentes — nada a resgatar.
- Guard-rails criados antes do 1º npm: `.npmrc` (save-exact), `.nvmrc` (24), `.gitattributes` (eol=lf).
- Scaffold: `create-vite` 9.x rejeita `--force`; flag correta `--overwrite` (APAGA o dir). Incidente: `PLAN.md` + `LogoPasseiAz104.png` apagados; PLAN reescrito do registro aprovado; **logo pendente de re-upload** (sem cópia em Downloads/Desktop/Documents/Pictures/home). Detalhe em `LESSONS.md`.
- Re-pin imediato: vite 8.2.2 · typescript 6.0.3 · lit 3.3.3 · idb 8.0.3 · biome 2.5.12 · vite-plugin-pwa 1.3.0 · genai 2.21.0 · husky 9.1.7 · lint-staged 17.5.0 · vitest 5.0.0 · playwright 1.63.0 · axe 4.13.0 · types/node 22.20.2. `npx vite --version` = 8.2.2, `tsc` = 6.0.3. Pins §1 confirmados, sem divergência.

- Push BLOQUEADO (era): remote Repository not found — repo ainda não existia no GitHub. Resolvido via gh repo create PasseiAZ104 --public.
- Commits: 86c4177 (scaffold+docs) + 3772485 (remove Zone.Identifier). Push OK após gh repo create.
- CI verde (18s) · deploy verde (34s) · Pages 200: https://zerobond85.github.io/PasseiAZ104/ · main protegida (require check build).
- Logo recuperado: LogoPasseiAz104.png re-enviado à raiz → public/icons/source.png (byte-idêntico, cmp OK).
- **Gate Dia 1: repo + CI verde + Pages + PLAN.md v5.0 + skills — ATINGIDO.**

## 2026-09-12 — D2→D5 + S2 + S3 (modo contínuo)

- D2: tsconfig es2025/`types: []` (+vite-env.d.ts), biome.json, lint-staged, script lint. Template morto (favicon/icons.svg) removido.
- D5: hooks (pre-commit guards + pre-push `npm run ci`), scripts test/ci/validate, workflows security/dependency-audit/e2e-only, pins test (11).
- S2: zod 4.6.2 + tsx 4.21.0 (runner dos .mts; audit prod 0 vulns), schema §3, 5 engines TDD, validate-questions (Zod+FK+dedup FNV-1a), 50q Identidade (36 single/11 multiple/3 yes-no; 10 easy/25 medium/15 hard), validate 50/0, teste fim-a-fim. **Gate S2 ATINGIDO.**
- S3: IDB (sessions/progress/meta/questions) + QuestionLoader ADR-001 (fetch+IDB; `public/data` é symlink → `../data`, seguido pelo Vite) + quiz UI completa (question-card, timer-bar, navigator, review, stats) + Leitner persistido + 3 e2e (quiz/offline/gate) + Lighthouse **93/100/96**. **Gate 0A (13 itens) ATINGIDO.**
- Bugs reais pegos por teste: fixture explanation 92 chars; `??=` em expressão (biome); flag sem re-render; vitest varrendo .opencode/node_modules (include travado); e2e sob vitest (vitest.config exclude→include); seletor CSS não atravessa shadow DOM (usar getByRole).
