# PLAN.md — PasseiAZ-104 v7.0 FINAL

> Endereço canônico: `\\wsl.localhost\Debian\home\ericsf\projects\PasseiSimuladosTI\AZ104`
> (no WSL: `~/projects/PasseiSimuladosTI/AZ104`)
> Meta primária: passar no AZ-104 (≥700/1000), sem data — agenda nas 3 condições do §12.
> Meta secundária: PWA production-ready. Custo: **$0**. Gates mandam. Qualidade sobre volume.
> **v7.0 (plataforma por usuário):** PasseiSimuladosTI = projeto pai; AZ-104 = 1º filho (`az104_`).
> Backend Supabase free (auth magic link + sync), marca revertida para o `source.png` do dono,
> cópia final + tela de Orientação (corte 700), experiência por usuário (histórico, streak,
> weak-map, dúvidas, resume, painel §12), Study Guide pós-simulado, tags de erro ×5, aba Admin.
> Regra dura: senha de BD nunca em chat/repo — incidente registrado em `LESSONS.md`.

---

## 0. PRINCÍPIOS

| # | Princípio | Regra operacional |
|---|---|---|
| 1 | Gates mandam | Sem prazo; critério com verificação executável. *"Gate sem verificação é prazo disfarçado"* |
| 2 | Qualidade sobre volume | Questão só entra cumprindo §4.1 |
| 3 | Zero custo runtime | IA só em `scripts/`. Segredo nunca com prefixo `VITE_` |
| 4 | Prova primeiro | Feature nova só entra se não atrasar a preparação |
| 5 | Formato real | **Simulado Oficial (§4): 50q / 100min / corte 700 — travado.** Treino (§3 `seed`): configurável |
| 6 | `.env` nunca commitado | gitleaks bloqueia |
| 7 | `source` obrigatório | Enforcement no Zod (§3) |
| 8 | Grounding oficial | Explanation só commita validada contra MS Learn (Learn MCP, free) |
| 9 | Sem overengineering | Cortes §15 |
| 10 | Tudo no WSL, projeto no filesystem Linux | Endereço canônico **`~/projects/PasseiSimuladosTI/AZ104`** (ext4). `/mnt/c` proibido como home (9P lento). `npm`, `git`, hooks, scripts, testes: tudo em WSL Ubuntu. Windows só abre VS Code (Remote-WSL). Node 24 via `nvm` no WSL; Node do Windows ignorado. `.gitattributes` `* text=auto eol=lf` (cobre hooks) no Dia 1 |
| 11 | Falha no CI = gap de teste (RPR) | Antes de re-disparar: (1) teste que reproduz, (2) regressão permanente, (3) `LESSONS.md`. Re-rodar "pra ver" é proibido. Exceções: flake de rede, outage externo, mudança só em workflow (só registro) |
| 12 | Dados > código | Decisões de domínio antes (§3/§4/§5) |

`AGENTS.md`: `DATA_PROVA=TBD` + gatilhos (§13).

---

## 1. STACK (free — pins reconfirmados no Dia 1)

Node **24.21.0** (nvm/WSL) · Vite **8.2.2** · TypeScript **6.0.3** (`moduleResolution: bundler`, `target: es2025`, `types: []`) · Lit **3.3.3** sem decorators · Zod **4.6.2** · Biome **2.5.12** · `idb` **8.0.3** · `vite-plugin-pwa` **1.3.0** (sem `sw.ts`, sem `workbox-cli`) · `@google/genai` **2.21.0** + pré-voo de modelos (§7) · `@supabase/supabase-js` **2.116.0** (auth + sync, §17) · Vitest **5.0.0**/Playwright **1.63.0**/axe **4.13.0** · Husky **9.1.7** · lint-staged **17.5.0** · tsx **4.21.0** (runner `.mts`) · Lighthouse **13.4.1** (só CI perf) · Learn MCP (free) · GH Pages (soft limits: 100GB/mês banda, 10 builds/h, 1GB site — folgado para este uso) · Supabase free (Auth 50k MAU + 500MB, §17).

**Notas de versão (v6.0):** TS 7 já é estável/GA — ficamos em 6.0.3 por pin de stack (reavaliação pós-prova, ROADMAP). Lockfile manda; o plano nunca declara versão mentirosa. Pins v6.0 conferidos em `tests/unit/pins.test.ts` (11 asserts).

