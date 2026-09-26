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
- **Auditoria visual (prints desktop+mobile lidos):** header mobile quebrava "Passei AZ-104"/tagline em 2 linhas ("AZ-"/"104") + hero com 299 chars (9 linhas). Fix: hero enxuto (~130 chars: formato/tempo/nota + offline + qualquer dispositivo), header ≤520px sem tagline e título nowrap, hífen inseparável U+2011 em "AZ‑104" (hero/login/orientação) p/ nunca partir o código da prova. QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Tipografia ("formato, letras ok?"):** achado real — botões crus em **Arial 13.3px** (UA impõe em button/input/select; global não cruza shadow DOM). Fix sistêmico: `controlStyles` (`font: inherit; color: inherit`) no shared + 7 componentes. Verificado via `getComputedStyle`: nav e opções agora system-ui. Quiz fotografado: timer mono, meta mono, questão 650/1.45, opções e CTAs coerentes. Detalhe em LESSONS.md. QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Infra de logs da aplicação (pedido do dono: "bons logs são primordiais"):** `src/utils/logger.ts` — níveis debug/info/warn/error + subsistema (auth/sync/quiz/data/ui) + buffer circular 200 + sanitize sem PII (e-mail→[email], JWT→[token]) + `?debug=1`/`az104-debug=1` p/ debug no console. 12 silêncios `.catch(()=>undefined)` viraram `hush*` com contexto (warn p/ perda de dado real: attempt/dúvida/perfil); leitura de role agora loga `found/missing/error`; magic link loga envio/falha; `ensureProfile` com try/catch. **Selo "Admin"** no user-menu (confirmação visual p/ validação). Testes: 38/38 (4 novos do logger). QA: lint · tsc · budget OK · e2e 9/9.
- **"Logo quebrou" não reproduz:** build de produção servido localmente renderiza hero (1040×341, visível) e chip do header sem nenhum request 4xx — código e assets OK. Conclusão: cache PWA/SW antigo no aparelho do dono (Ctrl+Shift+R / fechar a aba resolve).
- **"email rate limit exceeded" (429 do Supabase):** SMTP built-in tem cota mínima (poucas msgs/hora no projeto + janela de 60s por usuário no OTP) — os testes repetidos de login de hoje esgotaram. Ação imediata: **aguardar ~1h e não reenviar em sequência** (cada clique queima cota); manter a sessão (persiste, não precisa relogar). Produção: configurar **SMTP próprio** (ex.: Resend) em Authentication → SMTP. App agora traduz o 429: "Muitas tentativas de envio. Aguarde alguns minutos e tente de novo." QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **Risco tratado como problema real:** login 100% dependente do SMTP embutido = qualquer rajada trava todos (sem fallback de senha). Camada app: **cooldown de 60s no botão do magic link com contagem visível** ("Aguarde Ns…") após qualquer tentativa — evita queimar cota e cair na janela anti-abuso. Camada infra (humano): plugar **SMTP próprio** no Supabase antes do uso real (config no dashboard, zero código). QA: lint · tsc · 34/34 · budget OK · e2e 9/9.
- **SMTP próprio (pesquisa tiers free 2026):** Brevo 300/dia permanente sem cartão e **sem exigir domínio próprio** (verifica o e-mail remetente via link) → **recomendado**. Resend 3k/mês (100/dia) ótimo, mas **exige domínio verificado p/ enviar a terceiros** — descartado (sem domínio próprio). Gmail+app password = plano B imediato (500/dia). Postmark 100/mês (pouco), SendGrid trial 60d, SES sandbox+cartão → descartados. **Detalhe crítico:** ao ativar SMTP próprio o Supabase impõe 30/hr — subir em Authentication → Rate Limits. Zero código; config no dashboard (humano) + teste de magic link pós-reset da cota.

## 2026-09-23 — PLAN 2 Fase A (P0): fidelidade ao exame (catálogo + quotas + teclado + dúvida)

