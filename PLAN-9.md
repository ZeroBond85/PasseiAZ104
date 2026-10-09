# PLANO MESTRE v9.0 — PASSEIAZ-104

**Supercede:** `PLAN.md` v7.0 · o plano v8.0 não versionado foi auditado e **rejeitado** (§0)
**Base:** `58aa088` + árvore de trabalho
**Ambiente:** WSL (`~/projects/PasseiSimuladosTI/AZ104`). Tudo roda via `wsl.exe -e bash -lc`.
**Estado do CI no momento da escrita:** `npm run ci` → **EXIT 0, sem erro e sem warning** (§2)

---

## Regra de CI (bloqueante, sem exceção)

- **Um gate só fecha com o comando em código de saída 0.**
- **Warning é falha.** `27 errors, 11 warnings, 3 infos` não está verde.
- **Erro e warning pré-existentes se corrigem** — não se anotam nem se adiam.
- Gate que só imprime "AVISO" com exit 0 é **gate quebrado**: corrija o gate.
- **Nenhum comando inventado** — só o que existe em `package.json`/CI.
- Falha → reproduzir com saída integral → causa raiz citando `arquivo:linha` → corrigir → rodar até 0.
  **Re-rodar "praver" é proibido.**
- Correção que quebra gate anterior → `LESSONS.md` (§0.11).

---

## §Invariantes inegociáveis do produto

**1000 questões é a capa do projeto.** Não é número de conveniência: encolher é
regressão de escopo, e crescer exige decisão explícita, não puxão de PR.

Até a Onda 0 isso **não era invariante, era coincidência**: `validate-questions.mts:358`
fazia `console.log(\`validate: ${total} questões\`)` — log, não asserção. Nenhum teste
exigia 1000 (os `1000` em `tests/` são `mockResolvedValue(1000)` ou valores de nota).
Apagar 50 questões mantinha o CI verde. `meta:check` pegaria parte disso via
`countsByDomain`, mas uma remoção coordenada com o `meta.json` passaria.

**Corrigido:** `TOTAL_ESPERADO = 1000` com `fail()` em `validate-questions.mts:361`.
Controle demonstrado: 1000 → EXIT 0 · 997 → `ERRO: banco com 997 questões; o invariante
do projeto exige 1000 (-3)` → EXIT 1.

### O que o verde já prova (qualidade exigida, não desejada)

| Invariante | Onde |
|---|---|
| `single` = 1 gabarito · `multiple` ≥ 2 · `correct` dentro de `options` · `letter` sem duplicata | `question-schema.ts:87-104` |
| `id` compatível com `domain` | `question-schema.ts:72-76` |
| `caseStudyId` só em `case-study`, e obrigatória nela | `question-schema.ts:60-70` |
| `sourceUrl` obrigatório para `community`/`mslearn` | `question-schema.ts:54` |
| id duplicado · conteúdo duplicado (FNV-1a) | `validate-questions.mts:116,119` |
| `sourceUrl` dentro do grounding-map | `validate-questions.mts:142` |
| `caseStudyId` órfão | `validate-questions.mts:133` |
| gabarito enviesado 20–30% nas de 4 alternativas | `validate-questions.mts:187` |
| par de múltipla enviesado ≤25% | `validate-questions.mts:199` |
| `explanation` ≥30 palavras e sem contradizer o gabarito | `validate-questions.mts:220,279` |
| dedup semântico Jaccard 0.85 / 0.70 | `validate-questions.mts:317,355` |
| **total = 1000** | **`:361` (novo)** |

### Lacunas: verde hoje, mas nada impede quebrar

| Lacuna | Risco se não fechar |
|---|---|
| `needsReview` sem teto — **64**, e o `AGENTS.md` manda ≤50 | PR empilha revisão pendente sem travar |
| `caseStudyId` não exige bloco **contíguo** em `simulados.json` | cenário partido (§S4): a prova já está assim |
| cobertura de `sourceUrl` sem piso (hoje **587/1000**) | banco perde procedência sem o CI notar |
| `multiple` aceita ≥2 (não exige 2) | a prova real usa 2; ≥3 é formato incerto para o AZ-104 |

