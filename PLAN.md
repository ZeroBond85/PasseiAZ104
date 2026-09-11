# PLAN.md — PasseiAZ-104 v5.0 FINAL

> Endereço canônico: `\\wsl.localhost\Debian\home\ericsf\projects\PasseiSimuladosTI\AZ104`
> (no WSL: `~/projects/PasseiSimuladosTI/AZ104`)
> Meta primária: passar no AZ-104 (≥700/1000), sem data — agenda nas 3 condições do §12.
> Meta secundária: PWA production-ready. Custo: **$0**. Gates mandam. Qualidade sobre volume.

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

Node **24.21.0** (nvm/WSL) · Vite **8.2.2** · TypeScript **6.0.3** (`moduleResolution: bundler`, `target: es2025`, `types: []`) · Lit **3.3.3** sem decorators · Zod **4.x** (pt-BR) · Biome **2.5.12** · `idb` **8.0.3** · `vite-plugin-pwa` **1.3.0** (sem `sw.ts`, sem `workbox-cli`) · `@google/genai` **2.21.0** + pré-voo de modelos (§7) · Vitest/Playwright/axe latest-pinned · Husky **9.1.7** · lint-staged **17.5.0** · Learn MCP (free) · GH Pages (soft limits: 100GB/mês banda, 10 builds/h, 1GB site — folgado para este uso) · Supabase **só Fase 4**.

**Notas de versão (v5.0):** TS 7 já é estável/GA — ficamos em 6.0.3 por pin de stack (reavaliação pós-prova, ROADMAP). Se no Dia 1 `npm view <pkg> version` retornar versão MAIS NOVA que os pins acima, os pins do plano são atualizados no próprio Dia 1 antes do commit (lockfile manda; o plano nunca declara versão mentirosa).

**Lei de versões:** `.npmrc` `save-exact=true` criado **antes** de qualquer `npm install` (§16 passo 0) · sem `^`/`~` · `package-lock.json` fonte da verdade · `npm install` em workflow só com pin · Actions consistentes.

---

## 2. ESTRUTURA (`~/projects/PasseiSimuladosTI/AZ104`)

```
~/projects/PasseiSimuladosTI/AZ104/
├── PLAN.md  README.md (hero: logo1)  CONTRIBUTING.md  LICENSE (MIT)  SECURITY.md
├── TUTOR.md  LOG.md  LESSONS.md (RPR)  REGRAS.md (RPR+WSL+pin)
├── AGENTS.md (TBD + gatilhos)
├── package.json (exato)  package-lock.json  .npmrc  tsconfig.json
├── vite.config.ts (VitePWA, base /PasseiAZ104/)  biome.json  .gitattributes  .gitignore
├── .env  .env.example  .nvmrc (24)
├── public/icons/source.png  ← logo2
├── src/
│   ├── main.ts
│   ├── styles/ variables.css (+--brand-green)  global.css  components.css  dark.css
│   ├── components/ (Lit)  app-shell.ts  question-card.ts  timer-bar.ts
│   │   stats-dashboard.ts  progress-ring.ts (check 100%)  theme-toggle.ts
│   │   review-card.ts  navigator-grid.ts  case-study-panel.ts
│   ├── engine/ QuizEngine.ts (writer único §5)  TimerEngine.ts  ScoringEngine.ts (§5)
│   │   LeitnerEngine.ts (cap §5)  QuestionSelector.ts  ExplanationEngine.ts (só lê)
│   ├── data/ QuestionLoader.ts (ADR-001)
│   ├── sync/ IndexedDB.ts  types.ts  migrations.ts  SyncEngine.ts (mínima Fase 4)
│   └── utils/ azure-glossary.ts (→tooltip)  i18n.ts  questions-hash.ts (FNV-1a 64)  export.ts (só backup)
├── data/ identidade-governanca.json  storage.json  compute.json  rede-virtual.json
│   monitoramento.json  case-studies.json (10×5)  simulados.json (§3)  meta.json (códigos)
├── labs/README.md
├── scripts/ validate-questions.mts  generate-questions.mts  check-model.mjs
│   import-community.mts  audit-secrets.ts  deploy-pages.mjs
├── tests/ unit/ (5)  integration/ (IDB)  e2e/ (quiz, offline, review + axe Fase 3)
├── docs/ ARCHITECTURE.md (+ADRs)  STUDY-PLAN.md  DEPLOY.md  API-REF.md
│   QUESTION-GUIDELINES.md (SKILL.md + códigos)  TROUBLESHOOTING.md (+restore)
│   ROADMAP.md  wsl-environment.md
├── .agent/audits/ (.gitkeep; reports datados; proibido report na raiz)
├── .github/ ISSUE_TEMPLATE/  PULL_REQUEST_TEMPLATE.md
│   workflows/ ci.yml  deploy.yml  security.yml  dependency-audit.yml  e2e-only.yml
├── .husky/ pre-commit (<10s)  pre-push (ci completo)
└── .opencode/skills/ accessibility/ (paleta logo2)
```