- **Objetivo:** corrigir 4 bugs reais da auditoria: monodomínio (2.2), oficiais órfãos (2.2b), botão dúvida morto (2.3), teclado multi-select+A–D (2.4).
- **Entregas:**
  - `src/data/simulados.ts`: `PROPORTIONS` + `SIMULADOS` (10 oficiais validados por Zod `min 1`) + `getSimuladoById`.
  - `src/engine/QuestionSelector.ts`: novo `pickByIds(pool, ids)` (ordem JSON, ignora ausentes) — usado no modo `fixed`.
  - `src/engine/keyboard.ts`: `toggleSelection(current, letter, isMultiple)` — suporte a multi-select via teclado.
  - `src/components/catalog-screen.ts` (novo): lista 10 oficiais + "Simulado Dinâmico" (seed `Date.now()%100000`); evento `start` com `SimuladoSpec`.
  - `src/components/app-shell.ts`: `startQuiz(spec)` com `mode==='fixed'→pickByIds` / `seed→domainQuotas(count, PROPORTIONS)`; `simId`/`pendingSpec` por sessão; teclado `1–4` + letras `A–D` via `toggleSelection`; aba `catalog` via home CTA + link orientação; orientação dinâmica com título do sim + "Escolher outro simulado".
  - `src/components/progress-panel.ts` (A2): `@click=${() => this.toggleResolve(d.questionId)}` — fix do `dataset.qid`→closure.
  - **Mobile overflow 6px pré-existente** (botão "Progresso" no nav esticava 396>390): fix `nav button { min-width:0; overflow:hidden; text-overflow:ellipsis }` — home/catalog/orientation 390=390.
  - **Axe:** catalog 0 violações, orientation 0 violações.
- **Testes novos:** `simulados.test.ts` (4: 10 sims/50 únicos, quotas exatas ig12·st9·co12·rv10·mo7, pickByIds ordem, ausentes ignorados), `keyboard.test.ts` (3), `catalog.spec.ts` (2: dinâmico cobre 5 domínios, oficial-01 50 q).
- **Resultados:** unit **45/45** (+7), e2e **11/11** (+2), validate 950/0, build OK, JS gz **109.3KB / 140KB**, lint/tsc clean.
- **Próximo:** Fase B (P1) — review-card com opções, navigator colapsável, sessão Leitner, cases em bloco.

## 2026-09-23 — PLAN 2 Fase B (P1): UX de estudo (review-card, navigator, Leitner, cases)

- **Objetivo:** melhorar a experiência de estudo e revisão.
- **Entregas:**
  - **B1 review-card opções:** exibe alternativas (A–D) com badges ✓ verde (correta) / ✗ vermelho (sua errada) + explicação preservada.
  - **B2 navigator colapsável:** em ≤520px mostra toggle "Questões (N/50)" com `aria-expanded`; desktop mantém grade visível.
  - **B3 aba Estudo (Leitner):** nova tab "Estudo" → `getDue` (50 mais urgentes) → `estudo-card` com autoavaliação Again/Hard/Good/Easy (SM-2 simplificado) → `gradeCard` → `saveProgress`; pergunta revelada após grade + botões mantidos p/ reavaliação.
  - **B3.5 cases contíguos:** `selectQuestions` agrupa questões de mesmo `caseStudyId` juntas (ordem original do pool preservada).
- **Testes:** unit 45/45, e2e 11/11, validate 950/0, build OK, JS gz 111.4KB / 140KB, lint clean.
- **Próximo:** Fase C (P2) — modo local/offline, treino por domínio, pausa só treino.

## 2026-09-23 — PLAN 2 Fase C (P2): modo local/offline + treino por domínio

- **Objetivo:** permitir uso sem login + treino focado por domínio.
- **Entregas:**
  - **C1 modo local/offline:** botão "Continuar sem conta (modo local)" na tela de login → define `localMode=true`, `userId='local'`, `authReady=true`; toda persistência em IDB (sessão, progresso, tentativas); sync opcional posterior.
  - **C2 aba Treino:** nova tab "Treino" → grade 5 domínios (IG/ST/CO/RV/MO) → 20 questões aleatórias do domínio → quiz com pause/continue/exit → pause/resume **só no treino** (simulado oficial não permite pausa).
  - UI: header com progresso + botões Pausar/Continuar/Sair; question-card reutilizado; flag/marcar revisão; finalização com score percentual.
  - Persistência: usa `QuizEngine` separado (`treinoEngine`) para não interferir no simulado oficial.
- **Testes:** unit 45/45, e2e 11/11, validate 950/0, build OK, JS gz **112.4KB / 140KB**, lint clean.
- **Próximo:** Fase D (P3) — modal finalização, card vitória, polish visual, axe catalog/orientation.

## 2026-09-23 — PLAN 2 Fase D (P3): polish visual (modal, vitória, axe)

