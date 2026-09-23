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

## 2026-09-16 — v7.0 plataforma por usuário (R → C → P1 → P2/P3/P4/P5 → Q → Docs)

- **Fase R** (`9a93f98`): marca reverte para `source.png` do dono (2023). `emblem.svg`/`brand.svg` deletados; `render-icons.mts` reescrito (fonte = source.png; letterbox `#0a0e14` via Playwright) → icon-192/512, apple-touch, favicon-32, maskable (arte ≤62%), header-112, hero-wide. App usa header-112/hero-wide.
- **Fase C** (`1da4e70`): copy final aprovada pelo dono — "Estudo para o exame AZ-104"; hero sem jargão (sem "corte 700"/"revisão espaçada"), menciona exame oficial + offline + dúvidas + continuar em qualquer dispositivo. **Tela de Orientação**: 50q/100min/corte 700/regras + botão "Começar simulado" (select não dispara mais simulado direto). 4 specs e2e migrados para a orientação.
- **Fase P1** (`a8a4758`): migration 002 `az104_platform_user_admin.sql` — profiles(role+email), attempts(append-only, answers/by_domain/error_tags jsonb), doubts(1 por questão, tag, resolved), activity_log(PK user+date+kind), study_suggestions, admin_logs; `az104_is_admin()` SECURITY DEFINER + RLS por tabela (ADR-006). **Execução manual no Supabase SQL Editor + validar 2 usuários** (instrução no cabeçalho do SQL).
- **P2–P5** (`36d69ef`): IDB v2 (attempts/doubts/activity/suggestions), SyncEngine push/pull platform, `progress-panel` (histórico, streak por activity_log, weak-map por domínio, dúvidas CRUD, painel §12 `readiness`), `study-guide` (analyzeAttempt: weak domains, por tipo/dificuldade, topErrors+tips, leitnerTip), review-card com **5 tags de erro** (concept_gap/silly_mistake/misread/trap/timeout) → error_tags+doubts, `admin-panel` (KPIs, usuários, analytics por questão c/ distrator, fila dúvidas, CSV; aba só role admin). Unit 34/34.
- **Fase Q** (`4571609`): progress.spec (attempt→stats/streak/dúvida + estudo guiado + admin sem role), axe na aba Progresso (h1 sr-only). e2e 9/9, axe 0, CI+budget verdes.
- **Bug raiz:** `keyPath: 'date:kind'` inválido no IndexedDB (`:` não é key path) abortava o upgrade v2 e pendurava o seed → "Carregando questões…". Corrigido com campo `key` explícito. Detalhe em `LESSONS.md`.
- **Docs:** PLAN v7.0 (estrutura, §6, §12 painel, §17, mapa 32–39, milestones), ARCHITECTURE ADR-006/007. **Pendente humano:** aplicar migration 002 + validar 2 usuários · iOS físico · estudo (média-5 ≥750 + 3 condições §12).

## 2026-09-23 — Migration 002 APLICADA no Supabase (produção)

- 1º run do SQL falhou com `42P01` na função `az104_is_admin()` (relation az104_profiles does not exist): **função `language sql` valida o corpo no CREATE** — corpo referencia a tabela, que vinha depois. Corrigida a ordem (tabela BEFORE função) + comentário-guia no arquivo. Detalhe em `LESSONS.md` (2026-09-23).
- Re-executado o script completo → **sucesso**. Validação externa via PostgREST (anon): `az104_profiles`, `az104_attempts`, `az104_doubts`, `az104_activity_log`, `az104_study_suggestions`, `az104_admin_logs` — todas `200` (antes: `404`).
- Admin: SQL de promoção do `zerobond@gmail.com` → `role='admin'` fornecido (idempotente). **Próximo humano:** criar 2º usuário (janela anônima) e testar aba Admin (admin vê / user não) + 1 simulado como user; depois veredito "admin em produção OK".
- **Code review v7.0 aplicado:** (1) policy `profiles self update email` (delta `003_*.sql` p/ produção + atualizado no 002) — corrige 403 silencioso no re-login de usuário comum via `upsertOwnProfile`; (2) `pushPlatform` agora faz fail-continue por linha e retorna `{pushed, failed}` — aba/sync não morrem no 1º erro; banner "sync falhou (N) — tocar para repetir" no header com retry (app-shell). QA: CI · 34/34 · validate 950 · budget OK · e2e 9/9. `console.warn` substitui o `.catch` mudo do perfil.