**v5.0:** removidos da árvore `check-env-parity.mjs` e `sync-docs.mjs` (órfãos — reintroduzir com definição se surgir necessidade real; `doc-sync` cobre sincronização de docs).

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

**`logo2`:** `public/icons/source.png` → 192/512/maskable/favicon/apple-touch (padding `#0a0e14`). Manifest `Passei AZ-104`/`PasseiAZ104`, `education`, PT-BR, theme/bg `#0a0e14`. Header 32px em container `--surface`. `logo1`: hero README + Sobre.
**Cor→significado:** azul progresso · verde `--brand-green #4CAF50` acerto/maestria (box 5; ring→check 100%) · dourado `--warning` streaks · dark `#0a0e14`, light opt-in.
**UX:** timer sticky + "progresso salvo ✓" · Simulado Oficial=Pearson VUE · pulo livre + pausa + confirmação ("X sem responder") · 1 questão/tela · glossário→tooltip · ≥44px · **tabs bottom mobile / top desktop** · `viewport-fit=cover`+`safe-area`+`100dvh` · prompt install + offline · WCAG AA.

---

## 7. MODELO IA

`check-model.mjs`: chave? → probe (1 token, 20s) sobre lista de candidatos **em ordem de preferência** → 1º 200 = modelo → `meta.json.generatedWith`. 404→próximo · 401→troque a chave · 429→backoff 60s→5min→30min; pausa diária só após 3×429 seguidos (checkpoint intacto + `generate --resume`).
**Candidatos (v5.0, set/2026): `["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3-flash"]`.** Modelos 2.5-flash / 2.5-flash-lite têm desligamento anunciado na Gemini Developer API (out/2026) e 3-flash-preview é preview migrável — **fora da lista**. Design absorve depreciação: trocar a lista ≠ reescrever código; lista re-verificada pelo probe a cada execução e re-revisada em todo `dependency-audit.yml` mensal.
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

## 11. MILESTONES (ordem, sem datas; fecha a conta de §4 = ~950)