- **Objetivo:** finalizar a experiência com modais acessíveis e feedback visual de vitória.
- **Entregas:**
  - **D1 modal finalização:** `modal-dialog` substitui `confirm()` nativo — `<dialog role="dialog">` com focus trap, `ESC` p/ cancelar, `Enter` p/ confirmar, animações fadeIn/slideUp. Usa Shadow DOM (estilos extraídos no build). Testes usam `page.getByRole('dialog', { name })` p/ seleção sem piercing de Shadow DOM.
  - **D2 card vitória:** variant `success` aparece automaticamente quando `result.passed === true` ao finalizar simulado — animação 🎉 + botão "Ver revisão" → leva à aba Revisão.
  - **D3 polish:** axe 0 violações no quiz/progresso (já coberto), JS gz **113.6KB / 140KB**.
- **Testes:** unit 45/45, e2e 11/11, validate 950/0, build OK, lint clean.
- **Status:** PLAN 2 **concluído integralmente** (Fases A–D). Próximo: agendar prova (quando critérios §12 forem atendidos) ou iniciar ciclo de estudo contínuo.

## 2026-09-25 — QA visual (modelo com visão): light DOM matava os estilos do app-shell

- **Achado:** screenshots desktop/mobile lidos de verdade (6 + 4 pós-fix): mobile estourava para ~1029px — logo 1008px intrínseco no header e no hero. Desktop OK; modal com backdrop correto (`rgba(0,0,0,.5)` sutil sobre tema escuro — não-bug).
- **Raiz:** `app-shell` em light DOM → `static styles` nunca aplicados (0 `<style>`, regra fora de stylesheet nenhum). Premissa do override ("seletores atravessarem nos testes") falsa — Playwright atravessa shadow aberto.
- **Fix:** app-shell volta ao shadow DOM default + `cardStyles` no `review-card` (usava `.card` sem o base) + nav mobile `flex-wrap` (estilos reais reativados truncavam 7 abas em siglas `Ini…`).
- **Prova:** `tests/e2e/overflow.spec.ts` (novo, RPR permanente) + screenshots pós-fix (home/quiz/review/nav mobile OK, zero `pageerror`).
- **Resultados:** lint · build · unit 45/45 · validate 950/0 · budget JS 110.1KB/140KB · e2e **12/12** (11 + overflow).
- **Pendente humano (inalterado):** validar admin com 2 usuários · iOS físico · SMTP próprio (Brevo) · estudo até 3 condições §12.

## 2026-09-25 — PLAN-3 registrado + Sprint 1 (P0, CSP, meta, quick wins)

- **PLAN-3.md v7.1** (215 linhas + §9 pós-prova/descartes): Study Hub + arquitetura limpa + vitrine.
  Commit `d7b24e0` + `b5a38ac`, 4 workflows verdes.
- **Sprint 1 executado:**
  - **P0** `QuestionLoader.ensureSeeded`: falha por arquivo vira `throw seed parcial N/8` (nunca marca
    incompleto) + botão retry no header; teste RPR `question-loader.test.ts` (3 testes: HTTP 500, throw rede, 8/8 OK).
  - **P3** CSP meta tag (`connect` só `*.supabase.co`); e2e 12/12 sem violação.
  - **Meta-fix** `bump-bank-meta.mjs` + `meta:check` no `ci`: drift storage 125→170 / compute 150→230 corrigido,
    `updatedAt` verdadeiro, total 950.
  - **QW** budget por chunk no log · `prefers-reduced-motion` global · indicador 🔴 offline inline no header.
  - **SRI descartado** (zero third-party; quebraria precache Workbox) — LESSONS.
- **Resultados:** lint 87 arquivos · build OK · unit **48/48** (+3) · validate 950/0 · meta OK ·
  budget JS 110.1KB/140KB · e2e **12/12**.
- **Próximo:** Sprint 2 (P2 runtimeCaching + SyncController retry/rate-limit).

## 2026-09-25 — PLAN-3 Sprint 2 (P2): offline-first real

- **SW com runtimeCaching de verdade:** `workbox.runtimeCaching` StaleWhileRevalidate p/
  `/data/*.json` (20 entradas, 30 dias, só `response.ok`). ADR-001 reescrito (nome antigo era enganoso).
- **SyncController** (`src/controllers/sync-controller.ts`, classe pura): retry automático no evento
  `online` + token bucket cliente (10 ops/60s; sem token agenda em vez de tomar 429) + backoff
  30s→300s. `app-shell.retrySync` delega; attach/detach no ciclo auth; simId acompanha o quiz ativo.