Fechar as duas primeiras é Gates 1.1 e 1.5. As duas últimas viram decisão (R6/R7).

---

## §0 Auditoria do plano v8.0 contra o código real

| Gate v8.0 | Veredito | Evidência |
|---|---|---|
| G1 needsReview | **INCOMPLETO** | `selectQuestions` só atende `mode:'seed'` (`quiz-controller.ts:155`); os 10 fixos usam `pickByIds` (`:154`) |
| G2 restaurar CI | **DIAGNÓSTICO ERRADO** | `grounding-map.json` tem 220 URLs válidas e nenhuma genérica; o problema real eram 417 `sourceUrl` na árvore, não o mapa |
| G3 README | **CORRETO** | 72,6 / 26,4 / 1,0 / 0 confirmado por contagem do banco |
| G4 Timer | **CORRETO, passo 1 já existe** | `startedAt` já está em `quiz-controller.ts:196` |
| G5 Sync batch | **CORRETO** | 4 `for…of` sequenciais: `SyncEngine.ts:166,194,219,239` |
| G6 isolamento IDB | **CORRETO + proposta proibida** | keyPath com `:` viola LESSONS 16 |
| G7 cache pool | **CORRETO** | cache de módulo não existe |
| G8 admin dup | **CORRETO** | `admin-panel.ts:83-84` e `:92-93` |
| G9 sourceUrl review | **CORRETO** | `review-card.ts`: 0 ocorrências de `sourceUrl` |
| G10 dialog nativo | **CORRETO, critério inválido** | `aria-modal` manual (`:66`) mascara falta de focus trap no axe |
| G11 router | **CORRETO, spec parcial** | app tem 9 abas; gate listava 6 |
| **G12 code snippets** | **REFUTADO** | **0/1000 questões contêm backtick** |
| **G13 cenários + yes/no** | **DESVIADO** | `yes-no` não é formato do AZ-104 |
| G14 radar | **CORRETO, dependente** | consome `byDomain.pct`, corrompido por S2 |

**2 refutados · 1 incompleto · 1 com critério inválido · 1 desviado.**
Os 4 defeitos mais graves (§1) não tinham gate.

---

## §1 Defeitos sem gate no v8.0

### S1 — Crédito parcial em múltipla escolha · CRÍTICO
`ScoringEngine.ts:34-36` concede `w × (k / expected.size)`.

Microsoft Learn (FAQ oficial): *"you must select all of the correct options without
selecting any incorrect options. **Note that this is different from how these question
types are scored on Microsoft Certification exams.**"*

No banco real, **toda** questão `multiple` tem **exatamente 2** gabaritos:

| Cenário (sim-oficial-01) | Motor atual | Regra real |
|---|---|---|
| Simples certas + **1 de 2** em cada múltipla | **868/1000 PASSA** | 760/1000 |
| Simples certas, **todas** as múltiplas erradas | 735/1000 PASSA | 760/1000 |

**+108 pontos de graça.** O app premia quem não termina a questão.

### S2 — Peso por dificuldade · não-real
`ScoringEngine.ts:3` — `WEIGHT = { easy: 15, medium: 20, hard: 25 }`.
Pearson: *"Each item on the certification examination is worth one point unless noted…
**Are item scores weighted? No.**"*
Banco: 73 easy / 561 medium / 366 hard → hard vale 1,67× o easy.
Contamina `byDomain.pct` e o corte `weakAreas < 70%`.

### S3 — Árvore de trabalho mina · **RESOLVIDO na Onda 0**
`git diff data/` era +11.942/−4.459 em 16 arquivos: reformat em massa +
`needsReview:true` nas **1000** + `sourceUrl` nos que faltavam.
- **313** eram o placeholder `https://learn.microsoft.com/azure/` — landing page do
  Azure, não um artigo. Pior em `monitoramento.json` (97/150) e `compute-vms.json` (85/133).
- **104** eram URLs reais específicas, em 28 URLs distintas, não registradas no mapa.
- Total: **417** fora do mapa, contra 220 válidas. `anchor-checks.test.ts:242` reprovava.
- `git commit -a` **quebrava o CI num teste, não no lint.**