**Lei de versões:** `.npmrc` `save-exact=true` criado **antes** de qualquer `npm install` (§16 passo 0) · sem `^`/`~` · `package-lock.json` fonte da verdade · `npm install` em workflow só com pin · Actions consistentes.

---

## 2. ESTRUTURA (`~/projects/PasseiSimuladosTI/AZ104`)

```
~/projects/PasseiSimuladosTI/AZ104/
├── PLAN.md (v7.0)  README.md  CONTRIBUTING.md  LICENSE (MIT)  SECURITY.md
├── TUTOR.md  LOG.md  LESSONS.md (RPR)  REGRAS.md (RPR+WSL+pin)
├── AGENTS.md (TBD + gatilhos)
├── package.json (exato)  package-lock.json  .npmrc  tsconfig.json  vitest.config.ts  playwright.config.ts
├── vite.config.ts (VitePWA, base /PasseiAZ104/)  biome.json  .gitattributes  .gitignore
├── .env.local (gitignored: SUPABASE_URL + ANON)  .env.example  .nvmrc (24)
├── public/icons/ source.png (origem do dono) + derivados letterbox #0a0e14 (icon-192/512, icon-maskable-512, apple-touch, favicon-32, header-112, hero-wide)
├── supabase/migrations/ 001_az104_progress_sessions.sql (tabelas + RLS)  002_az104_platform_user_admin.sql (per-user + admin)
├── src/
│   ├── main.ts
│   ├── styles/ variables.css (OKLCH + escala fluida)  global.css  components.css  dark.css  shared.ts (primitivos p/ shadow DOM)
│   ├── components/ (Lit, sem decorators)  app-shell.ts  login-screen.ts  user-menu.ts  theme-toggle.ts
│   │   question-card.ts (radiogroup)  timer-bar.ts  stats-dashboard.ts  navigator-grid.ts  review-card.ts (tags de erro §17)
│   │   study-guide.ts (P3)  progress-panel.ts (P2: streak/weak-map/dúvidas/§12)  admin-panel.ts (P5)
│   ├── engine/ QuizEngine.ts (writer único §5)  TimerEngine.ts  ScoringEngine.ts (§5)
│   │   LeitnerEngine.ts (cap §5)  QuestionSelector.ts  question-schema.ts (Zod §3)
│   │   ExplanationEngine.ts (só lê)  StudyGuide.ts (P3: analyzeAttempt + readiness §12)
│   ├── data/ QuestionLoader.ts (ADR-001: fetch + precache + IDB)
│   ├── sync/ IndexedDB.ts (v2: sessions/progress/meta/questions/attempts/doubts/activity/suggestions)
│   │   types.ts  supabase.ts  auth.ts  SyncEngine.ts (espelho §17: push/pull platform + admin)
│   └── utils/ azure-glossary.ts (→tooltip)  i18n.ts  questions-hash.ts (FNV-1a 64)  export.ts (só backup)
├── data/ identidade-governanca.json + identidade-acesso.json  storage.json
│   compute-vms.json + compute-apps.json + compute-platform.json  rede-virtual.json
│   monitoramento.json  case-studies.json (2 cases)  simulados.json (10 oficiais §3)  meta.json
├── scripts/ validate-questions.mts  generate-questions.mts  check-model.mjs
│   build-simulados.mts  import-community.mts  audit-secrets.ts  deploy-pages.mjs  render-icons.mts (emblem→PNGs+brand)  check-budget.mjs  check-lh.mjs
├── check-seq.mjs (sanidade do banco: contagem/dup/sequência)
├── tests/ unit/ (pins, schema, scoring, selector, engines)  integration/ (S2 fim-a-fim)
│   e2e/ (quiz, offline, gate, login+axe, axe home/quiz — rodam no CI)
├── docs/ ARCHITECTURE.md (+ADRs)  STUDY-PLAN.md  DEPLOY.md  API-REF.md
│   QUESTION-GUIDELINES.md  TROUBLESHOOTING.md (+restore)  ROADMAP.md  wsl-environment.md
│   multi-filho.md (receita p/ novos filhos)
├── .agent/audits/ (.gitkeep; reports datados; proibido report na raiz)
├── .github/ ISSUE_TEMPLATE/  PULL_REQUEST_TEMPLATE.md
│   workflows/ ci.yml (build+budget + job e2e)  deploy.yml (Secrets VITE_*)  perf.yml (lighthouse+check-lh)  security.yml  dependency-audit.yml  e2e-only.yml
├── .husky/ pre-commit (<10s)  pre-push (ci completo)
└── .opencode/skills/ accessibility/ (paleta logo2)
```

