# PLAN-3.md — v7.1: Study Hub + Arquitetura Limpa + Vitrine GitHub

> Plano mestre pós-PLAN-2. Fonte da verdade continua `PLAN.md` v7.0.
> Diretriz do dono: fluxos automatizados, mínimo de intervenção humana, sem atalhos.
> Cortes confirmados: SW custom, Repository Pattern, Event Bus, lazy load + manualChunks,
> visual regression no CI, mutation testing no CI, contract tests via `gen types`.

## 0. Regras inegociáveis

1. Nenhuma dependência nova (só stack pinada §1 PLAN.md).
2. Prefere editar existente; arquivo novo só com responsabilidade real.
3. Bug → teste que reproduz → fix → `LESSONS.md` (RPR).
4. Commit só com `npm run ci` verde + e2e + `npm run budget` OK (JS gz ≤ 140KB).
5. `LOG.md` (sprint) + `LESSONS.md` (se descoberta) no mesmo commit.
6. Specs temporários (`tests/e2e/_*.spec.ts`) criados e deletados no mesmo comando.

## 1. Decisões travadas (não reabrir)

| # | Decisão | Valor final |
|---|---------|-------------|
| 1 | Descrição oficial | `Passe no AZ-104 treinando de verdade: simulados iguais à prova, revisão no ritmo certo e guia com links oficiais da Microsoft. Grátis, funciona offline.` (About usa versão enxuta se truncar: `Passe no AZ-104: simulados iguais à prova, revisão no ritmo certo e links oficiais da Microsoft. Grátis, offline.`) |
| 2 | PT-BR como diferencial | Padrão — README "Banco de questões": `**950 questões validadas em PT-BR** (a prova oficial é em inglês — aqui você estuda no seu idioma), com explicação do porquê de cada erro...` |
| 3 | Tagline do app | Mantida — `login-screen.ts` inalterado |
| 4 | Data do banco | `meta.json.updatedAt` como fonte única; visível na home + README |
| 5 | Curadoria × aquisição | Curadoria audita o existente; aquisição só via pipeline §8 (manual → IA → comunidade). Banco fechado em 950/950 pré-prova; só sai obsoleta |
| 6 | Obsoletas | Tag `deprecated` (reversível) + `needsReview:true`; excluídas do `build-simulados` até revisão |
| 7 | Syllabus watch | Detecta (CI mensal) → gap (script) → refresh (pipeline §8); issue automática com relatório anexado |
| 8 | Auto-merge | Permitido só p/ PRs mecânicos (drift de meta, redirect de links, README count) com checks verdes e diff restrito; pesos/lógica nunca auto-merge |

## 2. Mapa de automação (estado final — 9 workflows)

| Workflow | Gatilho | Faz sozinho | Humano entra se |
|----------|---------|-------------|-----------------|
| `ci.yml` | todo push/PR | lint+build+test+validate+budget+meta-drift-gate | falhar (RPR) |
| `e2e-only.yml` | dispatch / push | e2e + axe 0 | falhar |
| `deploy.yml` | push `main` | build + verifica env + Pages | — |
| `perf.yml` | push + semanal | Lighthouse + budget total | estourar |
| `security.yml` | push | gitleaks | acusar |
| `dependency-audit.yml` | mensal (existe) | `npm audit` + relatório `.agent/audits/` | vuln alta |
| `study-links.yml` | mensal + manual | HEAD nas URLs MS Learn → PR auto (redirect) / issue (morta) | URL morta (escolher substituta) |
| `question-curation.yml` | mensal + manual | validate + meta-drift (PR auto) + `needsReview` count + frescor + `sourceUrl` reachability → relatório `.agent/audits/` + issue se anomalia | fila >50, erros schema |
| `exam-watch.yml` | mensal + manual | lê outline oficial → compara snapshot → issue auto com gap report anexado | outline mudou (decidir refresh) |

## 3. Sprints

### Sprint 1 — Bugs críticos + fundação (P0, P3, quick wins, meta-fix)

- [ ] **P0** `src/data/QuestionLoader.ts`: track ok/falhas por arquivo; `throw` se parcial
      (`ok !== files.length`); nunca marca seed incompleto; warn por arquivo via logger.