### S4 — Case study é rótulo, não bloco (baseline pré-Gate 1.5; resolvido no §3)
Estado anterior mantido como evidência do defeito:
- `data/case-studies.json` **nunca é importado em `src/`** (0 referências). O cenário de
  40 TB / 200 Mbps / ACL NTFS nunca chega ao aluno — sobrevive num prefixo de 3 palavras.
- `pickByIds` burla o `groupCases` (`QuestionSelector.ts:71-90`). Posições reais:
  `sim-01` 1,15,16,35,40 · `sim-02` 3,6,21,28,29 · `sim-03` 12,16,24,40,42 ·
  `sim-04` 9,10,14,31,37. **Nenhuma contígua.**
- `build-simulados.mts` promete `[...head, ...caseQs]`; **`data/simulados.json` viola o
  contrato do próprio builder** — ambos tocados em `3c2c913`.
- `az104-st-054` tagueada `case-st-01` **sem** o prefixo "Caso Contoso:".
- `caseIds[s % caseIds.length]` com 2 cenários → os 5 ímpares repetem `case-mo-01`
  verbatim. Só **374 IDs únicos em 500 slots**.

---

## §2 ONDA 0 — Destravar o repositório · **FECHADA**

> Todos os gates abaixo foram executados e estão verdes. Registrados aqui porque
> são a base de tudo que vem depois e porque `LESSONS.md` §0.11 exige rastro.

### Gate 0.1 — Separar a árvore de trabalho · FECHADO
**Arquivos:** `data/*.json`
- Reformat em massa normalizado pelo biome: diff caiu de +11.942/−4.459 para +3.778/−2.437.
- **417 `sourceUrl` não ancoradas removidas** (313 placeholders + 104 não registradas).
  **Não se inventa URL para fechar número.**
- 4 questões `source:'mslearn'` quebraram no `validate` depois da poda
  (`question-schema.ts:54` exige `sourceUrl`; `validate-questions.mts:142` exige estar no mapa).
  Causa raiz: **drift de locale** — o mapa cita `/pt-br/`, as questões citavam a versão
  en-US do *mesmo artigo*. Reancoradas na URL que o mapa já referencia (todas HTTP 200):
  | Questão | URL restaurada | Bullet |
  |---|---|---|
  | `az104-st-012` | `…/pt-br/azure/storage/blobs/soft-delete-blob-overview` | `st-files-blobs#4` |
  | `az104-st-013` | `…/pt-br/azure/storage/blobs/versioning-overview` | `st-files-blobs#7` |
  | `az104-st-017` | `…/pt-br/azure/storage/blobs/object-replication-overview` | `st-accounts#3` |
  | `az104-st-025` | `…/pt-br/azure/storage/blobs/storage-blobs-introduction` | `st-files-blobs#2` (registrada em `extraUrls`) |

**Aceite:** `npm test tests/unit/anchor-checks.test.ts` → 116/116 · `npm run validate` → 0 erros

### Gate 0.2 — `public/data` versionado · FECHADO
**Arquivos:** `public/data`, `biome.json`
`public/data` é symlink para `../data` e estava **untracked**. `QuestionLoader.ts:42` busca
`${BASE_URL}data/*.json`, e `biome.json` exclui `!public/data` de propósito. Sem versionar,
**um clone novo e o deploy nascem com o app sem banco** — as 1000 questões inalcançáveis.
Versionado como modo `120000`.
**Aceite:** `npm run build` gera `dist/data/` · app sobe com banco

### Gate 0.3 — Lint dos scripts one-shot · FECHADO
**Arquivos:** `scripts/`
Baseline real: **27 erros, 11 warnings, 3 infos** (o v8.0 supunha 12).
- **7 scripts one-shot removidos** — `set-needs-review`, `r3-pipeline`, `list-missing`,
  `enrich_perfile`, `enrich_missing`, `enrich_missing2`, `fill-missing-storage`.
  Todos com **zero referências** fora de si mesmos (verificado em `package.json`, CI,
  `src/`, `tests/`, docs). Backup em `/tmp/az104-r3-scripts-backup/`; recuperáveis por
  `git checkout HEAD -- <arquivo>`. Regra do `AGENTS.md`: nunca `rm` com wildcard.