**v7.0:** árvore real acima (idêntica ao disco). Removidos: `check-env-parity.mjs`, `sync-docs.mjs`, `progress-ring.ts`, `case-study-panel.ts`, `emblem.svg`+`brand.svg` (marca reverteu para `source.png`), labs, utils não criados (reintroduzir com necessidade real).

---

## 3. SCHEMA (Zod 4)

```typescript
// Códigos TRAVADOS: ig/st/co/rv/mo (nunca [a-z]{2} genérico)
const CODE_BY_DOMAIN = {
  "identidade-governanca": "ig", "storage": "st", "compute": "co",
  "rede-virtual": "rv", "monitoramento": "mo" } as const;

const QuestionSchema = z.object({
  id: z.string().regex(/^az104-(ig|st|co|rv|mo)-\d{3}$/),
  domain: z.enum(["identidade-governanca","storage","compute","rede-virtual","monitoramento"]),
  subdomain: z.string().min(1),
  type: z.enum(["single","multiple","case-study","yes-no"]),  // `ordering` CORTADO (§15)
  difficulty: z.enum(["easy","medium","hard"]),
  question: z.string().min(50),
  options: z.array(z.object({ letter: z.string().regex(/^[A-F]$/),
    text: z.string().min(1) })).min(2).max(6),
  correct: z.array(z.string().regex(/^[A-F]$/)).min(1),
  explanation: z.string().min(100),
  source: z.enum(["original","mslearn","community","ai-generated"]),
  sourceUrl: z.string().url().optional(),
  generatedWith: z.object({ model: z.string(), date: z.string().datetime() }).optional(),
  needsReview: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  caseStudyId: z.string().optional(),
  // `weight` REMOVIDO (morto; scoring usa só difficulty)
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().default(1)
})
.superRefine((q, ctx) => {
  if ((q.source === "community" || q.source === "mslearn") && !q.sourceUrl)
    ctx.addIssue({ code: "custom", message: "sourceUrl obrigatório para community/mslearn" });
  if (q.type === "case-study" && !q.caseStudyId)
    ctx.addIssue({ code: "custom", message: "caseStudyId obrigatório para case-study" });
  if (q.type !== "case-study" && q.caseStudyId)
    ctx.addIssue({ code: "custom", message: "caseStudyId só permitido para case-study" });
  if (CODE_BY_DOMAIN[q.domain] !== q.id.split("-")[1])
    ctx.addIssue({ code: "custom", message: `id ${q.id} incompatível com domain ${q.domain}` });
  const letters = q.options.map(o => o.letter);
  if (new Set(letters).size !== letters.length)
    ctx.addIssue({ code: "custom", message: "options.letter duplicada" });
  const letterSet = new Set(letters);
  for (const c of q.correct)
    if (!letterSet.has(c))
      ctx.addIssue({ code: "custom", message: `correct ${c} fora de options` });
  if (q.type === "single" && q.correct.length !== 1)
    ctx.addIssue({ code: "custom", message: "single exige exatamente 1 correct" });
  if (q.type === "multiple" && q.correct.length < 2)
    ctx.addIssue({ code: "custom", message: "multiple exige >=2 correct" });
  if (q.type === "yes-no" && (q.options.length !== 2 || q.correct.length !== 1))
    ctx.addIssue({ code: "custom", message: "yes-no exige 2 options + 1 correct" });
  if ((q.type === "single" || q.type === "multiple" || q.type === "case-study") && q.options.length < 4)
    ctx.addIssue({ code: "custom", message: "single/multiple/case-study exigem >=4 options" });
});
// Validação cross-file (em validate-questions.mts, não no Zod):
//   caseStudyId DEVE existir em case-studies.json (órfão = erro de validate)
//   id único no banco inteiro; conteúdo FNV-1a 64 único (§5 dedup)

const SimuladoSchema = z.discriminatedUnion("mode", [
  // TREINO: configurável; distribuição = blueprint §4 arredondado por largest-remainder (§5)
  z.object({ mode: z.literal("seed"), id: z.string(), title: z.string().min(1),
    seed: z.number().int().nonnegative(), questionCount: z.number().int().min(1).max(100).default(50),
    timeLimitMinutes: z.number().int().min(10).max(300).default(100) }),
  // SIMULADO OFICIAL (§4): formato travado — exatamente 50q / 100min, distribuição fixa
  z.object({ mode: z.literal("fixed"), id: z.string(), title: z.string().min(1),
    questionIds: z.string().array().length(50)
      .refine(a => new Set(a).size === 50, { message: "questionIds duplicado" }),
    timeLimitMinutes: z.literal(100) })
]);
// meta.json (travado): { version, codes: {ig,st,co,rv,mo}, countsByDomain,
//   generatedWith: {model,date} | null, seedVersion, updatedAt }
```