- [ ] **P0-UI** botão "Recarregar banco" no header (só se seed incompleto).
- [ ] **P0-test** `tests/unit/question-loader.test.ts` (mock fetch 7 OK + 1 falha 500 →
      throw, sem `localStorage.setItem`, warn logado).
- [ ] **P3** `index.html`: CSP meta tag (`connect-src` só `*.supabase.co`).
- [ ] **Meta-fix** `scripts/bump-bank-meta.mjs` (regenera `countsByDomain` + `updatedAt` do real)
      + gate no `ci`: falha se `countsByDomain ≠ real` (corrige drift storage 125→170, compute 150→230).
- [ ] **QW** `scripts/check-budget.mjs` + `ci.yml`: relatório por chunk, falha se JS gz > 140KB.
- [ ] **QW** `vite.config.ts` + `index.html`: SRI nos assets.
- [ ] **QW** `src/styles/variables.css` + `timer-bar.ts` + `modal-dialog.ts`: `prefers-reduced-motion`.
- [ ] **QW** `src/components/app-shell.ts`: indicador online/offline inline no header (5 linhas).
- [ ] Docs: `LESSONS.md` (RPR P0 + CSP + meta-drift) + `LOG.md`.
- **Pronto:** `ci` verde · seed parcial impossível · console CSP limpo · `meta.json` verdadeiro.

### Sprint 2 — Offline-first real (P2)

- [ ] `vite.config.ts`: `workbox.runtimeCaching` StaleWhileRevalidate p/ `/data/*.json`
      (cache `az104-questions`, 20 entradas, 30 dias, só cacheia `response.ok`).
- [ ] `src/controllers/sync-controller.ts` (novo): retry automático no evento `online`
      (backoff exponencial) + `flushQueue()` ligado ao `retrySync()`.
- [ ] **Rate-limit cliente** (token bucket em `sync-controller.ts`): `syncNow`/`pushPlatform`
      consomem tokens (ex.: 10/60s por operação); sem token → agenda retry em vez de
      disparar e tomar 429 do Supabase. Evita queimar cota em burst (rajada pós-offline).
- [ ] `tests/e2e/offline.spec.ts`: reload com `data/*.json` abortado → quiz carrega do cache.
- [ ] Docs: `ARCHITECTURE.md` (ADR-001 reescrito, sem "precache SW" enganoso) + `LOG.md`.
- **Pronto:** offline reload OK · retry automático · budget mantido.

### Sprint 3 — Arquitetura limpa (P1)

- [ ] `src/controllers/quiz-controller.ts` (novo, ~200 linhas, classe pura: start/persist/finish/recordAttempt).
- [ ] `src/controllers/treino-controller.ts` (novo, ~150 linhas, classe pura).
- [ ] `src/controllers/sync-controller.ts` (finaliza o da Sprint 2, ~100 linhas).
- [ ] `src/components/app-shell.ts`: delega tudo → orquestrador fino (composição + estilos + auth gate).
      Meta <500 **reavaliada na execução**: lógica 100% em controllers (1324→1061); restam CSS (~450),
      templates declarativos e fluxos finos (auth/modal/estudo) — fatiar mais criaria prop-drilling
      (pior p/ manutenção). Critério de pronto passa a ser: zero lógica de quiz/treino/sync no shell.
- [ ] Ordem: 1 controller por vez, e2e após cada um. 100% métodos públicos com teste.
- [ ] Docs: `ARCHITECTURE.md` (ADR-008 + mapa `src/controllers/`) + `LOG.md`.
- **Pronto:** e2e 13/13 · zero `querySelector` cross-root novo · `tsc` limpo.
- **Nota:** `src/config/flags.ts` movido p/ Sprint 4 (só faz sentido com o primeiro consumidor real: study-hub).

### Sprint 3.5 — Catálogo UX (dinâmico principal + última atividade + rename)