- `biome check --write .` resolveu o resto (formatação dos 16 `data/*.json` + organizeImports).
**Aceite:** `npm run lint` → `Checked 155 files`, 0/0/0, EXIT 0

### Gate 0.4 — Gate de segredo honesto · FECHADO
**Arquivos:** `scripts/check-secrets.mjs`
O gate imprimia `AVISO` sobre o histórico **com exit 0** — decorativo. E o aviso era
**factualmente falso**: os 4 commits casados eram o próprio detector
(`scripts/check-secrets.mjs`), a documentação que nomeia o tipo de credencial em prosa
(`AGENTS.md`, `SECURITY.md`, `LOG.md`) e o `.husky/pre-commit`. **Nenhum segredo vazado**
— só a palavra `AIza` isolada, e o `gitleaks-action@v2` exige `AIza` + 35 chars.

Causa raiz: o scan de histórico usava `-G 'service_role|AIza|-----BEGIN'` — a **palavra**,
sem a precisão de `PADROES` (`:45`) nem a allowlist de `IGNORAR_CONTEUDO` (`:97`) que o
scanner de arquivos já tinha. Reimplementava a detecção com regex pior.

**Correção:** o scan de histórico agora pré-filtra commits candidatos e decide com os
**mesmos** `PADROES` + `IGNORAR_CONTEUDO`, linha a linha, por arquivo. Segredo real no
histórico passou a **bloquear (exit 1)** em vez de avisar.
**Aceite (controle positivo, clone isolado):** chave `AIza`+35 em commit passado, removida
da árvore → `check-secrets: 236 arquivos · 0 achados` no scanner de arquivos, mas
`BLOQUEADO: 1 segredo(s) real(is) no histórico` e **EXIT 1**. Gate detector de si próprio
não é gate.

### Gate 0.5 — README honesto + verificador no CI · ABERTO
**Arquivos:** `README.md`, `scripts/check-readme-claims.mjs` (novo), `package.json`
- `README.md:48` → tipos reais: 72,6% única · 26,4% múltipla · 1,0% cenário · 0% yes-no.
  Marcar como **fiel à prova**: a Microsoft não publica o mix 60/20/15/5.
- `README.md:58` → *"472 das 1000 têm sourceUrl"* não corresponde a nada. **Número real
  hoje: 587** (583 herdadas + 4 reancoradas). Atualizar ou remover a afirmação.
- **Por que um gate novo:** `npm run test:count` (`update-readme-test-count.mjs:44`) valida
  **só** as linhas de contagem de testes (`tsc + N testes unit`); `npm run meta:check`
  (`bump-bank-meta.mjs --check`) compara **só** `countsByDomain`. **Nenhum gate do CI
  verifica a tabela de tipos nem a claim de `sourceUrl`** — foi exatamente por isso que o
  v8.0 propagou 60/20/15/5 e 472/1000 sem ninguém reclamar.
- `data/meta.json.seedVersion` é **campo morto**: zero referências em `src/`, `scripts/`,
  `tests/`. A versão real vive em `QuestionLoader.SEED_VERSION = '2'` + `localStorage`.
  Remover ou ligar — decidir uma, não as duas.
- **Não mexer** em `meta.json.generatedWith`: `null` está **correto** — 0 questões são
  `ai-generated` (591 `original` + 409 `mslearn`) e `check-model.mjs:68` só grava quando a
  primeira aparece.

**Aceite:** `npm run readme:check` em 0 **e incluído no `npm run ci`**

---

## §3 ONDA 1 — Fidelidade da prova

### Gate 1.1 — `needsReview` nos TRÊS caminhos — ✅ **FECHADO 2026-10-06**
**Arquivos:** `simulados.json` (37 slots trocados), `scripts/validate-questions.mts` (guard de CI)
**Arquivos NÃO alterados:** `QuestionSelector.ts`, `quiz-controller.ts`, `treino-controller.ts`