---

## 4. BLUEPRINT (skills 17/abr/2026)

Faixas: Identidade 20–25% · Storage 15–20% · Compute 20–25% · Rede 15–20% · Monitor 10–15%.
**Simulado Oficial (travado): 50q / 100min / corte 700 — distribuição `ig 12 · st 9 · co 12 · rv 10 · mo 7` (soma = 50; cada domínio dentro da faixa: 24/18/24/20/14%).** Tipos: single .60 / multiple .20 / case .15 / yes-no .05. Dificuldade: easy .20 / medium .50 / hard .30.
**Treino (mode `seed`):** `questionCount` configurável; distribuição = mesmas proporções arredondadas por largest-remainder.
**Meta do banco: ~950 questões bem-validadas**, decomposta por domínio (proporção central do blueprint): ig ~230 · st ~170 · co ~230 · rv ~175 · mo ~145 (soma 950, tolerância ±5% por domínio). Antigas/obsoletas → pós-prova.
**Throughput anti-fila:** alvo 10–15q validadas/dia · WIP `needsReview<=50` — estourou = pausa `generate`, foca em review/grounding. Lotes de 50q com `validate` + grounding 100% (§4.1, sem amostragem).

### 4.1 Checklist (5, obrigatórios)

Cenário realista · 4 alternativas plausíveis (misconceptions reais, nunca fake services) · explanation ≥100 PT-BR c/ porquê de cada erro · grounded MS Learn (MCP+URL) · `validate` limpo.

---

## 5. MOTORES

**QuizEngine** `idle→loading→active→paused→reviewing→completed`. Navigator 50 (✅/⚑/○). Mark-review. **Persistência: writer único** — salva estado da sessão (respostas + `timerRemaining`) a cada 30s em uma única transação IDB; TimerEngine expõe `remaining` ao QuizEngine, nunca grava sozinho (sem corrida de records). `←/→`+`1–4`. Auto-submit.
**Case por bloco:** 1–2 cases completos contíguos (5q cada, de `case-studies.json`); 40–45 restantes completam a distribuição §4; faixas de blueprint absorvem a variância.
**TimerEngine** 100min (oficial); avisos 30/15/5/1; pausa opcional.
**ScoringEngine** (determinístico): `W={easy:15, medium:20, hard:25}`; `maxRaw` por dificuldade, nunca por tipo; múltipla `w×(k/n)`, erro marcado zera a questão; soma em float, só `round(raw/max×1000)` no final; `≥700`; `byDomain` + `weakAreas<70%`.
Exemplo canônico (50q: 10 easy + 25 medium + 15 hard): `maxRaw=10×15+25×20+15×25=1025`; corte = `ceil(0.7×1025)=718 raw`. Parcial: múltipla medium `n=3`, acerta `k=2` sem erro → `20×2/3≈13.33`.
**LeitnerEngine** 1/2/4/8/16d (5 caixas); `getDue(limite=50)`: Caixa 1 primeiro + aviso de fila reduzida.
**QuestionSelector** exclui últimas 100/domínio (histórico IDB); `usageCount` ASC; desempate por RNG seedado (mulberry32, seed do simulado); shuffle Fisher-Yates — alvo <100ms p/ 1.000q, teto 3s em teste CI; case só em bloco; **seed mode: quotas por domínio = blueprint × questionCount, arredondado por largest-remainder** (determinístico dado o mesmo seed).
**ExplanationEngine** só leitura.
**QuestionLoader (ADR-001):** `fetch()` + precache SW + IDB primeiro (seed 1ª carga, versão `meta.json`). Bundle nunca carrega as ~950.
**Dedup:** `id` primário; conteúdo FNV-1a 64 normalizado.

---

## 6. UX + MARCA