> Pedido do dono: dinâmico como principal; fixos como opção secundária; última atividade visível.
- [ ] `src/components/app-shell.ts`: helper `dynamicSpec()` (seed novo a cada clique);
      orientação default = dinâmico (fixo só se escolhido no catálogo via `pendingSpec`);
      home "Começar simulado" → orientação do dinâmico; `startQuiz` pula restore p/
      `mode==='seed'` (seed novo = restore de sessão antiga não faz sentido).
- [ ] `src/components/catalog-screen.ts`: seção dinâmica no topo (destaque "Recomendado");
      heading "Simulados oficiais" → **"Simulados fixos"** (+ sub "mesmas 50 questões toda vez");
      cada linha mostra última atividade (`loadAllAttempts()` → por `simuladoId`:
      `última: 720 em 12/set` ou `nunca feito`).
- [ ] `tests/e2e/catalog.spec.ts`: 2 seletores → regex (nome acessível ganha sufixo "última: ...").
- [ ] `data/simulados.json`: **NÃO mexe** (títulos "Simulado Oficial N" preservados).
- [ ] Demais specs (quiz/gate/progress/offline/axe/overflow): sem mudança (dinâmico também 50q/100min).
- [ ] Docs: `LOG.md` + screenshot mobile do catálogo novo (leitura visual).
- [x] **Copy UX PT-BR** (executado junto): home hero (copy aprovada + linha certificação) +
      catálogo (bloco cert + link guia oficial direto + linha frescor do banco via `getBankLine()`) +
      empties com recuperação + jargão fora (Leitner/Caixa 1/"Stats"/keys cruas/"(ões)"/"Fracos") +
      labels PT consolidados em 1 export (`study-guide.ts`).
- [x] **Frescor visível**: home + catálogo exibem `Banco de N questões em português · atualizado em {mês/ano}`
      lido de `meta.json` em runtime (sempre verdadeiro, sem edição manual).
- **Pronto:** e2e 13/13 · catálogo mobile legível · dinâmico gera set novo a cada clique · zero jargão visível.

### Sprint 4 — Study Hub + qualidade de dados

- [ ] **Migration 004** `supabase/migrations/004_az104_study_hub.sql`:
      `az104_study_topics` (leitura auth, escrita admin) + `az104_study_profile`
      (own-rows: weak_domains, study_links, drill_history, preferences) + índices.
      Humano: rodar 1× no SQL Editor.
- [ ] **`data/study-topics.json`**: ~35 tópicos curados PT-BR (URLs oficiais MS Learn).
      Única curadoria manual pesada do plano (2-3h, uma vez; CI mantém depois).
      Fontes reais já coletadas (usar estas, não inventar URLs): guia oficial
      `.../resources/study-guides/az-104` (atualizado 23/03/2026) · página da certificação
      (atualizada 09/07/2026) · skills outline vigente desde 17/04/2026 (pesos
      20-25/15-20/20-25/15-20/10-15) · prova oferecida em Português (Brasil) ·
      corte 700 e 100 min confirmados.
- [ ] **`data/exam-syllabus.json`**: snapshot do outline oficial (30 min, uma vez).
- [ ] `src/study/topics.ts` + `src/study/study-hub.ts` (`generateStudyPlan`: score composto
      weak×3 + due×2 + distractor×2 + recência×1) + `src/study/study-profile.ts` (CRUD) +
      `src/sync/study-sync.ts` (push/pull profile + topics).
- [ ] `src/components/study-hub-panel.ts` + `src/components/study-link-card.ts`
      (prioridade alta, todos os tópicos expansíveis, drill, heatmap; "Abrir" + "Marcar lido" → `seen_at` sincronizado).
- [ ] `src/engine/irt.ts` (1PL Rasch) + `scripts/calibrate-irt.mts` —
      **gate: só usa no selector se `sampleSize >= 30`**, senão log e comportamento atual.
- [ ] `src/analytics/heatmap.ts` (subdomain×tipo×dificuldade + trend) +
      `src/analytics/distractor.ts` (flag se distractor > 40% dos erros) +
      `src/controllers/drill-controller.ts` (score composto → 10q).