**O plano original estava certo no diagnóstico e errado no remédio.** O premise
(`needsReview = 64`, 27 IDs em slots de simulados oficiais) foi confirmado — mas a versão
intermediária do dado estava corrompida em `1000/1000` por um passo de reescrita do R3
(+982 linhas `true`, −103 `false`). Restaurado ao valor de HEAD: **64 `true` / 936 `false`**.

**Por que o passo 2 do plano (filtro em `pickByIds`) foi descartado:** filtrar
`needsReview` encolheria cada oficial de 50 para **44-48** e quebraria o blueprint da prova
(e o e2e `oficial-01 carrega 50 questoes`). O conserto é no **dado**, não em runtime.

**O que foi feito:**
1. **37 slots** contaminados (em 500) substituídos por questões limpas do **mesmo domínio E
   mesma dificuldade**. A primeira tentativa casou só o domínio e pegou `rv-001..rv-049`, que
   tem **0 questões `hard`** — achatava o perfil do mock (mock 01 foi de 5 `easy` → 2 com a
   versão casada por dificuldade). Refeito.
2. Guard no `validate` (que já está no CI): **0 `needsReview` nos 10 oficiais**, 50 itens
   cada, sem id repetido, sem id inexistente. Provado com controles negativos
   (quarentena / repetido / inexistente / 49 / 51 → exit 1).
3. `question-curation.mjs`: denominador `1164` → `1000` (era `retire_autoeval_ids.json`,
   164 índices) + anomalia de quarentena total.

**Ganho de qualidade:** nenhum dos 10 simulados oficiais serve mais questão em quarentena
(antes: 37 slots contaminados). `needsReview` volta a ser sinal de **pipeline**, sem virar
filtro de runtime.

**Lição registrada:** filtro de curadoria em runtime é o remédio errado para contaminação
de lista fixa. Trocar o dado e travar com gate de build.

### Gate 1.2 — Múltipla escolha tudo-ou-nada
**Arquivos:** `ScoringEngine.ts`, `tests/unit/scoring.test.ts`
Crédito só com conjunto exato. O teste `'múltipla parcial sem erro: w×(k/n)'`
**trava o comportamento atual** — substituir por `'múltipla parcial sem erro = 0'`,
não apenas remover.
**Aceite:** `npm test tests/unit/scoring.test.ts` + regressão 868→760

### Gate 1.3 — Remover peso por dificuldade
**Arquivos:** `ScoringEngine.ts`, `tests/unit/scoring.test.ts`
1 ponto por item; `maxRaw = questionCount`. Atualizar o teste `'exemplo canônico'` que
afirma `maxRaw = 10*15 + 25*20 + 15*25`.
**Aceite:** `npm test tests/unit/scoring.test.ts tests/unit/analytics.test.ts tests/unit/irt.test.ts`

### Gate 1.4 — Versionar o modelo de pontuação
**Arquivos:** `src/sync/types.ts`, `SyncEngine.ts`
`score` e `byDomain` são **persistidos** (`AttemptRecordSchema:62-68`, IDB + Supabase
`attempts.by_domain`) e alimentam `analytics`, `irt`, `drill`, `StudyGuide`, `progress-panel`,
`stats-dashboard`, `validate-questions`, `question-curation`. Adicionar
`scoringModelVersion: 2` e informar a leitura de registros antigos (decisão R1).
**Aceite:** `npm run migration:check` + `npm test`

### Gate 1.5 — Case study de verdade — ✅ **FECHADO 2026-10-06**
**Arquivos:** `question-card.ts`, `QuestionSelector.ts`, `QuestionLoader.ts`, `quiz-controller.ts`, `app-shell.ts`, `storage-accounts.json`
**Testes:** `tests/unit/selector.test.ts`, `tests/unit/question-loader.test.ts`, `tests/e2e/quiz.spec.ts`