**Marca v7.0:** `source.png` do dono (revertido em 9a93f98) — derivados letterbox `#0a0e14`: `icon-192/512`, `icon-maskable-512` (arte ≤62%), `apple-touch-icon`, `favicon-32`, `header-112.png` (176×112), `hero-wide.png` (1024×650). Manifest `Passei AZ-104`/`PasseiAZ104`, `education`, PT-BR, theme/bg `#0a0e14`. Header + login com hero. **Copy final (1da4e70):** "Estudo para o exame AZ-104" (tagline), hero sem jargão (sem "corte 700"/"revisão espaçada"), **"corte 700" só na tela de Orientação** junto a 50q/100min/regras. H1 `sr-only`.
**Cor→significado (OKLCH, Baseline 2026):** azul progresso · verde `--brand-green` acerto/maestria (box 5; ring→check 100%) · dourado `--warning` streaks · `--progress-ink` p/ texto AA sobre escuro · dark, light opt-in.
**UX:** timer sticky mono tabular + "progresso salvo ✓" + "sincronizando ☁" · Simulado Oficial=Pearson VUE · pulo livre + pausa + confirmação ("X sem responder") · 1 questão/tela · pergunta `--fs-xl` 650 > opções 48px em chip · `radiogroup` + `aria-checked` · progresso "Questão X de 50" com `aria-live` · `@starting-style` + transições sob `no-preference` · ≥44px · **tabs bottom mobile / top desktop** (pill ativa AA) · `viewport-fit=cover`+`safe-area`+`100dvh` · prompt install + offline · WCAG AA + axe 0 · Lighthouse 98/100/100.

---

## 7. MODELO IA

`check-model.mjs`: chave? → probe (1 token, 20s) sobre lista de candidatos **em ordem de preferência** → 1º 200 = modelo → `meta.json.generatedWith`. 404→próximo · 401→troque a chave · 429→backoff 60s→5min→30min; pausa diária só após 3×429 seguidos (checkpoint intacto + `generate --resume`).
**Candidatos (v6.0, set/2026): `["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash"]`.** Modelos 2.5-flash / 2.5-flash-lite têm desligamento anunciado na Gemini Developer API (out/2026) e 3-flash-preview é preview migrável — **fora da lista**. Design absorve depreciação: trocar a lista ≠ reescrever código; lista re-verificada pelo probe a cada execução e re-revisada em todo `dependency-audit.yml` mensal.
Batch: 1 req/5s + backoff · flags `--limit --dry-run --resume` · checkpoint `data/.generation-state.json` (gitignored) + espelho `~/.az104-gen-state.json` + restore testado em S2 (TROUBLESHOOTING) · grounding MCP · `source:"ai-generated"`+modelo+data; `needsReview:true` se grounding falhar (entra no WIP §4).

---

## 8. FONTES

1. exam-simulator (MIT, abr/2026) → 2. AzureCertPrep (matrix 57/57) + labs → 3. timothywarner → ⏸ **PÓS-PROVA:** RoodneyMoraes, Anki 4k, Study-Guide MD → Assessment oficial: só calibração → certbuzz: ROADMAP.
`import-community.mts`: fetch → quarentena → validate.

---

## 9. SEGURANÇA + HOOKS

`.gitignore` estrito (+`.generation-state.json`, `.env*`). gitleaks.
**pre-commit (<10s):** SECRET GUARD → LINT → VALIDATE → **SIZE GUARD (arquivo `data/*.json` ≤200KB; estourou = particiona por subdomínio)** → RESIDUE GUARD.
**pre-push:** `npm run ci` completo. `--no-verify` proibido fora de emergência documentada.

---

## 10. CI/CD

`ci.yml` (Node 24) · `deploy.yml` (Pages, Actions source, `permissions: pages:write+id-token:write`, `concurrency: pages`, `base: /PasseiAZ104/` em `vite.config.ts`) · `security.yml` (gitleaks) · `dependency-audit.yml` mensal (→`.agent/audits/`; re-revisa lista de modelos §7) · `e2e-only.yml` dispatch (~4min). `timeout-minutes` por job. Majors no Dia 1. Branch `main` protegida após 1º push verde (require CI).

---

## 11. MILESTONES (status real — banco 950/950 fechado em 12/set/2026)