- [ ] `src/engine/StudyGuide.ts` (+`studyLinks` por domain/subdomain via `sourceUrl` das
      questões `mslearn`, deduplicado) + `src/components/study-guide.ts`
      (seção "📚 Estude no Microsoft Learn" com cards clicáveis).
- [ ] `scripts/syllabus-gap.mts` (falta × sobra; saída pronta p/ corpo de issue).
- [ ] `build-simulados.mts`: pular questões com tag `deprecated` (1 linha + teste).
- [ ] **`src/config/flags.ts`** (novo, ~20 linhas): `isEnabled('study-hub' | 'drill' | 'gamification')`
      lido de `localStorage` (default por flag); primeiro consumidor real: study-hub
      (permite mergear Sprint 4 incompleta sem quebrar `main`).
- [ ] **Admin ampliado** `src/components/admin-panel.ts`: promover/rebaixar `role` na tabela
      de usuários (RLS já permite `admin update`; elimina o SQL manual p/ sempre) ·
      fila `needsReview` acionável (botão "aprovar" tira a flag) ·
      top 10 piores questões + sparkline SVG de score por usuário ·
      viewer `az104_admin_logs` (tabela existe, sem UI até hoje).
- [ ] Docs: `docs/STUDY-LINKS.md` (curadoria + CI mensal + RLS topics) +
      `ARCHITECTURE.md` (ADR-009 study hub, ADR-010 IRT gate, mapa `src/study/`,
      `src/analytics/`, migration 004) + `docs/ROADMAP.md` +
      `docs/QUESTION-GUIDELINES.md` (processo refresh: curadoria ≠ aquisição;
      reposição manual → IA → comunidade) + `LOG.md`.
- **Pronto:** links persistidos + sincronizados · heatmap responsivo (grid desktop / lista mobile) ·
      drill 10q E2E OK · gap report válido.

### Sprint 5 — Hardening + Docs & Vitrine

- [ ] **P4** `scripts/update-readme-test-count.mjs` + `test:count` no `ci` (cobre test count
      + bloco frescor auto: data do banco + verificação topics + outline vigente).
- [ ] **2.7** `navigator-grid.ts` (+`btnStyles`) · `study-guide.ts` (+`cardStyles`,`btnStyles`) ·
      `admin-panel.ts` (+`controlStyles`) · treino `alert()` → `modal-dialog` variant info.
- [ ] `scripts/validate-migration-types.mjs` (offline, migration↔types) no `ci`.
- [ ] **Zod fonte única**: `src/engine/question-schema.ts` passa a gerar os tipos
      (`type Question = z.infer<...>` já existe — estender p/ `AttemptRecord`/`DoubtRecord`/
      `ProgressRecord` via schemas Zod em `src/sync/types.ts`); o validador migration↔types
      compara SQL × Zod × TS em um só passo. Elimina drift em 3 fontes.
- [ ] **`scripts/new-question.mts`** (interativo): pergunta domínio/subdomínio/tipo/dificuldade,
      monta o JSON no schema, roda `validate` no item, imprime o bloco pronto p/ colar no
      `data/*.json` + checklist `QUESTION-GUIDELINES.md`. Guia contribuição sem adivinhação.
- [ ] **3 CIs novos**: `study-links.yml` · `question-curation.yml` · `exam-watch.yml`
      (molde `dependency-audit`: cron mensal dia 1 + `workflow_dispatch`; relatório em
      `.agent/audits/`; auto-PR mecânico / auto-issue com contexto).
- [ ] **Backup Supabase semanal** `.github/workflows/backup.yml` (novo): `pg_dump` (schema+data,
      via `supabase` CLI ou `postgres` URL de *leitura* em secret dedicado) → artifact do run
      (retenção 90 dias). Só leitura, nunca expõe senha em log (mask). Restaura manual via SQL Editor.
- [ ] **README.md** reescrito: descrição oficial A+Microsoft · PT-BR como diferencial ·
      badges (ci, deploy, security, perf, license MIT) · 3 screenshots · Study Hub ·
      números reais (57 testes, 950 questões, data do banco) · estrutura nova ·
      test count auto.