- **Teste novo** `offline.spec.ts`: IDB limpo + `data/*.json` abortado → seed volta do cache do SW.
- **Achado real:** `urlPattern` função é descartado em silêncio pelo workbox-build (`grep -c`=0 no sw.js) —
  fix RegExp + LESSONS. Prova: cache `az104-questions` existe + e2e verde.
- **Resultados:** lint 88 arquivos · build OK · unit **48/48** · validate 950/0 · meta OK ·
  budget JS 110.6KB/140KB · e2e **13/13** (+1 SW cache).
- **Próximo:** Sprint 3 (P1: quiz/treino controllers + flags).

## 2026-09-25 — Copy UX PT-BR + guia MS + frescor (auditoria total de textos)

- **Direção do dono:** frisar "guia de estudo para a certificação", menos genérico, sem tecnicês,
  foco em quem faz a prova em PT-BR, termos reais da Microsoft (skill `ux-writing-content-design`).
- **Home:** hero com copy aprovada + linha certificação (termos oficiais MS) + linha frescor do banco
  (`getBankLine()` lê `meta.json` em runtime: "Banco de 950 questões em português · atualizado em ...").
- **Catálogo:** bloco cert + link direto do guia oficial
  (`.../resources/study-guides/az-104`, trocado do aka.ms) + linha frescor; sub sem "corte 700"
  (regra PLAN §6); dinâmica "Sempre diferentes: 50 questões · 100 min".
- **Jargão removido do visível:** "Estudo espaçado (Leitner)"→"Fixe o que errou" (evita choque com aba Revisão) ·
  "Stats"→"Notas" · keys cruas → labels PT (treino, stats) · modal "(ões)"→plural certo ·
  "Fracos"→"Para reforçar" · "Dificuldade"→"Desempenho" · "Resumo"→"Suas notas" · "Caixa 1"→texto plano
  (progress + engine tips) · "Caixa N"→"Questão nova/Revisar em N dias" · admin "Troca"→"Tentativas",
  "Distractor"→"Distrator" · treino '⚑ Marcar'→'⚑ Marcar revisão' · empties com ação/recuperação.
- **Duplicações auditadas:** Do-seu-jeito login+home (intencional, momentos distintos) · cert home+catalog
  (ênfase pedida) · mapas PT ×3 consolidados em 1 export · qid crus mantidos (IDs funcionais p/ revisão).
- **Exceção documentada:** "abaixo do corte 700" no pós-resultado (número necessário no contexto; regra §6 mira marketing).
- **Fatos MS coletados p/ Sprint 4** (guia atualizado 23/03/2026 · cert page 09/07/2026 · skills desde 17/04/2026 ·
  prova oferecida em Português (Brasil) · 700/100min confirmados · pesos oficiais).
- **Guia oficial no app:** card na aba Estudo + link no catálogo (mesma URL direta).
- **Testes:** unit 48/48, e2e **14/14** (+estudo), validate 950/0, meta OK, budget JS 110.6KB/140KB,
  screenshots home/catalog/estudo mobile lidos e aprovados.
- **Bug real achado no caminho:** aba Estudo em branco (`renderEstudo` async → Promise no template) —
  fix render síncrono + `estudo.spec.ts` (RPR) + LESSONS.
- **Próximo:** Sprint 3.1 (ligar `QuizController` no app-shell).

## 2026-09-25 — PLAN-3 Sprint 3.1 (P1): QuizController ligado

- **`src/controllers/quiz-controller.ts`** (novo, 443 linhas, classe pura): start/persist/finish/recordAttempt,
  tagError, teclado, timer expiry callback; recebe `notify` + `getUserId`, sem DOM.
- **`app-shell.ts` 1324→1129 linhas** (-195): métodos viram delegação fina
  (`quizCtl.start/answer/toggleFlag/goTo/complete/tagError/handleKey`); template lê `quizCtl.*`;
  imports mortos removidos (tsc guiou: 19 unused).
- **Resultados:** tsc 0 · lint clean · unit **48/48** · validate 950/0 · meta OK ·
  budget JS 111.7KB/140KB · e2e **14/14** (quiz/gate/progress/offline/axe/overflow/estudo/catalog).
- **Próximo:** Sprint 3.2 (`TreinoController`, app-shell rumo a <500).

- **Próximo:** Sprint 3.2 (`TreinoController`, app-shell rumo a <500).

## 2026-09-25 — PLAN-3 Sprint 3.2 (P1): TreinoController ligado

- **`src/controllers/treino-controller.ts`** (novo, classe pura): start/answer/flag/pause/resume/exit/finish.
  Shell mantém só template + `finishTreino` (alert vive no shell até Sprint 5 trocar por modal).