**S1 — Fundação ✅.** D1→D5 executados. **Gate S1 ✅.**
**S2 — Engines TDD + 50q Identidade ✅. Gate ✅.**
**S3 — Persistência+Leitner+offline+e2e ✅. Gate 0A 13/13 ✅** (Lighthouse 98/100/100; baseline `B` = estudo humano pendente).
**S4 ✅ (80q Compute) · S5 ✅ (80q Rede + pipeline IA) · S6 ✅ (55q Storage + 55q Monitoramento + 2 cases).**
**S7 ✅ (10 simulados oficiais + import). Gate 0B parcial (máquina):** banco ✓ · simulados ✓ · explicações ✓ · scores = estudo humano.
**S8–S13 ✅ (banco 950/950).** Lotes por déficit até fechar §4: ig 230 · st 170 · co 230 · rv 175 · mo 145. Partições SIZE GUARD: identidade-acesso, compute-vms/apps/platform.
**S14 — opcional/revisão (aberto). S15–16 — parcial:** axe 0 ✅ + Lighthouse 98/100/100 ✅ · iOS físico pendente (humano).
**S17+ — PÓS-PROVA ANTECIPADO (v6.0/v7.0 NO AR ✅):** backend multi-filho (backend v6.0 na nuvem) +
**plataforma por usuário v7.0** (16/set/2026): migration 002, IDB v2, Study Guide, tags de erro, aba Admin,
Progresso com streak/§12 — **QA local ✅ (e2e 9/9, axe 0, CI verde)**, commit 36d69ef+4571609. Falta:
execução manual da migration 002 no Supabase (dono) + validação 2 usuários · iOS físico (humano) ·
quarentena community · gamificação · push · analytics · loja.

---

## 12. ESTUDO ADAPTATIVO

**Rotina:** 15min Leitner (cap, Caixa 1) + bloco do tema. Errou → explanation + LOG. <70% 2 sessões → prioridade seguinte. S1: guide + Assessment diagnóstico.
**Checkpoints:** S3=`B` · S7=`B+150` (abaixo: +1 sem reforço) · S11=`B+250` · **FIM: média-5 ≥750.**
**Painel de prontidão (aba Progresso, v7.0 P2):** `readiness()` computa em client-side as 3 condições — média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10 — e vira checkmark list. Streak = dias ativos consecutivos (simulado finalizado OU ≥10 questões OU ≥1 dúvida resolvida).
**Agendar (cumulativas):** média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10 → agenda com ~2 semanas. Horário real + flashcards; 2 dias descanso.

---

## 13. SKILLS

🌍 Globais (`~/.config/opencode/skills/`): `test-driven-execution`, `code-review`, `doc-sync`, `dependency-audit`, `frontend-design` (neutralizado) → S3 `webapp-testing` → Fase 3 `ux`+`visual-design`.
📁 Repo: `.opencode/skills/accessibility/` + gatilhos `AGENTS.md`.

---

## 14. DEFINITION OF DONE

0A: 13 itens. 0B: gate S7. 1: validate + 57/57 + totais §4 (950±tolerância). 3: ≥95 + axe limpo. Pré-prova: 3 condições §12.

---

## 15. CORTES

`sw.ts`, `workbox-cli`, TS 7 (GA, reavaliação pós-prova), OpenRouter/runtime, cascata multi-provider, sync-docs classifier, Capacitor garantido, gamificação extra, push, analytics externo, loja, changelog separado, reports na raiz, migration/rollback, **`weight`**, **`ordering` (volta pós-prova se fonte exigir)**, **`check-env-parity.mjs` + `sync-docs.mjs` (órfãos)**. **`export.ts` = só backup progresso.** (Auth entrou na v6.0 — corte "auth pré-prova" consumido.)

---

## 16. DIA 1 — RECOMEÇO LIMPO (WSL Debian, endereço final `~/projects/PasseiSimuladosTI/AZ104`)

**Descartado o parcial em `/mnt/c` (sem devDeps, sem git — nada a preservar). Mantido: Debian + nvm + Node 24.21.0. Primeiro: segurar o insubstituível e o guard-rail de versões ANTES do primeiro `npm`. Scaffold via `create-vite --overwrite` (v9+: `--force` não existe mais) — `PLAN.md` e assets DEVEM ser restaurados/copiados DEPOIS do scaffold, nunca antes.**