- [ ] **docs novos**: `docs/COMPONENTS.md` (catálogo Lit: props/eventos/estados/a11y) ·
      `docs/TESTING.md` (pirâmide, RPR, visual-manual, mutation trimestral) ·
      (`docs/STUDY-LINKS.md` se pendente da Sprint 4).
- [ ] **docs atualizados**: `SECURITY.md` (modelo real: Supabase+RLS+anon+CSP/SRI) ·
      `docs/ROADMAP.md` (estado real + Sprints 1-5) · `docs/ARCHITECTURE.md` (mapa final + Mermaid) ·
      `docs/API-REF.md` (study/controllers/profile/topics) · `docs/TROUBLESHOOTING.md`
      (seed parcial, CSP, links 404) · `TUTOR.md` (rotina com Study Hub + Drill) ·
      `CONTRIBUTING.md` (templates + `test:count`); remover `LogoPasseiAz104.png` se `cmp` confirmar duplicata.
- [ ] **package.json**: description / repository / homepage / bugs / author (ZeroBond85) / license MIT / keywords.
- [ ] **.github**: `ISSUE_TEMPLATE/` (bug-report, feature-request, question-item, config.yml) +
      `PULL_REQUEST_TEMPLATE.md` (o que muda + testes + screenshots + checklist ci/budget/axe).
- [ ] **index.html**: description + OG/Twitter tags + `public/icons/social-preview.png` 1280×640
      (gerado via spec Playwright temporário, deletado no run).
- [ ] Screenshots `docs/screenshots/` (home-desktop, quiz-mobile, study-hub-desktop, review-mobile; <300KB total).
- [ ] `CODE-REVIEW.md` final (verdict por área + riscos residuais).
- [ ] Commit único `docs: vitrine v7.1` → push → workflows verdes.
- [ ] **Humano (15 min, uma vez)** — checklist GitHub Settings:
      About (descrição oficial + site + topics `az-104 azure certification pwa offline-first lit supabase spaced-repetition typescript vite`) ·
      social preview upload · proteção `main` (require `build`+`e2e`) · Issues ON · Discussions ON
      (Q&A alimenta quarentena §8) · Wiki/Projects OFF · labels
      (`bug enhancement question-item docs ci study-links automated good-first-issue`) ·
      habilitar auto-merge (squash).
- **Pronto:** vitrine completa · OG válido · templates ativos · review assinado.

## 4. Fluxos automatizados end-to-end

### F1 — Link MS Learn apodrece → sozinho até o merge
`study-links.yml` (mensal) → HEAD 301 (redirect) → atualiza JSON → `validate` →
**PR auto + auto-merge** (checks verdes, diff só em `url`/`last_checked`/`last_status`) →
corpo do PR com log. Humano: zero. URL morta (404/timeout) → **issue** com tópico,
label e alternativa sugerida → humano escolhe substituta (5 min).

### F2 — Banco muda → meta e docs acompanham sozinhos
Qualquer PR tocando `data/*.json` → gate `bump-bank-meta --check` falha se drift →
autor roda `bump-bank-meta` (1 comando) → `countsByDomain` + `updatedAt` certos →
home + README exibem a data verdadeira sem edição manual.

### F3 — Prova atualizada → do outline ao banco sem adivinhação
`exam-watch.yml` (mensal) detecta outline novo → **issue auto já com gap report anexado**
(faltam N tópicos, M candidatas a obsoletas) + checklist
(`[ ] aprovar refresh` `[ ] gerar lote` `[ ] review` `[ ] rebuild`).
Humano marca os checks; `generate-questions --limit N` (grounding) + review +
`build-simulados` + `validate` fazem o resto. Tag `deprecated` só via PR (humano confirma a lista, 10 min).

### F4 — Pós-simulado → estudo sem decisão paralisante
`finish()` → `generateStudyPlan()` → Study Hub abre com top links MS Learn + drill pronto +
alerta Leitner. "Marcar lido" sincroniza (`seen_at`). Zero config: o plano se recalcula a cada simulado.

## 5. Onde o humano entra (lista fechada — todo o resto é máquina)