1. Importar `data/case-studies.json`: novo `CaseStudySchema` e `getCaseStudy()` com cache. Os 2 cenários ficam embutidos no bundle; lookup inválido retorna `undefined` sem quebrar a questão.
2. Aplicar `groupCases()` ao caminho fixo em `quiz-controller.ts`. Sessões salvas retomadas preservam a ordem antiga porque o índice salvo depende da ordem anterior; novas sessões fixas apresentam o bloco contíguo no fim.
3. Corrigir `az104-st-054`: agora é `single`, sem `caseStudyId` e sem tag `case`. A regressão verifica esse item e exige que todo `case-study` comece com `Caso Contoso:` ou `Caso Fabrikam:`.
4. Bloco contíguo em runtime: `startsCaseBlock()` renderiza o cenário somente no primeiro item adjacente do bloco, no quiz e no treino.

**Aceite:** testes relevantes 29/29 · `npm run validate` 1000/0 · `npm run ci` exit 0 · `npx playwright test` 17/17, incluindo cenário visível na questão 46 do Oficial 1 e ausente na 47.

---

## §4 ONDA 2 — Segurança e privacidade

### Gate 2.1 — Escopo de usuário no IndexedDB · VAZAMENTO REAL — 🔄 **EM ANDAMENTO**
**Arquivos:** `IndexedDB.ts`, `types.ts`
- Stores sem escopo: `doubts` (keyPath `questionId`), `activity` (key `key`), `progress`.
- `AttemptRecordSchema` **tem** `userId` e `loadAttemptsForUser` filtra (`:95-98`) →
  `attempts` e `suggestions` **seguros**.
- `DoubtRecordSchema:74-80` **não tem `userId`**; `loadAllDoubts()` não recebe usuário;
  `pushPlatform:193` lê tudo e grava com `user_id: userId` →
  **as dúvidas do usuário A são enviadas para a conta do B no Supabase.**
  Idem `activity`: streak global. `progress`: herda contadores de uso.
1. Campo `userId` explícito + índice; leitura e `pushPlatform` filtram por usuário.
2. **Proibido** keyPath `${userId}:${questionId}` — LESSONS 16: IndexedDB rejeita `:`.
   O padrão correto já existe no repo: campo `key` com `:` **no valor** (`:124`).
3. Migrar stores existentes (bump de `SEED_VERSION`).
**Aceite:** `tests/unit/auth-isolation.test.ts` novo — A grava dúvida, B faz login,
`loadAllDoubts()` de B não retorna a de A, e `pushPlatform(B)` não envia payload de A.

### Gate 2.2 — Reset no logout
**Arquivos:** `app-shell.ts`, `src/sync/auth.ts`
`signOut()` expurga sessão e reseta as instâncias dos controladores.
**Aceite:** `npm test`

---

## §5 ONDA 3 — Resiliência

| Gate | Arquivos | Passos | Aceite |
|---|---|---|---|
| **3.1** batch upsert | `SyncEngine.ts`, `tests/unit/sync.test.ts` | um `.upsert(array)` por tabela, `Promise.all`, chunk de 100. `onConflict` **difere**: `id` (attempts, suggestions) vs `user_id,question_id` (doubts). `profiles` (`:400`) fora do lote | ✅ 50 tentativas em 1 lote e <1s em mock; 250 em chunks 100/100/50 |
| **3.2** cache do pool | `QuestionLoader.ts`, `question-loader.test.ts` | cache de módulo em `getQuestionPool()`; invalidar só em reseed. `getBankMeta` já usa o padrão (`bankMetaCache`). `ensureSeeded` **não tem** `force` | ✅ 2ª chamada usa o cache mesmo com JSON inválido; reseed invalida |
| **3.3** dup no AdminPanel | `admin-panel.ts` | remover `buildUsers`/`buildQuestions` de `:92-93` | ✅ compilação determinística única; `npm run lint` + `npm run build` |

---

## §6 ONDA 4 — UX e acessibilidade