```bash
# 0. insubstituível + guard-rails ANTES de qualquer npm (Lei de versões §1)
export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"  # shell não-interativo não carrega nvm sozinho
mkdir -p ~/az104-stash
[ -d /tmp/az104-stash ] && mv /tmp/az104-stash/* ~/az104-stash/ 2>/dev/null; ls ~/az104-stash
cd ~/projects/PasseiSimuladosTI/AZ104
printf 'save-exact=true\n' > .npmrc
printf '24\n' > .nvmrc
printf '* text=auto eol=lf\n' > .gitattributes

# 1. scaffold (ATENÇÃO: --overwrite APAGA o conteúdo do dir — rode com o dir contendo SÓ o .git)
git remote -v | grep -q origin || git remote add origin https://github.com/ZeroBond85/PasseiAZ104.git
npm create vite@latest . -- --template lit-ts --overwrite
# re-pin IMEDIATO (scaffold puxa latest) + reconfirma versões reais
npm install --save-exact vite@8.2.2 typescript@6.0.3 lit@3.3.3 idb@8.0.3
npm install --save-exact -D @biomejs/biome@2.5.12 vite-plugin-pwa@1.3.0 @google/genai@2.21.0 \
  vitest @playwright/test @axe-core/playwright husky@9.1.7 lint-staged@17.5.0 @types/node
# se `npm view <pkg> version` > pin: atualiza pin no PLAN §1 antes do commit
npx husky init

# 2. docs + marca + skills (DEPOIS do scaffold, nunca antes)
# PLAN.md (v6.0, este documento) + README + AGENTS + REGRAS + LOG + LESSONS + wsl-environment.md
# + .agent/audits/.gitkeep
# skills: 5 globais + accessibility + cp ~/az104-stash/<logo>.png public/icons/source.png

# 3. commit + push + Pages + CI verde
git branch -M main
git add . && git commit -m "chore: scaffold Vite 8 + Lit + TS 6 + docs base" && git push -u origin main
```

**Gate Dia 1:** repo + CI verde + Pages (base `/PasseiAZ104/`) + PLAN.md v6.0 + skills. Sem componente — proposital.

**⚠️ LESSONS (11/set/2026, incidente real):** `npm create vite --force` (sintaxe v8) foi rejeitado pelo create-vite 9.x (`Operation cancelled` com stdin fechado); a flag correta é `--overwrite` — que **apaga todo o conteúdo pré-existente** (perdemos `LogoPasseiAz104.png`, restaurado via re-upload; `PLAN.md` reescrito do registro aprovado). Lição travada: scaffold SEMPRE em dir contendo só `.git`; docs/assets entram no passo 2.

---

## Mapa das resoluções (v7.0)

| # | Onde |
|---|---|
| 1 códigos travados + id↔domain | §3 + `meta.json` + guidelines |
| 2 superRefine (+caseStudyId condicional) | §3 |
| 3 size guard 200KB/arquivo, particiona | §9 |
| 4 fetch+precache+IDB (ADR-001) | §5 |
| 5 score determinístico + exemplo canônico | §5 |
| 6 case por bloco | §5 |
| 7 FNV-1a 64 | §5 |
| 8 gate numerado verificável | §11 |
| 9 `weight` cortado | §15 |
| 10 SimuladoSchema: treino configurável × Oficial travado (50×100min) | §3, §4, §0.5 |
| 11 `export.ts` mínimo | §15 |
| 12 split hooks <10s/ci | §9 |
| 13 Leitner cap | §5 |
| 14 backup checkpoint duplo + restore testado em S2 | §7 |
| 15 regras por tipo (single/multiple/yes-no) | §3 |
| 16 selector Fisher-Yates <100ms + largest-remainder seed | §5 |
| 17 IA 429 backoff + WIP needsReview + lista de modelos viva (audit mensal) | §4, §7, §10 |
| 18 Dia 1: .npmrc antes de npm, --overwrite, remote check, re-pin scaffold | §16 |
| 19 **distribuição oficial soma 50: 12/9/12/10/7** | §4 |
| 20 `ordering` cortado (tipo morto) | §3, §15 |
| 21 S6 com domínios nomeados (st 50 + mo 50) | §11 |
| 22 conta fecha: marcos somam 950 = meta §4 (por domínio) | §4, §11 |
| 23 FK caseStudyId em validate + writer único de sessão | §3, §5 |
| 24 verdades externas: Pages soft-limits, TS 7 GA, modelos Gemini atuais | §1, §7 |
| 25 backend free multi-filho: prefixo `az104_`, RLS, sync last-write-wins | §17 |
| 26 login magic link + gate + `?local=1` só p/ e2e | §17 |
| 27 UX: logo 180 login / 56 header, ícones PWA reais, polish sem telas novas | §6, §17 |
| 28 axe 0 + Lighthouse 98/100/100 | §14 |
| 29 UX 2026: OKLCH, radiogroup, progresso aria-live, @starting-style, tipografia fluida | §6 |
| 30 pins reais no teste (zod 4.6.2, tsx, supabase 2.116.0) + vitest.config | §1 |
| 31 check-seq.mjs: sanidade do banco (contagem/dup/sequência) | §4 |
| 32 marca: reverter para source.png, derivados letterbox + hero-wide | §6 |
| 33 copy final sem jargão + tela de Orientação ("corte 700" só lá) | §6 |
| 34 migration 002: profiles(role+email)/attempts/doubts/activity_log/study_suggestions/admin_logs + az104_is_admin() RLS | §17 |
| 35 IDB v2 + SyncEngine push/pull platform (LWW por updatedAt/createdAt) | §17 |
| 36 Study Guide pós-simulado (analyzeAttempt) + snapshot diário em suggestions | §17, §12 |
| 37 tags de erro ×5 no review (concept_gap/silly_mistake/misread/trap/timeout) → attempts.error_tags + doubts | §17 |
| 38 aba Admin (KPIs, usuários, analytics por questão c/ distrator, CSV, fila dúvidas; só role admin) | §17 |
| 39 axe em toda aba (h1 sr-only por tela acionável) | §14 |