**S1 — Fundação** (12–16h). D1 repo+remote · D2 `lit-ts`+deps+configs+`.gitattributes` · D3 design system · D4 shell+toggle+main · D5 Husky+workflows. **Fim:** PLAN.md + README + AGENTS(TBD+gatilhos) + REGRAS + LOG + LESSONS + `wsl-environment.md` + `.agent/audits/.gitkeep` + skills globais + `accessibility` + `source.png`. Push → Pages.
**Gate S1:** 4 tabs · dark · CI verde · zero console-error · PLAN.md no projeto.
**S2 — Engines TDD + 50q Identidade (ig: 50)** (16–20h). **Gate:** 50q fim-a-fim + score §5 + review + validate. **Estudo:** ≥70%.
**S3 — Persistência+Leitner+offline+Lighthouse ≥90+e2e** (14–18h). **Gate 0A (13):** (1) 4 tabs teclado+toque · (2) tema persiste · (3) 50q/100min · (4) flags · (5) score+breakdown · (6) review total · (7) Leitner c/ cap · (8) IDB reload · (9) kill server funciona · (10) validate · (11) CI · (12) Pages · (13) Lighthouse ≥90/90/90. **Estudo: baseline `B`.**
**S4 — 80q Compute (co: 80) · S5 — 80q Rede (rv: 80) + generate · S6 — 50q Storage + 50q Monitoramento (st: 50, mo: 50) + 2 cases.** **Estudo:** 30–40q/dia + Leitner 15min + labs.
**S7 — 10 simulados + import fontes 1–3.** **Estudo:** 2º simulado. **Gate 0B:** banco validado · 10 simulados · explicações · scores no LOG.
**S8–S13 — meio-do-banco (lotes de 50q, ~640q) + 8 cases + 57/57.** Distribuição dos lotes segue déficit por domínio até fechar §4: ig +180 · st +120 · co +150 · rv +95 · mo +95 (=640; totais ig 230 · st 170 · co 230 · rv 175 · mo 145 = 950). **Gate:** validate + cobertura 57/57 + totais dentro da tolerância §4. Volume = qualidade, Gate 0B impõe ritmo.
**S14 — opcional/revisão. S15–16 —** ≥95 + axe 0 + iOS. **S17+ (pós-prova):** Supabase + v1.0.0 · quarentena · gamificação · push · analytics · loja ($25/$99 ano).

---

## 12. ESTUDO ADAPTATIVO

**Rotina:** 15min Leitner (cap, Caixa 1) + bloco do tema. Errou → explanation + LOG. <70% 2 sessões → prioridade seguinte. S1: guide + Assessment diagnóstico.
**Checkpoints:** S3=`B` · S7=`B+150` (abaixo: +1 sem reforço) · S11=`B+250` · **FIM: média-5 ≥750.**
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

`sw.ts`, `workbox-cli`, TS 7 (GA, reavaliação pós-prova), auth pré-prova, OpenRouter/runtime, cascata multi-provider, sync-docs classifier, Capacitor garantido, gamificação extra, push, analytics externo, loja, changelog separado, reports na raiz, migration/rollback, **`weight`**, **`ordering` (volta pós-prova se fonte exigir)**, **`check-env-parity.mjs` + `sync-docs.mjs` (órfãos)**. **`export.ts` = só backup progresso.**

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
# PLAN.md (v5.0, este documento) + README + AGENTS + REGRAS + LOG + LESSONS + wsl-environment.md
# + .agent/audits/.gitkeep
# skills: 5 globais + accessibility + cp ~/az104-stash/<logo>.png public/icons/source.png

# 3. commit + push + Pages + CI verde
git branch -M main
git add . && git commit -m "chore: scaffold Vite 8 + Lit + TS 6 + docs base" && git push -u origin main
```

**Gate Dia 1:** repo + CI verde + Pages (base `/PasseiAZ104/`) + PLAN.md v5.0 + skills. Sem componente — proposital.

**⚠️ LESSONS (11/set/2026, incidente real):** `npm create vite --force` (sintaxe v8) foi rejeitado pelo create-vite 9.x (`Operation cancelled` com stdin fechado); a flag correta é `--overwrite` — que **apaga todo o conteúdo pré-existente** (perdemos `LogoPasseiAz104.png`, restaurado via re-upload; `PLAN.md` reescrito do registro aprovado). Lição travada: scaffold SEMPRE em dir contendo só `.git`; docs/assets entram no passo 2.

---

## Mapa das 24 resoluções (v5.0)

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

---

*PLAN.md v5.0 FINAL — endereço `~/projects/PasseiSimuladosTI/AZ104`.*