## 2026-09-23 — UI login/home (logo real + copy C)

- **Feedback do dono:** tela inicial "sem logo, feia, texto péssimo". Diagnóstico por amostragem de pixels (Playwright): `source.png` (logo real) = 1426×905, fundo transparente, arte ~11%; `hero-wide.png` = caixa 100% preenchida `#0a0e14` → "tijolo escuro" — o letterbox é que lia como "sem logo".
- **Fix:** login e home agora usam `source.png` **direto** (transparente, sem letterbox): logo visível, `alt=""` decorativo + H1 `sr-only` (acessibilidade preservada). `hero-wide.png` vira legado (não usado no app).
- **Copy (ux-writing, opção C aprovada):** "Do seu jeito, até a aprovação: simule a prova real, revise o que errou e estude no seu ritmo — em qualquer dispositivo." + microcopy no formulário "Você receberá um link de acesso no e-mail."
- **e2e:** spec login atualizado (logo decorativo → seletor `.logo` em vez de `img[alt="Passei AZ-104"]`). QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Perf pegou regressão (por isso push acompanhado até verde):** Lighthouse budget **total 1003.6KB / teto 900KB → ESTOUROU** — `source.png` ao vivo (387KB) no lugar do `hero-wide.png` (162KB). Fix: `render-icons.mts` deriva **`source-logo.webp` transparente** (140KB, mesma arte, master preservada); login/home passam a usá-lo. Detalhe em LESSONS.md.
- **Logo maior + legível (feedback do dono com print):** a arte ocupa ~1/3 do quadro do `source.png` (margens transparentes) → `source-logo.webp` agora sai **recortado na bbox + respiro 24px (1040×341)**, logo ~3x maior na mesma largura; login/home exibem sobre **painel branco** (radius 16 + sombra) — o verde-escuro "by PasseiSimuladosTI" volta a ler nos dois temas. **Copy ajustada:** frase C agora nomeia o exame ("…aprovação **no AZ-104**…"). QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Logo do header:** `header-112.png` (slab escuro, logo minúsculo) trocado pelo mesmo `source-logo.webp` em **chip branco** (38px, `alt=""` — nome duplicado com o texto da marca removido); `header-112.png` vira legado. QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Painel branco justo (pedido do dono):** respiro embutido no WebP 24px → **8px** (`source-logo.webp` 1040×341 → **1008×309**) + padding do CSS 18/22px → **10/12px** (login e home; chip do header já era 5/8px). Aplicado nos 3 lugares (login/home/header usam o mesmo asset). QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **"Logo quebrou" não reproduz:** build de produção servido localmente renderiza hero (1040×341, visível) e chip do header sem nenhum request 4xx — código e assets OK. Conclusão: cache PWA/SW antigo no aparelho do dono (Ctrl+Shift+R / fechar a aba resolve).
- **"email rate limit exceeded" (429 do Supabase):** SMTP built-in tem cota mínima (poucas msgs/hora no projeto + janela de 60s por usuário no OTP) — os testes repetidos de login de hoje esgotaram. Ação imediata: **aguardar ~1h e não reenviar em sequência** (cada clique queima cota); manter a sessão (persiste, não precisa relogar). Produção: configurar **SMTP próprio** (ex.: Resend) em Authentication → SMTP. App agora traduz o 429: "Muitas tentativas de envio. Aguarde alguns minutos e tente de novo." QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Risco tratado como problema real:** login 100% dependente do SMTP embutido = qualquer rajada trava todos (sem fallback de senha). Camada app: **cooldown de 60s no botão do magic link com contagem visível** ("Aguarde Ns…") após qualquer tentativa — evita queimar cota e cair na janela anti-abuso. Camada infra (humano): plugar **SMTP próprio** no Supabase antes do uso real (config no dashboard, zero código). QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **SMTP próprio (pesquisa tiers free 2026):** Brevo 300/dia permanente sem cartão e **sem exigir domínio próprio** (verifica o e-mail remetente via link) → **recomendado**. Resend 3k/mês (100/dia) ótimo, mas **exige domínio verificado p/ enviar a terceiros** — descartado (sem domínio próprio). Gmail+app password = plano B imediato (500/dia). Postmark 100/mês (pouco), SendGrid trial 60d, SES sandbox+cartão → descartados. **Detalhe crítico:** ao ativar SMTP próprio o Supabase impõe 30/hr — subir em Authentication → Rate Limits. Zero código; config no dashboard (humano) + teste de magic link pós-reset da cota.