---

## 17. BACKEND MULTI-FILHO (v7.0 — Supabase free, $0)

PasseiSimuladosTI = pai; cada certificação = filho com prefixo de tabelas (`az104_*`;
próximos: `dp900_*`, …). Um login serve todos os filhos.

- **Auth:** magic link (sem senha de app). Gate: com sync habilitado e sem sessão → `login-screen`.
- **Credenciais:** `.env.local` (gitignored) com `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
  (pública por design; proteção real = RLS). **Senha do Postgres nunca em chat/repo/env.**
- **Sync:** IDB = fonte de leitura (offline-first intacto); Supabase = espelho. Push/pull com
  LWW: progressos por `updatedAt` + `box` usa `max()` (Leitner nunca regride); attempts/suggestions
  append-only (merge por id); doubts por `updatedAt`; activity por chave `(date,kind)` `createdAt`.
- **Migrations:** `001_*.sql` (tabelas + RLS `auth.uid() = user_id`); **`002_az104_platform_user_admin.sql`**
  — `az104_profiles` (role check user/admin + email), `az104_attempts` (answers/by_domain/error_tags jsonb,
  duration_seconds), `az104_doubts` (1 por questão + tag), `az104_activity_log` (PK user+date+kind),
  `az104_study_suggestions`, `az104_admin_logs`; função `az104_is_admin()` SECURITY DEFINER comandando as RLS
  (próprio registro vs. admin logado). **Execução manual no SQL Editor pelo dono; validar com 2 usuários
  antes de habilitar o front em produção** (instrução no cabeçalho do SQL).
- **Admin (v7.0 P5):** aba visível só para `role='admin'` (`getProfileRole` + `upsertOwnProfile` grava
  email; role só owner promove por SQL). RLS filtra tudo; `admin-panel.ts` lê via Supabase e agrega em
  client-side (KPIs, drill por questão com distrator mais escolhido, CSV sem depender de server).
- **Experiência por usuário (P2/P3/P4):** aba Progresso (histórico, streak por `activity_log`, weak-map
  SVG por domínio, CRUD leve de dúvidas, prontidão §12), Study Guide pós-simulado (`analyzeAttempt`,
  `topErrors` + sourceUrl, tips, ação "treinar domínio fraco"; snapshot em `az104_study_suggestions`),
  tags de erro ×5 nos `review-card` alimentando `attempts.error_tags` + `az104_doubts`.
- **Deploy:** `VITE_*` via GitHub Secrets (`deploy.yml`); build sem env = modo 100% local.
- **e2e:** `?local=1` desliga o gate (test-only, nunca em produção); `login.spec.ts` cobre gate + validação;
  `progress.spec.ts` cobre attempt→IDB→streak/dúvida e ausência da aba Admin sem role.

---

*PLAN.md v7.0 FINAL — endereço `~/projects/PasseiSimuladosTI/AZ104`.*