| Gate | Arquivos | Passos | Aceite |
|---|---|---|---|
| **4.1** sourceUrl no review | `review-card.ts` | link com `rel="noopener noreferrer"` | ✅ link condicional após a explicação; teste de template verifica `href` e `rel` |
| **4.2** dialog nativo | `modal-dialog.ts` | `showModal()`/`close()`, `::backdrop`, Escape nativo. **Critério corrigido:** `aria-modal="true"` manual (`:66`) mascara a falta de focus trap no axe — exigir teste de **foco preso dentro do modal**, não "axe 0 violações" | `axe.spec.ts` + teste de foco |
| **4.3** router | `router.ts` (novo), `app-shell.ts` | hash para os **9** tabs (`home, catalog, treino, estudo, review, stats, progress, admin, quiz`) — o v8.0 listava 6 | E2E de `popstate` |
| **4.4** radar | `stats-dashboard.ts` | SVG sobre `byDomain.pct` — **só depois de 1.3** | render responsivo + tabela alternativa |

---

## §7 Descartados com justificativa

- **G12 — snippets de código.** **0 de 1000 questões contêm um backtick**; zero newlines.
  Não há insumo: o renderer seria feature sem dado. Se a competência for desejada, a ordem
  se inverte — primeiro um lote de conteúdo com `az `/`New-Az`/KQL/ARM reais (hoje só 28
  questões *parecem* ter CLI, e em texto puro), depois o renderer.
- **G13 — 50 questões `yes-no`.** **`yes-no` não é formato do AZ-104.** A Microsoft não
  publica o mix 60/20/15/5; ele foi inventado. Os formatos reais ausentes são **ordering
  (drag-and-drop)**, **build-list** e **hot-area (hotspot)**. `PLAN.md:105` registra
  `ordering` como cortado (§15): se a competência é fidelidade de formato, o alvo é
  `ordering`/`hotspot`.
- **G13 — 8 cenários novos.** O problema não é quantidade: são 2 cenários, e
  `s % caseIds.length` os replaya 5× cada. Com 1.5 + distribuição corrigida,
  **4–6 cenários resolvem**.

---

## §8 Dependências e ordem obrigatória

```
Onda 0 (fechada) ──▶ qualquer outra onda
0.4 ──▶ 0.5         (o verificador precisa do número certo para existir)
1.2 ──▶ 1.3         (o mesmo teste trava os dois comportamentos)
1.3 ──▶ 4.4         (radar sobre métrica não corrompida)
1.1 ──▶ 1.5         (regenerar simulados só depois de filtrar o pool)
2.1 ──▶ 2.2         (migração antes do reset no logout)
```

## §9 Decisões em aberto

| # | Questão | Opções | Gate |
|---|---|---|---|
| R1 | `score`/`by_domain` já persistidos | (a) backfill dos registros antigos · (b) `scoringModelVersion` + fallback na leitura | 1.4 |
| R2 | Escopo de usuário no IDB exige migração | (a) bump `SEED_VERSION` + recarregar banco · (b) migração in-place preservando dados | 2.1 |
| R3 | `yes-no`: infra pronta, 0 questões, formato não-real | (a) remover do enum (`question-schema.ts:24`, refinamento `:97-102`) · (b) manter dormente, documentado como não-oficial, fora do README | §7 |
| R4 | `meta.json.seedVersion` (campo morto) | (a) remover · (b) ligar ao `QuestionLoader.SEED_VERSION` | 0.5 |
| R5 | 413 questões `original` sem `sourceUrl` | (a) curadoria por domínio, 1 citação por subdomínio · (b) aceitar e fazer o review card lidar com "sem fonte" · (c) atribuição em massa — **descartada**: é o que gerou o placeholder | §2/0.1 |
| R6 | `multiple` aceita ≥2 gabaritos | (a) exigir exatamente 2, como a prova real · (b) manter ≥2 tolerante a item legado | §Invariantes |
| R7 | Cobertura de `sourceUrl` (587/1000) | (a) piso no `validate` (exige curadoria) · (b) sem piso, só métrica no README | §Invariantes |

## §10 Matriz de gates