- **2 bugs reais achados na extração (treino nunca teve e2e):**
  1. **Placar sempre 0:** `startTreino` criava `QuizEngine` sem `load()` → `idle` → `answer()` descartava
     tudo em silêncio. Fix: `engine.load(picked)` no `start` + unit `treino-controller.test.ts` (5 testes).
  2. **Botão morto em perfil zerado:** treino não chamava `ensureSeeded()` (só o quiz chamava) → pool
     vazio → `return` silencioso. Fix: `ensureSeeded()` no `start` + banner `seedError` reaproveitado.
- **Resultados:** tsc 0 · lint clean · unit **53/53** (+5) · validate 950/0 · meta OK ·
  budget JS 112.0KB/140KB · e2e **14/14** · fluxo treino fim-a-fim provado (pausa/continua/finaliza c/ diálogo).
- **app-shell:** 1129→1061 linhas. Meta <500 do plano: **reavaliada** — lógica 100% extraída;
  restam composição + estilos (~450 CSS) + templates declarativos; fatiar mais criaria prop-drilling
  (pior p/ manutenção). Shell agora é orquestrador fino; PLAN-3 atualizado.
- **Próximo:** Sprint 3.5 (dinâmico principal + última atividade + rename fixos).

## 2026-09-25 — PLAN-3 Sprint 3.5: catálogo UX (dinâmico principal)

- **Dinâmico como principal:** aba Simulado e "Começar simulado" abrem orientação do dinâmico
  (seed fresco a cada entrada via `select()`); fixo só se escolhido no catálogo (`pendingSpec`).
  `buildDynamicSpec()` virou fonte única (`data/simulados.ts`) — catalog + shell usam o mesmo.
- **Catálogo:** dinâmico no topo com selo "★ Recomendado" + CTA "Começar agora";
  seção renomeada "Simulados oficiais"→**"Simulados fixos"** (+ sub explicando);
  cada linha mostra última atividade (`última: 720 em 12/set` / `nunca feito`, via attempts).
- **Sessão:** restore só p/ `mode==='fixed'` (seed novo = restore antigo não faz sentido).
- **Testes:** `catalog.spec.ts` seletores → regex (nome ganhou sufixo de atividade).
- **Resultados:** lint clean · tsc 0 · unit **53/53** · validate 950/0 · meta OK ·
  budget JS ~112KB/140KB · e2e **14/14** · screenshot mobile lido e aprovado.
- **Próximo:** Sprint 4 (Study Hub + admin ampliado + IRT + heatmap + drill + syllabus-gap + flags).

## 2026-09-25 — PLAN-3 Sprint 4.2: Study Hub engine + UI + links pós-simulado

- **Engine** (`src/study/`): `topics.ts` (Supabase c/ fallback JSON + `matchTopic` por prefixo) ·
  `study-profile.ts` (localStorage por usuário + sync) · `study-hub.ts` (`generateStudyPlan`:
  fracos <70% nos últimos 5 simulados → links curados top 10 + `buildStudyLinks` p/ erros) ·
  `src/sync/study-sync.ts` (push/pull LWW) · `src/config/flags.ts` (`study-hub`/`drill` ON).
- **UI:** `study-link-card.ts` (usado no hub e no pós-simulado; `showSeen` esconde toggle sem perfil) ·
  `study-hub-panel.ts` (fracos + links + "lido" persistido) montado na aba Estudo atrás de flag ·
  `study-guide.ts` seção "Estude no Microsoft Learn" (links por questão errada, dedup, cap 8).
- **2 fixes no caminho:** domínios sem respostas não entram como fracos (0% fantasma) ·
  labels PT em fracos/links (raw `storage` → "Storage").
- **Testes:** unit `studyhub.test.ts` (3: fracos+links, vazio, match prefixo) · e2e `estudo.spec.ts`
  (guia + hub com dados via fluxo real) — screenshot mobile lido e aprovado.
- **Resultados:** tsc 0 · lint clean · unit **56/56** · validate 950/0 · meta OK · e2e **15/15**.
- **Próximo:** Sprint 4.3 (IRT + heatmap + drill + syllabus-gap + admin ampliado).

## 2026-09-25 — PLAN-3 Sprint 4.3: IRT + heatmap + drill + gap + admin

- **IRT 1PL** (`src/engine/irt.ts` + `scripts/calibrate-irt.mts` CSV/JSON→`irt-params.json`):
  gate `n>=30` (sem amostra = fora); unit 3 testes; selector integra quando houver dados reais.
