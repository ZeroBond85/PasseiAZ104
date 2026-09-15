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

## 2026-09-12 — S4→S7 (modo contínuo)

- S4: 80q Compute (56 single/20 multiple/4 yes-no; 16/40/24). Banco 130q.
- S5: 80q Rede (mesmo mix) + pipeline: check-model.mjs (probe 3.5-lite/3.5/3) + generate-questions.mts (1req/5s, backoff 429, checkpoint duplo, --dry-run/--resume/--limit). Banco 210q.
- S6: 50q Storage + 5 case (case-st-01 Contoso) + 50q Monitoramento + 5 case (case-mo-01 Fabrikam); case-studies.json com 2 cases. Banco 320q (ig 50 · st 55 · co 80 · rv 80 · mo 55).
- S7: build-simulados.mts (seeded, 1 case contíguo + quotas 12/9/12/10/7) → 10 simulados oficiais fixed/100min; import-community.mts (fetch→quarentena needsReview). Validate 320/0.
- **Gate 0B PARCIAL (máquina):** banco validado ✓ · 10 simulados ✓ · explicações ✓ · **scores no LOG: pendente HUMANO** (responder simulados no app; 2º simulado é estudo S7).
- Próximo humano: baseline `B` (S3) + rotina 30–40q/dia + Leitner 15min + 2º simulado. S8–S13 (640q) em lotes sob demanda.

## 2026-09-12 — S8–S11 BANCO 950 FECHADO (modo contínuo, ordem de déficit)

- S8-1/2/3: ig 051-230 (fecha Identidade 230). S9-1: co 151-180 + st 056-075. S9-2: ig 181-230. S9-3: st 076-125. S10-1: st 126-170 (fecha Storage 170) + co 181-185. S10-2: co 186-200 (incidente normalização → LESSONS) + 201-230 (fecha Compute 230). S10-3: rv 081-130. S11-1: rv 131-175 (fecha Rede 175) + mo 056-060. S11-2: mo 061-145 (fecha Monitoramento 145).
- **BANCO: 950/950 validadas, 0 erros** (ig 230 · st 170 · co 230 · rv 175 · mo 145). Partições SIZE GUARD: identidade-acesso + compute-vms/apps/platform (todas <200KB).
- 10 simulados oficiais rebuildados sobre o banco final. Teste S2 tolerante a banco crescente. Isca `ro-226` rejeitada pelo validate (gate provado).
- **Gate 1 (validate + 57/57 + totais §4): ATINGIDO na parte executável.** Restante humano: estudo, média-5, agendamento §12.

## 2026-09-15 — v6.0 cont. (marca vetorial + copy + QA no CI)

- Marca: emblem.svg (capelo+check, fonte da verdade) + brand.svg (lockup grande, gerado por render-icons.mts) + PNGs PWA re-renderizados via Chromium; hero-wide/header PNGs removidos. Login/hero usam brand grande; header usa emblema 48px; h1 vira sr-only (fim da triplicação do nome).
- Copy (ux-writing): sem "Leitner"/"validadas"/"corte 700" — agora "revise no ritmo certo", "950 questões", "nota de corte 700". Fontes: system-ui nativa (mantida, zero download).
- Bug sistêmico: CSS global não atravessa shadow DOM (botões/cards/sr-only sem estilo) — corrigido via src/styles/shared.ts; axe pegou contraste 3.7<4.5 no btn-primary — novo token --btn-primary-bg (AA). Detalhe em LESSONS.md.
- QA no CI: job e2e no ci.yml (chromium + secrets; login.spec com skip condicional sem env + axe na tela de login; axe home agora com bypass local); check-budget.mjs (JS 140KB / CSS 10KB gzip); perf.yml (lighthouse 13.4.1 desktop + check-lh.mjs vs lighthouse-budget.json); lighthouse no PINS (32 asserts).
- Local: unit 32/32, e2e 6/6, budget OK, lint OK.