| Gate | Descrição | Onda | Verificação | Estado |
|---|---|---|---|---|
| 0.1 | Árvore: normalizar reformat, podar 417 `sourceUrl`, reancorar 4 `mslearn` | 0 | `npm test` + `npm run validate` | ✅ |
| 0.2 | Versionar `public/data` (symlink) | 0 | `npm run build` | ✅ |
| 0.3 | Lint: remover 7 scripts one-shot + autofix | 0 | `npm run lint` | ✅ |
| 0.4 | Gate de segredo: histórico usa `PADROES` + `IGNORAR_CONTEUDO` | 0 | `npm run secrets` + controle positivo | ✅ |
| 0.5 | README honesto + `readme:check` no CI | 0 | `npm run readme:check` | ⬜ |
| **0.6** | **`TOTAL_ESPERADO = 1000` com `fail()`** — invariante da capa do projeto | 0 | `npm run validate` (controle: 997 → EXIT 1) | ✅ |
| 1.1 | `needsReview` nos 3 caminhos | 1 | `npm run validate` (controles: quarentena / repetido / 49 / 51 → EXIT 1) | ✅ 37 slots trocados por domínio+dificuldade; 0 nos 10 oficiais |
| 1.2 | Múltipla tudo-ou-nada | 1 | `npm test tests/unit/scoring.test.ts` | ✅ `868 → 760` medido no sim-oficial-01 real |
| 1.3 | Remover peso por dificuldade | 1 | `npm test tests/unit/scoring.test.ts tests/unit/analytics.test.ts tests/unit/irt.test.ts` | ✅ `maxRaw 1025 → 50`; corte `718 → 35` |
| 1.4 | Versionar modelo de pontuação | 1 | `npm run migration:check` | ✅ `scoringModelVersion` + migration `005`; parser `ALTER TABLE` corrigido no validador |
| 1.5 | Case study real | 1 | E2E do quiz + testes de bloco e prefixo | ✅ cenário no início do bloco; `az104-st-054` como `single` |
| 2.1 | Escopo de usuário no IDB | 2 | `tests/unit/auth-isolation.test.ts` | 🔄 em andamento |
| 2.2 | Reset no logout | 2 | `npm test` | ⬜ |
| 3.1 | Batch upsert | 3 | `npm test tests/unit/sync.test.ts` | ✅ um `.upsert(array)` por tabela, `Promise.all`, chunks de 100 |
| 3.2 | Cache do pool | 3 | `npm test tests/unit/question-loader.test.ts` | ✅ cache de módulo com invalidação só no reseed |
| 3.3 | Duplicação no AdminPanel | 3 | `npm run lint` | ✅ chamadas duplicadas removidas; build limpo |
| 4.1 | `sourceUrl` no review | 4 | teste de template | ✅ “Abrir fonte ↗” com `rel="noopener noreferrer"` |
| 4.2 | Dialog nativo + foco preso | 4 | `axe.spec.ts` + teste de foco | ⬜ |
| 4.3 | Router (9 tabs) | 4 | E2E `popstate` | ⬜ |
| 4.4 | Radar de competências | 4 | render + tabela alternativa | ⬜ |

**Portão final da v9.0:** `npm run ci` em 0 **incluindo `readme:check`**, sem warning.

---

## §11 Correção do ambiente (registro, porque custou tempo)

A sessão abriu em shell Windows e o `node_modules` foi instalado no WSL. Sintoma:
`Exec format error` ao chamar binário linux-x64, e `node`/`npx` ausentes.

**Diagnóstico errado que quase custou um estrago:** "falta o binário win32 do Biome" →
`npm install @biomejs/cli-win32-x64`. Estava errado por dois motivos:
1. Se o shell é Windows mas o projeto é Linux, a solução é **atravessar** para o WSL, não
   instalar win32. Instalar win32 suja `node_modules` com duas plataformas.
2. O próprio `npm` recusou com `EISDIR` ao reescrever os symlinks de `.bin` num share UNC.

**Caminho certo:** `wsl.exe -e bash -lc 'cd ~/projects/... && <cmd>'`. O `node_modules`
já tinha o binário linux-x64 correto (`@biomejs/cli-linux-x64`) o tempo todo —
`Checked 155 files in 119ms`. Registrado em `AGENTS.md` (projeto) e no `AGENTS.md` global.