| # | Touchpoint | Frequência | Tempo |
|---|-----------|------------|-------|
| 1 | Review de questões IA (`needsReview`) — julgamento pedagógico, inautomatizável | por lote | 30-60 min/lote |
| 2 | Escolher substituta p/ link morto | esporádico | 5 min |
| 3 | Aprovar refresh pós-outline (checks da issue F3) | por atualização MS (~1-2×/ano) | 1 tarde |
| 4 | Rodar migration 004 no SQL Editor | uma vez | 5 min |
| 5 | GitHub Settings + auto-merge + social preview | uma vez | 15 min |
| 6 | Curadoria inicial: 35 topics + snapshot syllabus | uma vez | 3h |
| 7 | Brevo SMTP + validação 2 usuários + iOS físico (pré-existente, fora deste plano) | uma vez | 1-2h |
| 8 | Agendar a prova (§12: média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10) | o objetivo final | — |

## 6. Métricas de aceite (por sprint)

| Sprint | Métrica | Alvo |
|--------|---------|------|
| 1 | seed parcial impossível · CSP limpo · meta verdadeiro · budget no CI | teste unit + console + gate + job |
| 2 | offline reload · retry no `online` · rate-limit sem 429 em burst | `offline.spec` + listener + bucket |
| 3 | app-shell < 500 linhas · controllers cobertos · flags isolam features | `wc -l` + coverage + e2e 12/12 |
| 4 | links persistidos/sync · IRT gate · heatmap · drill E2E · gap válido · admin (roles, needsReview, top10, logs) · flags | profile + log + UI + teste + relatório |
| 5 | README auto · migration↔Zod↔TS · 3 CIs mensais + backup semanal · review assinado | script + job + PR + doc |

## 7. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| P1 quebra e2e | 1 controller por vez + e2e após cada um |
| IRT com amostra pequena | gate `sampleSize >= 30` + log "amostra insuficiente" |
| Auto-merge funde algo errado | diff restrito a arquivos esperados + checks obrigatórios; pesos/lógica nunca auto-merge |
| Outline muda formato da página (watch quebra parse) | job falha → issue "exam-watch parse falhou" → ajuste pontual |
| Curadoria 35 links consome tarde inteira | uma vez; CI mantém depois; pode fatiar por domínio |

## 8. Status

- [x] Sprint 1 — Bugs críticos + fundação
- [x] Sprint 2 — Offline-first real
- [x] Sprint 3 — Arquitetura limpa
- [x] Sprint 3.5 — Catálogo UX (dinâmico principal)
- [x] Sprint 4 — Study Hub + admin ampliado + qualidade de dados
- [ ] Sprint 5 — Hardening + Docs & Vitrine

## 9. Fora do v7.1 (registrado para não ressuscitar sem motivo)

**Pós-prova (ROADMAP, só após §12):** e2e em device físico (BrowserStack/farm) ·
push notifications (Web Push + VAPID) · app badge (`navigator.setAppBadge`) ·
periodic background sync · gamificação extra · analytics externo · loja ·
`ordering` de volta se fonte exigir · quarentena community (RoodneyMoraes, Anki 4k).

**Descartados com motivo:** soft delete + audit log dedicado (`attempts` já é append-only
imutável; `az104_admin_logs` existe) · COOP/COEP headers (só servem p/
`SharedArrayBuffer`, que o app não usa) · CSP report-only faseado (app pequeno:
enforce direto + teste local basta) · SW custom + Background Sync API (retry-cliente
cobre; `generateSW` testado) · Repository Pattern (6 classes só delegariam
`IndexedDB.ts`) · Event Bus (`CustomEvent` + delegação direta bastam) ·
lazy load + manualChunks (113KB gz ≪ teto 140KB; gatilho futuro: se JS gz > 130KB,
fatiar `admin-panel` primeiro) · visual regression no CI (flaky; prática manual
documentada em `docs/TESTING.md`) · mutation testing no CI (trimestral manual só em
`ScoringEngine`/`QuestionSelector`/`LeitnerEngine`, meta ≥80%) · contract tests via
`supabase gen types` (exigiria credencial no CI; validador offline migration↔Zod↔TS no lugar).