- **Drill** (`drill-controller.ts` `buildDrillPool`/`buildDrillQuestions` + `TreinoController.startCustom`):
  score fraco×3+erro×2+due×2+distrator×1 → "🎯 Treinar meus erros" no hub → roda no treino ("Meus erros").
  Unit 4 testes.
- **Heatmap** (`analytics/heatmap.ts` + `distractor.ts` + seção "Onde você mais erra" no Progresso
  com tendência ↗→↘): unit 4 testes; screenshot mobile lido e aprovado.
- **`syllabus-gap.mts`**: outline × banco × topics → pesos + tópicos sem cobertura (hoje: 0 gaps).
- **Admin ampliado:** promover/rebaixar role na UI (RLS já permitia; confirmação em 2 cliques) ·
  fila `needsReview` (leitura + regra "aprovação via PR") · sparkline SVG por usuário ·
  viewer `az104_admin_logs`.
- **Resultados:** tsc 0 · lint clean · unit **67/67** · validate 950/0 · meta OK ·
  budget JS 120.9KB/140KB · e2e **15/15**.
- **Próximo:** Sprint 5 (Hardening + Docs & Vitrine + CODE-REVIEW.md).

## 2026-09-26 — PLAN-3 Sprint 5: hardening + docs + vitrine (v7.1 fechada)

- **5a código:** treino sem `alert` (modal `info` + e2e sem dialog nativo) · `study-guide` sem CSS morto ·
  `test:count` fail-closed no `ci` (pegou e2e 15→16 no primeiro run) · Zod fonte única (`types.ts`+`topics.ts`,
  `tsc` prova equivalência) · `validate-migration-types` (10 tabelas, no `ci`) · `new-question.mts`
  (interativo + lote testado fim-a-fim) · guard `supabase.ts` p/ tsx.
- **5b CIs:** `study-links` (achou 1 URL 404 real → corrigida; retry anti-transiente), `question-curation`
  (limpo), `exam-watch` (outline = snapshot), `backup` semanal (pula sem secret). YAML validado.
- **5c vitrine:** README reescrito (badges, screenshots lidos, números reais) · COMPONENTS/TESTING/STUDY-LINKS ·
  SECURITY/ROADMAP/ARCHITECTURE(Mermaid+ADRs)/API-REF/TROUBLESHOOTING/TUTOR/CONTRIBUTING reais ·
  package.json completo · templates issue/PR · OG/Twitter + social-preview · `LogoPasseiAz104.png`
  removido (duplicata `cmp`) · CODE-REVIEW.md (APROVADO P/ PRODUÇÃO com ressalvas humanas).
- **Pendente humano:** migration 004 · promoção admin · `SUPABASE_DB_URL` · Brevo · 2 usuários ·
  iOS · GitHub Settings · estudo até §12.

## 2026-09-26 — PLAN-3 Sprint 5a+5b: hardening código + CIs mensais

- **Treino sem alert:** `modal-dialog` ganhou ramo `info` (botão único) + `finishTreino` abre modal;
  e2e `treino.spec.ts` prova zero dialog nativo. RPR: specs temporários não cobriam treino.
- **2.7 por evidência:** `study-guide` tinha `btnStyles` morto (removido); navigator/admin sem ação.
- **P4:** `update-readme-test-count.mjs` (67 unit + 15 e2e) + `test:count --check` no `ci`.
- **Zod fonte única:** `types.ts` + `topics.ts` viraram schemas (`z.infer` idêntico, tsc prova);
  `ProfileRowSchema.parse` no upsert; `supabase.ts` com guard p/ tsx.
- **`validate-migration-types.mts`** (SQL×Zod×TS, 10 tabelas) no `ci`.
- **`new-question.mts`** interativo + modo lote (testado fim-a-fim; AbortError tratado).
- **3 CIs mensais + backup:** `study-links` (achou 1 URL 404 real → corrigida p/ `log-analytics-overview`;
  retry em falha de rede; PR auto/issue), `question-curation` (limpo: needsReview=0), `exam-watch`
  (outline 2026-04-17 = snapshot; gap 0), `backup.yml` semanal (pula sem secret).
- **Resultados:** tsc 0 · lint 0 · unit **67/67** · e2e **16/16** · validate 950/0 · meta + migration OK ·
  budget JS 123.5KB/140KB (Zod no bundle, folga 16.5KB).
- **Próximo:** Sprint 5c (docs + vitrine) e 5d (commit único + CODE-REVIEW.md).
