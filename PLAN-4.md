# PLAN-4.md — PasseiAZ-104: código + banco 1000 fundamentado + visibilidade

> Complementa `PLAN.md` (§4 meta do banco, §9 hooks, §15 cortes) e `CODE-REVIEW.md`.
> Quatro trilhas: **A** = 10 achados de código (**fechada**) · **B** = banco 950→1000 (**fechada**) ·
> **R** = grounding (**R0–R2 e R4 fechadas; R3 pendente: 949 `original`**) · **C** = visibilidade (**pendente**).
> Custo $0. Gates mandam. Nada aqui é prazo. Execução no WSL Debian (`REGRAS.md`).
> **Estado atual: ver §0.1. As decisões G15/G16 foram fechadas em 29/set.**

## §0 Decisões fechadas (não perguntar de novo)
| # | Decisão |
|---|---|
| G1 | A1: `saveProfile` para de mutar `updatedAt`; os 2 call sites de mutação carimbam o tempo |
| G2 | A2: grava `role.change` em `az104_admin_logs` — RLS `for all` já permite, **sem migration** |
| G3 | A3: lazy-load de `admin-panel` primeiro; Study Hub só quando a gamificação entrar |
| G4 | A5: **documenta** a exceção do `study-topics.json` no ADR-001 (não refatora) |
| G5 | +50 = `ig+13 · st+10 · co+13 · rv+9 · mo+5` → `243/180/243/184/150` |
| G6 | As +50 são 100% `mslearn` + `sourceUrl` pt-br viva. Sem `community`, sem dump de prova |
| G7 | `az104-mo-145` (questão meta sobre o próprio banco) é removida e substituída 1:1 |
| G8 | GIF com ffmpeg do sistema; release `v0.1.0` **agora** e `v0.2.0` quando fechar 1000 |
| G9 | Track C entra neste mesmo arquivo (execução em um doc só) |
| G10 | **Grounding literal: 1000/1000 ancoradas.** Onde a doc oficial não sustenta a pergunta, a pergunta é reescrita para casar com a doc (Tier 2/3) — não se deixa `original` |
| G11 | Fontes externas: só MIT/Apache com **atribuição** (README §Créditos). Dump, curso pago e Practice Assessment oficial são **excluídos** |
| G12 | `monitoramento` fecha em 150 (15,0%), exatamente no teto da faixa — confirmar comparador inclusivo; se não for, usar 149 e mover 1 para `storage` |
| G13 | **Pipeline manual puro, sem pressa.** R0 (mapa + gaps medidos por bullet) **antes** de qualquer questão nova; cada questão preenche um bullet descoberto medido. `generate-questions.mts` fica como rascunho opcional, nunca como fonte |
| G14 | **Voz de prova:** stem ≤60 palavras · opções curtas com nomes reais de serviço/recurso · distrator = "serviço certo, tier/escopo errado" ou "ferramenta certa, caso errado". Antes de escrever, ler as questões existentes do mesmo `subdomain` — duplicata temática (mesmo fato, cenário diferente) é rejeitada mesmo passando no FNV |
| G15 | **Limiar do R1 = 0.5** (não 0.3). Medido em 29/set: a 0.5 são 0 apontadas em 51 e o único apontado era âncora que de fato podia melhorar. Falso positivo custa revisão humana; falso negativo deixa banco errado — e âncora errada medida em 0.37 **passaria** em 0.3. |
| G16 | **Aposentar 175 questões de autoavaliação, não 53.** O critério de "SLA" é o **formato** (alguém afirma X → isso procede?), não o tema. As 175 de <4 alternativas são **todas** desse formato (0 exceções), e o gabarito é A em 53,1% — adivinhável. `subdomain ^sla` (53) marcava apenas o *assunto*. |

---

# §0.1 Estado verificado — 29/set/2026 (leitura + execução real)

> Esta seção é a fonte do estado **atual**. O §1 abaixo é o retrato de 26/set e fica
> como linha de base histórica (950 questões), preservado para não perder a medição.

## Banco
- **1000 questões** · `data/meta.json` = `243/180/243/184/150` = 1000.
- Por arquivo (o domínio é dividido em sub-arquivos):
  `identidade-acesso.json` 134 · `identidade-governanca.json` 109 · `storage.json` 180 ·
  `compute-vms.json` 133 · `compute-apps.json` 62 · `compute-platform.json` 48 ·
  `rede-virtual.json` 184 · `monitoramento.json` 150.
- `needsReview: 0` · `source`: **949 `original`** (sem `sourceUrl`) · **51 `mslearn`** (com `sourceUrl` viva).
- 10 simulados × 50 = 500 slots, **0 ids apontando para questão inexistente**.

## Grounding
- `data/grounding-map.json`: **82/82 bullets** com URL (era 75/82). 38 `extraUrls` em 27 bullets — 118 URLs únicas (120 referências), todas HTTP 200 em PT-BR, sem soft-404.
- **O mapa é derivado.** `scripts/fill-grounding.mjs` reescreve `PRIMARY`/`EXTRA` a partir das constantes do próprio script e **apaga** de `extraUrls` qualquer URL que nenhuma questão use. Reancorar exige editar a questão **e** declarar a URL no script — senão o `fill` seguinte desfaz o ajuste (LESSONS 40).
- **Duas verificações de âncora, porque URL viva ≠ âncora certa:**
  - `npm run grounding:probe` → vivacidade: 200, PT-BR, sem soft-404, sem cair em EN-US. Map-driven: o `verify` deixou de ter lista `CANDIDATES` paralela, que divergia do mapa justamente nas âncoras corrigidas e, com `--write`, desfaria as correções. Escrita no mapa é só do `fill-grounding`.
  - `npm run grounding:audit` → semântica: o vocabulário do bullet tem de existir no **título/H1** da página. Descrição e corpo ficam de fora de propósito (a página de redundância cita "replicados" na descrição e seguraria o bug do `st-accounts#3`).
- Auditoria de âncoras reprovou **4** âncoras, todas 200/PT-BR e semanticamente erradas: `st-accounts#3`, `ig-subscriptions-governance#5`, `ig-access-resources#3` e `ig-subscriptions-governance#4` (esta última estava mascarada pela descrição do overview do ARM).
- 2 bullets com âncora correta mas título em paráfrase estão em `KNOWN_EXCEPTIONS`, com justificativa escrita e **testada** (entrada sem evidência reprova): não existe página dedicada de grupos de recursos em PT-BR (o slug oficial responde 301 para o overview do ARM) e `virtual-networks-udr-overview` é a página oficial de UDR apesar do título "Roteamento de tráfego".
- `tests/unit/anchor-checks.test.ts`: 19 casos com o HTML dos erros reais (soft-404, fallback EN-US, replicação-em-redundância, exceção sem justificativa). Injetar o erro e exigir que o gate reprove é o que prova que o gate funciona.
- R2 **completo**: toda `sourceUrl` `mslearn` é rejeitada se não estiver no mapa (como URL ou extraUrl).
- `check-grounding`: 51 verificadas · 0 apontadas · 0 fetch-falhou (limiar 0.5, G15).

### Revisão factual das 51 — 49 confirmadas, 2 corrigidas, 0 abertas (2026-10-02)
Passar por URL viva **e** âncora semanticamente certa ainda não prova que o gabarito esteja
sustentado pela página. As 51 foram lidas uma a uma na fonte, com veredito registrado em
`.agent/audits/mslearn-factual-verdicts.md`.
- **`az104-mo-150` ensinava recurso aposentado.** O gabarito era "NSG flow logs + Traffic Analytics", e a
  própria `sourceUrl` abre avisando que o recurso se aposenta em **30/09/2027** e já não aceita novas
  instalações. Reescrita para logs de fluxo de **rede virtual** (`sourceUrl` → `vnet-flow-logs-overview`,
  `subdomain` → `vnet-flow-logs`, `version` 2), com ID e gabarito `B` preservados. `nsg-flow-logs-overview`
  segue como extra de `mo-monitor#6` porque é de lá que sai o aviso citado na explicação.
- **`az104-co-235` com âncora que não carregava a afirmação.** `managed-disks-overview` é a página de
  **tipos** de disco e não trata de redundância; ZRS síncrono em três zonas só existe em
  `disks-redundancy`. Reancorada; enunciado e gabarito inalterados.
- **As 9 lacunas foram fechadas com leitura de fonte, não com Gibraltar.** Nenhuma virou "aprovada"
  por similaridade lexical — trocar por um 200 qualquer é o erro que `ig-subscriptions-governance#5`
  já ensinou (`cost-management-billing-overview` é o caixa, não a assinatura). Resultado:
  - **6 âncoras novas**: `co-234` (DSv2+Premium só na página da família D — `/sizes` lista a família,
    não a série) · `ig-239` (`tutorials/govern-tags`: "negue os grupos que não tenham a tag… com o
    efeito **negar** impede a criação"; `/overview` só cita deny genérico) · `mo-148`
    (`kusto/query/render-operator`, única PT-BR com `render timechart` literal) · `mo-149`
    (`visualize/insights-overview` — **não existe** slug PT-BR de Storage Insights; a tabela do índice
    lista "Armazenamento / insights do armazenamento… desempenho, capacidade e disponibilidade") ·
    `rv-182` (só o par peering + template de sub-rede expõe `disableBgpRoutePropagation`) · `st-179`
    (a tabela de tipos de conta; o how-to de criar share não fala de tipos).
  - **3 se revelaram certas na página que já tinham**: `ig-233` (`license-users-groups` lista "um local
    de uso inválido" entre as falhas de atribuição), `rv-181` (`udr-overview` traz os tipos de próximo
    salto), `st-171` (`soft-delete-blob-overview`: "a exclusão reversível de contêiner **também deve ser
    habilitada**" — a dependência é mútua e explícita nas duas páginas).
- **Cobertura lexical não é veredito.** A extração automática acusou `st-176` de defeito ao colocar ao lado
  dela a frase "os clientes **podem** enumerar blobs", que é da lista do nível **Container**. Lida a página
  inteira, o nível **Blob** afirma o contrário. A questão está correta. O mesmo gate reprovou `rv-182`
  a 0.40 numa âncora que era a certa, e deixou passar 3 que não eram — por isso o limiar 0.5 é
  triagem, não veredito (LESSONS 41).

## Gates
`ci` 21 arquivos / 115 testes · `validate` **1000/0** · `meta` 1000 · `budget` 125,8 KB / 140 KB ·
`remap-explanation-letters` **0 a realinhar, 0 para revisão humana** · `verify-grounding-urls`
118/118 URLs vivas · `audit-anchor-semantics` 82 bullets, 0 suspeitos, 3 exceções justificadas
(`ig-subscriptions-governance#4`, `rv-vnets#4`, `mo-monitor#3` — as três com o porquê escrito no código).

### Valve das 22 — fechada (2026-09-29)
As 22 recusadas foram revisadas uma a uma. Fechar a lista **não** foi baixar limiar:
7 tinham razão que parafraseava em vez de citar a alternativa (ex.: opção "IP público em
cada VM" explicada por "expõe via internet"), e 15 tinham corpo compartilhado entre letras.
Reescritas para citar a alternativa na própria razão.

A revisão encontrou **2 bugs de conteúdo** que nenhuma automação corrigiria sozinhos:
- `az104-st-178`: as razões de B/C/D estavam giradas num ciclo de três — a razão de B ("7 dias")
  descrevia o número da opção C, e assim por diante. Conteúdo factual certo, acoplamento errado.
- `az104-co-234`: A e B trocadas — a razão de B ("B é burstable") descrevia a *série B*, que é a opção A.

`tokens()` filtrava `length > 2`, o que descartava "7"/"30"/"90": no `st-178` as três opções
erradas tokenizavam todas para `{dias}`. Corrigido o filtro (número é conteúdo), **não** as
opções — dar vocabulário a elas ("90 dias — o mínimo da Cold") entregaria o porquê de cada
distrator e trivializaria a questão. Trava em `tests/unit/explanation-valve.test.ts`.

## Fora de qualquer trilha (pendências de operação)
- **Migration 002** não aplicada no Supabase → aba Admin oculta (fail-closed por RLS). Validação
  com 2 usuários depende disso.
- **Chave Gemini** exposta: rotação é ação do dono.
- `DATA_PROVA=TBD` — só agendar nas 3 condições do `AGENTS.md` §12.

---

# §1 Estado verificado (leitura de 26/set/2026 — sem execução) — HISTÓRICO, ver §0.1


## 1.1 Banco
- 950 questões · `data/meta.json:10-16` = 230/170/230/175/145 · `needsReview:true` = **0**.
- Por arquivo (IDs **intercalados** entre arquivos do mesmo domínio):
  `identidade-governanca.json` 96 (maior NNN 212, 105 KB) · `identidade-acesso.json` 134 (230, 142 KB) ·
  `storage.json` 170 (170, 157 KB) · `compute-vms.json` 133 (202, 134 KB) · `compute-apps.json` 62 (199, 66 KB) ·
  `compute-platform.json` 35 (230, 33 KB) · `rede-virtual.json` 175 (175, 158 KB) · `monitoramento.json` 145 (145, 134 KB).
- `az104-mo-145` = questão meta "o banco atingiu 950…" — `data/monitoramento.json:3138-3151`.
- Seleção de questões **ignora** `meta.json`: `PROPORTIONS` fixas em `src/data/simulados.ts:10-16` +
  `src/controllers/quiz-controller.ts:155-164`; simulados oficiais usam quotas hardcoded em `scripts/build-simulados.mts:6-12`.
- As 950 são `source:"original"`, **sem `sourceUrl`** — o outline cobre os temas, não há link por questão.

## 1.2 Outline oficial — já está atualizado
- `data/exam-syllabus.json:6` `skillsOutlineDate: "2026-04-17"` · `:7` `guideUpdated 2026-03-23` ·
  `:9` `lastChecked 2026-09-25` · `:10-16` pesos **iguais aos oficiais de 17/abr/2026**:
  `ig 20-25 · storage 15-20 · compute 20-25 · rede-virtual 15-20 · monitoramento 10-15` · `:29-30` `passingScore 700`, `durationMinutes 100`.
- `scripts/check-exam-outline.mjs` deve sair `OUTLINE_CHANGED=false`. **Nenhum conflito de blueprint.**
- Lacuna real: o repo guarda **só os pesos** — não tem cópia versionada dos **15 grupos funcionais / 82 bullets**
  do "Habilidades medidas". Sem isso, `syllabus-gap.mts` só valida nível de domínio. → **B1**.

## 1.3 Skills medidas (17/abr/2026, PT-BR) — 15 grupos funcionais, 82 bullets
`◆` = grupo com mudança *minor* no change log de 17/abr/2026 = **onde a prova foi mexida**.

**Gerenciar identidades e governança do Azure (20%–25%)** — 15 bullets
1. Gerenciar usuários e grupos do Microsoft Entra (5): criar usuários e grupos · gerenciar propriedades do
   usuário e do grupo · gerenciar as licenças no Microsoft Entra ID · gerenciar usuários externos · configurar a SSPR
2. Gerenciar o acesso aos recursos do Azure (3): gerenciar funções internas · atribuir funções em escopos
   diferentes · interpretar atribuições de acesso
3. Gerenciar assinaturas e governança do Azure (7): Azure Policy · bloqueios de recursos · tags · grupos de
   recursos · assinaturas · custos com alertas, orçamentos e recomendações do Assistente · grupos de gerenciamento

**Implementar e gerenciar o armazenamento (15% a 20%)** — 17 bullets
1. Configurar o acesso ao armazenamento (5): firewalls e redes virtuais do Armazenamento · tokens SAS ·
   políticas de acesso armazenadas · chaves de acesso · acesso baseado em identidade para Arquivos do Azure
2. Configurar e gerenciar contas de armazenamento (5): criar e configurar contas · redundância · replicação de
   objeto · criptografia · Gerenciador de Armazenamento e AzCopy
3. ◆ Configurar os Arquivos do Azure e o Armazenamento de Blobs (7): compartilhamento de arquivos · contêiner ·
   camadas de armazenamento · **soft delete para blobs e contêineres** · instantâneos e exclusão temporária para
   Arquivos · gerenciamento do ciclo de vida de blobs · **controle de versão de blobs**

**Implantar e gerenciar os recursos de computação do Azure (20 a 25%)** — 24 bullets
1. Automatizar a implantação com modelos ARM ou Bicep (5): interpretar ARM ou Bicep · modificar ARM · modificar
   Bicep · implantar · exportar/converter
2. ◆ Criar e configurar máquinas virtuais (7): criar VM · criptografia no host · mover VM para outro grupo de
   recursos, assinatura ou região · tamanhos · discos · zonas e conjuntos de disponibilidade · VMSS
3. ◆ Provisionar e gerenciar contêineres no portal (4): ACR · ACI · Aplicativos de Contêiner ·
   dimensionamento e escala
4. Criar e configurar o Serviço de Aplicativo (8): plano · escalonamento do plano · criar o serviço · certificados
   e TLS · nome DNS personalizado · backup · configurações de rede · slots de implantação

**Implementar e gerenciar redes virtuais (15–20%)** — 13 bullets
1. ◆ Configurar e gerenciar redes virtuais no Azure (5): redes virtuais e sub-redes · emparelhamento · endereços
   IP públicos · rotas definidas pelo usuário · solucionar problemas de conectividade
2. Configurar o acesso seguro às redes virtuais (5): NSGs e Grupos de Segurança de Aplicativo · avaliar as regras
   de segurança efetivas · Azure Bastion · endereços de serviço para PaaS · endpoints privados
3. Configurar a resolução de nomes e o balanceamento de carga (3): Azure DNS · balanceador de carga interno ou
   público · solucionar problemas de balanceamento de carga

**Monitorar e manter os recursos do Azure (10 a 15%)** — 13 bullets
1. ◆ Monitorar recursos no Azure (6): interpretar métricas · definir configurações de log · consultar e analisar
   logs · regras de alerta, grupos de ações e regras de processamento de alertas · Azure Monitor Insights para
   VMs, contas de armazenamento e redes · Observador de Rede e Monitor de Conexão
2. Implantar o backup e a recuperação (7): cofre dos Serviços de Recuperação · cofre de Backup do Azure · política
   de backup · operações de backup e restauração · Azure Site Recovery · failover para região secundária ·
   relatórios e alertas de backup

## 1.4 Cliente / build
- `SEED_VERSION = '1'` (`src/data/QuestionLoader.ts:10`) + early-return `:19`; lista de 8 arquivos
  hardcoded `:21-30`; filtro **silencioso** de inválidas `:47-49`; `getBankLine()` soma `meta` (`:93,117`).
- SW: `cacheName:'az104-questions'`, `maxAgeSeconds` 30 dias (`vite.config.ts:18,21`).
- `dist/assets/index-*.js` = **475.807 B raw / 126.287 B gzip**; teto 140 KB (`scripts/check-budget.mjs:9`)
  → **88,1%**. Comentário stale em `check-budget.mjs:4` ("~96KB gzip").
- `grep "import(" src/` = **0** (sem code-splitting). `admin-panel` eager em `src/components/app-shell.ts:31`
  (493 linhas). `src/config/flags.ts:6` = `gamification: false`.

## 1.5 Hooks / CI / testes
- `.husky/pre-commit` = secret guard + lint-staged + SIZE 200 KB. **Não roda `validate`**, apesar do comentário
  prometer "VALIDATE entra em S2".
- `.husky/pre-push` = `npm run ci` (= `lint && build && test && test:count && validate && meta:check &&
  migration:check`, `package.json:45`) — **sem `budget` e sem e2e**; ambos só no `ci.yml:21,38`.
- 10 workflows, só actions oficiais + `gitleaks/gitleaks-action@v2`. Zero tags. `package.json:4` = **`0.0.0`**.
- `vitest.config.ts` sem `environment` (node) → padrão é `vi.stubGlobal('localStorage', …)`
  (`tests/unit/question-loader.test.ts:44`, `tests/unit/studyhub.test.ts:77`). 15 suítes em `tests/unit/`;
  **nenhuma cobre `push/pullStudyProfile`**.
- `sourceUrl` só é consumida em `src/study/study-hub.ts:109-121` (dedup por URL, cap 8, filtro
  `mslearn|community`) e `src/study/topics.ts:43` → **grounding em massa muda o "estudar depois"**.

## 1.6 Ferramentas do banco (CLI real)
`check-seq.mjs` (raiz, `<arquivo> <prefixo>`) · `npx tsx scripts/syllabus-gap.mts [--md]` ·
`node scripts/question-curation.mjs` (HEAD em **todas** as `sourceUrl` do banco, `CONCURRENCY 6`) ·
`node scripts/validate-study-links.mjs [--fix] [--out]` (34 URLs de `study-topics.json`) ·
`node scripts/check-exam-outline.mjs` · `node scripts/bump-bank-meta.mjs [--check]` ·
`npx tsx scripts/build-simulados.mts` · `npx tsx scripts/new-question.mts` ·
`node scripts/check-exam-outline.mjs` · `npm run validate` · `npm run budget`.
`docs/QUESTION-GUIDELINES.md:3` é o checklist §4.1 de registro. `data/study-topics.json` = 34 tópicos com
`url` + `match[]` (palavras-chave) — landing pages de seção, **são rasas demais para ancoragem**.

---

# TRACK A — Achados de código

## A1 · P0 · `saveProfile` corrompe o LWW entre dispositivos
**Evidência:** `src/study/study-profile.ts:63` → `p.updatedAt = Date.now()` incondicional ·
`src/sync/study-sync.ts:47` monta `merged.updatedAt = remoteAt` · `:50` grava no localStorage ·
`:54` chama `saveProfile(userId, merged)`, que **muta o mesmo objeto** e regrava (`:65`).
**Efeito:** `pullStudyProfile:38` (`if (remoteAt <= local.updatedAt) return`) descarta atualização legítima
de outro aparelho; `pushStudyProfile:20` reenvia o timestamp inflado. Perda silenciosa. Zero testes.

**Correção (4 pontos):**
1. `study-profile.ts:62-69` — `saveProfile` só persiste; **não** toca `updatedAt`.
2. `src/study/study-hub.ts:90` — `saveProfile(userId, { ...profile, weak, updatedAt: Date.now() })`.
3. `src/components/study-hub-panel.ts:59` — `saveProfile(this.userId, { ...markSeen(p, topicId), updatedAt: Date.now() })`.
4. `src/sync/study-sync.ts:54` — mantém `remoteAt`; remover o `setItem` manual da `:50` (redundante).

**Testes (RPR, padrão do repo):** novo `tests/unit/study-profile-sync.test.ts` —
(a) `saveProfile` preserva o `updatedAt` recebido · (b) `pullStudyProfile` mantém o remoto
(`vi.mock('../../src/sync/supabase.js')`) · (c) `pull` com `remoteAt <= local` **não** sobrescreve.
Escrever (a)–(c) **antes** do fix e ver falhar (prova o bug), depois passar.

**Gate A1:** teste novo falha no código atual → verde após fix. `LESSONS.md` + `LOG.md`.

## A2 · P1 · Auditoria admin existe e nunca é escrita
**Evidência:** `admin-panel.ts:74` é o **único** uso de `az104_admin_logs` em `src/` e é **select** (`:73-77`) ·
`grep "\.insert(" src/` = **0** · `setRole` (`:179-194`) promove/rebaixa role **sem log** ·
UI "Auditoria" (`:403-413`) mostra estado vazio permanente (`:406-407`).
**Chave:** tabela `002_az104_platform_user_admin.sql:167-175`; RLS `:180` enable, `:183-184`
`for all using(az104_is_admin()) with check(az104_is_admin())` → **insert de admin já é permitido, sem migration**.

**Correção:**
- Em `setRole`, após update bem-sucedido: `insert` em `az104_admin_logs`
  `{ actor_id: <getUserId() — já usado em :65>, action: 'role.change', target_type: 'profile', target_id: userId, meta: { role } }`.
- Falha no insert **não derruba a UI**: `logger.warn('admin', …)` (mesmo padrão do `pushPlatform`).
- Corrigir o comentário stale de `002:165` ("Sem UI própria em v7.0") — a UI existe (P5).

**Testes:** helper puro `adminLogRow(actor, action, target, meta)` com unit; `progress.spec` continua provando
admin vê / user não vê. **Verificação humana:** 2 usuários (admin promove → recarrega → linha em Auditoria).

**Gate A2:** `role.change` visível em Auditoria; user comum segue sem acesso (RLS fail-closed).

## A3 · P2 · Bundle sem code-splitting a 88% do teto
**Correção:** `import()` dinâmico de `admin-panel` na primeira abertura da aba, **com `await` antes do 1º
render da tag** (Lit exige elemento definido antes do render — senão flash de elemento desconhecido) e fallback
de carregamento. `progress.spec` abre a aba admin → vira a prova. Atualizar `check-budget.mjs:4` com o número real.
Study Hub fica para quando a gamificação entrar (G3).

**Gate A3:** `npm run build && npm run budget` → gzip **< 126.287 B** (alvo ≤110 KB); e2e verde; linha de base nova no `LOG.md`.

## A4 · P3 · Shuffle enviesado no Treino
**Evidência:** `src/controllers/treino-controller.ts:47` → `[...candidates].sort(() => Math.random() - 0.5).slice(0, 20)`
(comparador aleatório ≠ permutação uniforme). O repo já faz certo em `QuestionSelector.ts:4-13` (mulberry32) e `:64-68` (Fisher-Yates).
**Correção:** reusar `mulberry32(Date.now())` + Fisher-Yates in-place, sem mudar assinatura pública.
**Gate A4:** unit em `tests/unit/treino-controller.test.ts` — 20 selecionadas de N **sem duplicata**; `tsc` limpo.

## A5 · P3 (cosmético) · `study-topics.json` dentro do bundle
**Evidência:** `src/study/topics.ts:2` importa os ~20 KB; fallback síncrono em `:22`; Supabase em `:27`.
**Correção (G4):** **documentar a exceção** no ADR-001 + comentário em `topics.ts:2`. Refactorar para
fetch+cache fica como opcional pós-prova.

## A6 · P3 · Orçamento de bundle não é gate local
**Evidência:** `.husky/pre-push` = `npm run ci`; `budget` e `playwright test` só no `ci.yml:21,38`.
**Efeito:** estouro de orçamento **passa** no push local e só quebra no CI.
**Correção:** incluir `npm run budget` no script `ci` (`package.json:45`) — 1 linha.

## A7 · P3 · `validate` não roda no pre-commit
**Correção:** adicionar `npm run validate` ao pre-commit **se** ficar <10 s (§9); medir e, se estourar,
manter no pre-push e corrigir o comentário (não mentir sobre o gate).

## A8 · P1 · `check-seq.mjs` não valida domínio multi-arquivo — **CORRIGIDO**
**Evidência original:** `check-seq.mjs` lia **um** arquivo + **um** prefixo. Como `ig` está dividido entre
`identidade-governanca.json` (96) e `identidade-acesso.json` (134), rodar por arquivo dava **gaps falsos** — a
"verificação permanente de sequência" do `LESSONS.md:161-162` estava inoperante desde o particionamento §9.
**Correção aplicada:** modo `--domain <nome-do-dominio>` que concatena todos os arquivos do domínio e valida
dup de ID **global** + sequência + contagem vs `meta.json`. Estado em 2026-10-02: os 5 domínios verdes, 0 dup,
0 gaps, contagem batendo com `meta.json` (243/180/243/184/150).

**Pegadinha que sobrou:** o modo novo recebe o **nome do domínio**
(`identidade-governanca`, `rede-virtual`…), não o prefixo do id. `--domain ig` sai com
`Prefixo nao encontrado`, e era exatamente isso que os docs anunciavam — ver A9.

## A9 · P3 · Doc com comando quebrado — **CORRIGIDO**
O diagnóstico original era `docs/QUESTION-GUIDELINES.md:22` mandar `node check-seq.mjs` **sem argumentos**
(quebraria com `readFileSync(undefined)`). O doc já não manda sem argumento: passou a mandar
`--domain <ig|st|co|rv|mo>`. O defeito mudou de forma e continuou sendo o mesmo da**família** —
**comando documentado que não roda**. Com A8 entregue, os cinco valores documentados falhavam, porque
o flag espera o nome do domínio. Corrigido em `QUESTION-GUIDELINES.md:22`, `API-REF.md:36` e
`TROUBLESHOOTING.md:20`, com o argumento certo e o aviso "nome do domínio, não o prefixo".

Lição que fica: documentar a *forma* do comando não basta — a família de bug é o valor do argumento
estar errado, e só executar o comando pegaria isso.

## A10 · P3 · `.agent/audits/` fora do `.gitignore`
`question-curation.mjs:86` escreve `.agent/audits/curation-*.md` e o `.gitignore` (39 linhas) não cobre
`.agent` → rodar o script localmente suja o `git status`. **Correção:** adicionar `.agent/audits/` ao
`.gitignore` (artefato datado; os outros workflows já usam `/tmp`).

**Gates A6–A10:** hook local mais estrito que o status quo, sem regressão de tempo; `check-seq --domain`
verde nos 5 domínios; CI verde.

---

# TRACK B — Banco 950 → 1000

## B1 · Snapshot oficial versionado (novo, antes de tudo)
`data/exam-skills.json` com os **15 grupos funcionais / 82 bullets** do §1.3, mais `skillsOutlineDate`,
`sourceUrl` do Study Guide e `minorSince` marcando os 5 grupos com mudança *minor*.
`syllabus-gap.mts` passa a reportar **cobertura por bullet** (não só por domínio) e a apontar bullet sem
cobertura. Compara com `skillsOutlineDate` e falha se divergir — torna `check-exam-outline.mjs` redundante
como gate de data (mantido, é o que avisa por issue).

**Gate B1:** `syllabus-gap --md` = 0 gaps de bullet; 5 grupos `◆` explicitamente listados.

## B2 · Especificação das +50 — manual, spec por bullet descoberto (G13)
O change log de 17/abr/2026 marca 5 grupos com mudança *minor*, mas o spec de cada questão **não é o
grupo — é o bullet descoberto medido pelo R0**. Escrever "sobre o grupo" no abstrato gera duplicata
temática (caso real 26/set: `st-171`≈`st-012`/`st-076`, `st-172`≈`st-013` — mesmo fato, cenário diferente,
FNV passou). Alocação-alvo por domínio (ajuste fino pelo R0):
| Domínio | Δ | IDs | Destino das +50 |
|---|---|---|---|
| storage | +10 | `st 171–180` | todas em **◆Arquivos e Blobs**: soft delete (blobs+contêineres), controle de versão de blobs, ciclo de vida, camadas, instantâneo/exclusão temporária de Arquivos |
| compute | +13 | `co 231–243` | ◆VMs (criptografia no host, mover entre RG/assinatura/região, tamanhos, discos, zonas vs conjuntos, VMSS) + ◆contêineres (ACR, ACI, Aplicativos de Contêiner, escala) |
| rede-virtual | +9 | `rv 176–184` | ◆VNets e sub-redes: emparelhamento, IP público, rotas definidas pelo usuário, troubleshooting de conectividade |
| monitoramento | +5 | `mo 146–150` | ◆Monitorar recursos: regras de alerta × grupos de ações × regras de processamento, Insights, Observador de Rede |
| identidade-governança | +13 | `ig 231–243` | sem grupo `◆`: distribuir pelos 3 grupos (Entra usuários/grupos + SSPR + externos · RBAC e escopos · Policy, travas, tags, custos, grupos de gerenciamento) |

- **Mix §4 por lote:** `single .60 / multiple .20 / yes-no .05` (resto `single`; **sem `case-study` novo** —
  evita FK em `case-studies.json`). Dificuldade `easy .20 / medium .50 / hard .30` por domínio.
- **Roteiro por questão:** grupo `◆`/bullet do §1.3 → chave do `grounding-map` (R0) → URL pt-br **verificada
  por fetch** → misconception real como distrator.
- **Checklist §4.1 (lei, `docs/QUESTION-GUIDELINES.md:3`):** cenário realista · ≥4 alternativas plausíveis
  (nunca serviço falso) · `question ≥50` · `explanation ≥100` PT-BR com o porquê de **cada** erro ·
  grounded MS Learn · `source:"mslearn"` + `sourceUrl`.
- **Terminologia:** copiada da página-fonte, **aceitando a mistura de EN do doc** — igual à nota do curso
  PT-BR mais conhecido ("português, exceto nomes oficiais de produtos mantidos em inglês").
- **Autoria (G13, manual puro):** `npx tsx scripts/new-question.mts`, 1 questão por bullet descoberto do R0.
  `generate-questions.mts` só como rascunho opcional → `needsReview:true` até grounding humano (WIP ≤50).
- **Anti-duplicata (G14):** antes de escrever, ler TODAS as questões existentes do mesmo `subdomain`
  (`grep '"subdomain": "<x>"' data/*.json`). Se o fato já é testado, a questão nova testa **outra faceta**
  do mesmo bullet (ex.: soft delete → retenção 1–365d + pré-requisito contêiner-exige-blob; versionamento →
  VersionId imutável + lifecycle limpando versões antigas).
- **Rework `st-171/172` (26/set):** mantêm os IDs; stems reescritos para as facetas acima, ≤60 palavras.
- **Voz de prova (G14):** stem ≤60 palavras · opções curtas · distratores de misconception real
  (padrões extraídos do Practice Assessment oficial — só o padrão, sem copiar conteúdo).

## B3 · Fase 0 — Auditoria (bloqueia o resto)
```bash
node scripts/check-exam-outline.mjs        # OUTLINE_CHANGED=false (syllabus já em 2026-04-17)
npm run validate                           # 950/0
npx tsx scripts/syllabus-gap.mts --md      # 0 gaps
node check-seq.mjs data/identidade-acesso.json ig   # hoje: gaps falsos (A8)
node scripts/question-curation.mjs         # 0 URLs mortas + 0 needsReview
node scripts/validate-study-links.mjs      # 34 URLs de study-topics
npm run meta:check
```
**Gate B0:** validate 950/0 · 0 gaps de bullet · 0 gaps de sequência por domínio (A8) · 0 clusters semânticos pendentes.

## B4 · Fase 3 — Mudanças de código (obrigatórias, ANTES de publicar)
| # | Arquivo | Mudança | Teste |
|---|---|---|---|
| C1 | `src/data/QuestionLoader.ts:10` | `SEED_VERSION '1'→'2'` (ou derivar de `meta`+`updatedAt`) | 2º `ensureSeeded` com total novo re-semeia |
| C2 | `vite.config.ts:18` | `cacheName` versionado (`az104-questions-v2`) | e2e offline: cache novo populado |
| C3 | `src/data/QuestionLoader.ts:93,117` | `getBankLine()` não anuncia total não semeado | semeado ≠ meta → não exibe |
| C4 | `scripts/validate-questions.mts` | guard de **dedup semântico** no CI (hoje o FNV de `:72` só pega `question` idêntica). Alta → erro; média → `.agent/audits/` | teste do guard com um par de paráfrases |
| C5 | `src/data/QuestionLoader.ts:21-30` | incluir eventual arquivo novo (particionamento §9) na lista do seed | `files.length` = contagem real |

## B5 · Fase 4 — Integração
1. `npm run validate` → **1000/0** · 2. remover `az104-mo-145` e substituir por questão real de `mo` ·
3. `node scripts/bump-bank-meta.mjs` (→ `243/180/243/184/150`, `updatedAt` real) ·
4. `npx tsx scripts/build-simulados.mts` · 5. `syllabus-gap` limpo + `question-curation` limpo +
`validate-study-links` 0×404 · 6. `npm run ci` + `budget` + e2e.

## B6 · Ordem de deploy (importa)
`C1`+`C2` → publicar `data/*.json` (1000) → `bump-bank-meta` → rebuild dos 10 fixos.
Rebuild altera `questionIds` do mesmo `simId` → quem está no meio de um fixo retoma com outro conjunto
(sem crash; `pickByIds` ignora ausentes). Por isso rebuild **antes** do ciclo de estudo, nunca no meio.

## B7 · Docs que citam 950 (→1000)
`PLAN.md` L174, L193, L235, L242, L270, L345 · `README.md` L36, L80, L107, L121 · `PLAN-3.md` L22, L25, L173 ·
`CODE-REVIEW.md` L38-39 · `docs/ROADMAP.md` L3 · `src/data/QuestionLoader.ts` L12, L110.
`LOG.md`: **só entrada nova** (histórico não se reescreve).

## B8 · Gates de aceite (Track B) — **todos verdes desde 27/set**
validate **1000/0** · `check-seq --domain` 0 gaps · `syllabus-gap` 0 gaps de bullet · `az104-mo-145` removida ·
`seeded === meta.total` · guard semântico ativo no CI · nenhum `data/*.json` >200 KB ·
`npm run ci` + `budget` + 16 e2e verdes · 10 fixos com 50 ids únicos.
O item **1000/1000 com `sourceUrl` viva e verificada (G10) NÃO pertence a esta trilha** — é o R3
(§R3), ainda em 949. Registrar aqui seria prometer o que depende de 2–3 semanas de trabalho manual.

---

# TRACK R — Grounding (literal 1000/1000, G10) — **R0–R2 e R4 fechadas · R3 pendente (949)**

## R0 · `data/grounding-map.json` + `scripts/grounding-map.mts`
**Achado 27/set (inventário real): 946 `subdomain` distintos para 952 questões** (251 `-multiplos` ·
172 `-conceito` · 523 demais). Vocabulário fragmentado demais para mapa chave→URL (dar ~946 entradas
manuais). Por isso o mapa é **chaveado pelos 82 bullets oficiais** (`exam-skills.json`, conjunto fixo):
`bullet-id → URL pt-br específica` (ex.: `/pt-br/azure/storage/blobs/soft-delete-blob-overview`),
**cada URL verificada por fetch** (200 + texto contém o termo-alvo) antes de entrar. Atribuição
questão→bullet é semi-automática (keyword propõe, humano confirma por questão no B2/R3) e o mapa acumula
`stems observados → bullet` incrementalmente. O mapa é a fonte de verdade de provenance.

## R1 · `scripts/check-grounding.mts` — o invariante
Baixa a página (cache por URL em `.agent/cache/`, TTL 7 dias → ~100-400 fetches para 1000 questões), tira
HTML, normaliza PT-BR (minúsculo, sem acento, espaço colapsado), tokeniza **stem + texto da(s)
alternativa(s) correta(s)**, descarta stopwords e termos genéricos, e mede **cobertura lexical**.
(A explicação — porquê de cada erro — cita conceitos fora da página por construção; medi-la penalizaria
explicação boa.) `< 0.5` → aponta a questão. Roda local por lote + no job mensal (`question-curation.yml`).
**Honesto sobre o limite:** é filtro de plausibilidade, não prova semântica — pega ancoragem preguiçosa
(página errada, índice genérico), não substitui a revisão humana. **Calibração 27/set:** âncoras certas
0.56/0.57/0.48, âncora errada de propósito 0.19/0.37 → limiar 0.5 separa todos os casos medidos.
**Recalibração 29/set (G15):** o default do código era **0.3**, que deixaria passar a âncora errada de
0.37. Medido nas 51 `mslearn`: 0.3→0 apontadas · 0.4→1 · 0.5→1 · 0.6→12. O apontado em 0.5 era
`az104-co-233`, e a âncora podia mesmo melhorar — `move-support-resources` (lista de tipos de recurso) foi
trocada por `move-region` ("Migrar os recursos do Azure entre grupos de recursos, assinaturas e regiões"),
que cobre os três eixos e cita o Site Recovery. **0.5 é o default do código**; o filtro mede só o
`sourceUrl` primário da questão (a união com `extraUrls` vale para o R2, não para a cobertura).

## R2 · Travar o provenance
`validate-questions.mts` passa a exigir que toda `sourceUrl` `mslearn` exista como chave em
`grounding-map.json` (impede URL solta/drift). `community` fica isenta.

## R3 · Execução por domínio (a parte cara) — **PENDENTE, não iniciado**
Restam **949** `original` (1000 − 51 `mslearn` já ancoradas no B2). Sem `.agent/audits/retrofit-*.md`
qualquer: nenhum lote foi aberto. Por questão:
- **T1** — a página afirma o fato → carimba `source`+`sourceUrl`, bump `updatedAt`
- **T2** — a pergunta está certa mas a doc não formula assim → **reescreve** enunciado/explicação para casar com a doc
- **T3** — não verificável na doc oficial → **reescreve** a pergunta para um fato que a doc sustenta
Nada fica `original` (G10). Progresso = o próprio `git diff` (cada lote é um commit). Relatório local de
triagem em `.agent/audits/retrofit-<domínio>.md` (ignorado, A10).
Ordem dentro do lote: `ig` primeiro (grupo sem `◆`, mais estável) → `co` → `rv` → `st` → `mo`.
**Não facturar um lote como fechado sem o relatório correspondente.**

## R4 · Endurecimento do CI
`question-curation.mjs:20` `CONCURRENCY 6 → 10`; `question-curation.yml:18` `timeout-minutes 15 → 25`
(hoje 0 URLs; com ~150-400 páginas distintas o pior caso encosta no teto). 1 retry.

## R5 · Efeito no produto + docs
Com 1000 ancoradas, `study-hub.ts:109-121` passa a gerar "estudar depois" com as páginas das questões que o
usuário errou. **QA manual obrigatório:** nunca >8 links, nunca apontando para índice genérico, links
relevantes para o simulado feito. README perde o "procedência mista" e passa a declarar
**"cada questão com link para a documentação oficial"**. Se alguma adaptação MIT entrar, §Créditos no README (G11).

## Fontes externas — o que pode e o que não pode entrar
| Fonte | Licença | Uso permitido |
|---|---|---|
| `learn.microsoft.com/pt-br/...` (Study Guide + páginas de produto) | pública | **fonte de grounding** — é o que o plano usa |
| `timothywarner/az104` (MIT, 282★) | MIT | adaptar com atribuição (cenário, não copiar texto) |
| `StefanoFrusone/Azure-104-Certification` (MIT) | MIT | adaptar com atribuição; 320+ comandos como referência de terminologia |
| `timothywarner-org/az104-cert-buddy` (MIT) | MIT | referência de **método** (gerar com URL do Learn) |
| `MicrosoftLearning/AZ-104-MicrosoftAzureAdministrator` (MIT) | MIT | melhor fonte para descobrir a URL do Learn por tópico |
| Practice Assessment oficial do Learn | termos Microsoft | **proibido** redistribuir/derivar |
| Cursos PT-BR pagos (Udemy etc.) | proprietário | **proibido** copiar; URLs do Learn citadas em descrição pública são fatos e podem alimentar o mapa |
| SPOTO / "100% real dumps" | NDA + viola NDA | **proibido**; e com pesos velhos (rede 25-30%) — sirve de exemplo do que não copiar |

---

# TRACK C — Visibilidade no GitHub

## C1 · Estado verificado
- `README.md:5` hero = `public/icons/source.png` (**378 KB**, 1426×905, fundo transparente, arte ~11%) — o
  mesmo asset que já causou estouro de Lighthouse em 26/set. `README.md:31-32` = 2 screenshots estáticos.
- 4 screenshots prontos em `docs/screenshots/`: `home-desktop` (108 KB), `quiz-mobile` (71 KB),
  `review-mobile` (55 KB), `study-hub-desktop` (95 KB).
- **Zero tags** → Releases vazio. `package.json:4` version = **`0.0.0`**. Sem `CHANGELOG.md` (coerente com §15).
- 10 workflows, só actions oficiais. Discussions ON.
- Topics atuais (10, a confirmar com `gh repo view --json topics`): `az-104 azure certification lit
  offline-first pwa spaced-repetition supabase typescript vite`.

## C2 · Itens
| # | Item | Esforço | Risco |
|---|---|---|---|
| C-1 | `package.json` version `0.0.0 → 0.1.0` | 2 min | nenhum |
| C-2 | Topics de intenção de busca: 10 → **17 de 20** | 5 min | nenhum |
| C-3 | Release `v0.1.0` (tag + notas; **sem `CHANGELOG.md`**) | 20 min | nenhum |
| C-4 | Hero do README → `source-logo.webp` (136 KB) | 5 min | nenhum |
| C-5 | GIF no topo (5–8 s, ~800 px, ≤3 MB, `docs/screenshots/quiz.gif`) | 1–2 h | baixo (C3) |
| C-6 | `.github/workflows/release.yml` (11º workflow) | 30 min | baixo |
| C-7 | Seção "Onde reportar" (Issues vs Discussions) | 15 min | nenhum |
| C-8 | Star History no fim do README | 5 min | cosmético |
| C-9 | Social preview (upload manual de `public/icons/social-preview.png`) | 5 min (humano) | nenhum |
| C-10 | §Créditos no README (atribuições MIT, G11) | 20 min | nenhum |

## C3 · Conteúdo
**C-2 Topics (17/20):** manter os 10 atuais + `azure-administrator` `exam-simulator` `study-app` `education`
`portuguese` `brazil` `leitner-system`. GitHub Topics também indexam no Google → ganho fora da plataforma,
alinhado ao SEO já no ar.

**C-3 / C-11 Releases:** `v0.1.0` = correções de código (Track A) + visibilidade; `v0.2.0` = banco 1000
fundamentado. Tag annotated + notas curtas (o que é · 950 questões PT-BR · PWA offline · Study Hub · link
da Pages). **Não** usar `v7.x` — é a versão do **plano**, não do app.

**C-4 Hero:** `![logo](public/icons/source.png)` → `![Passei AZ-104](public/icons/source-logo.webp)`
(-242 KB, renderiza bem no dark/light, bate com o app).

**C-5 GIF:** `docs/` **não** é servido pelo Vite (só `public/`) → **zero impacto** em bundle e Lighthouse.
Captura com Playwright (já devDep, mesmo padrão do `render-icons.mts`) via `recordVideo` (webm) → ffmpeg do
sistema (instalado no WSL, documentado em `docs/wsl-environment.md`) → `palettegen`/`paletteuse` para
encolher. Conteúdo: responder 1–2 questões, timer correndo, navigator avançando, card de vitória, via
`?local=1` — **nenhum dado real de usuário**. `review-mobile.png` e `study-hub-desktop.png` são os frames de
referência.

**C-6 Workflow de release** (espelha `e2e-only.yml` + `deploy.yml`; sem action de terceiros):
`on: push: tags: ['v*']` + `workflow_dispatch` · `permissions: contents: write` · `concurrency: release` ·
job `check` (`npm ci` + `npm run build` — build sem env = modo local, **nenhum segredo necessário**) ·
job `release` com `gh release create "$GITHUB_REF_NAME" --generate-notes` e
`env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (runner já tem `gh`; evita `softprops/action-gh-release`).

**C-9 Social preview:** sem API (`usesCustomOpenGraphImage:false`) → upload manual; asset já existe.

## C4 · Gates da Track C
`gh repo view --json topics` = 17 · release `v0.1.0` com tag · `package.json` = `0.1.0` · README sem
`source.png` e com o WebP · GIF ≤3 MB · CI verde · **nenhuma alteração em `src/`**.

## C5 · A verdade sobre estrelas
Para este tipo de projeto, estrela não vem da busca do GitHub — vem de link externo. C1–C10 são o
**multiplicador**. O volume vem de distribuição: r/Azure · r/brasil · r/brdev · Microsoft Tech Community ·
comunidades de certificação (Telegram/Discord) · LinkedIn em PT-BR · YouTube ("prova AZ-104 2026 em
português") · a página do Study Guide oficial. Ordem: **Release primeiro** → usar a Release como link
canônico → 1 post por comunidade, com GIF, sem link-drop. Sem analytics externo (corte §15): mede-se por
estrelas/PRs/Issues. Linguagem honesta: "questões autorais em PT-BR, não são cópias da prova" (README:51-54).

---

# §2 Ordem de execução — situação em 29/set
**Gasto:** A1 → A2 → A6/A7 → A8/A9/A10 → B3 Fase 0 → B1 → R0/R1/R2 → B2 (5 lotes) → B4/B5.
Falta só a **verificação da A2 com 2 usuários**, que depende da migration 002 no Supabase.

**Restante, na ordem de qualidade (não de tempo):**
1. **Doc-sync do estado** (§5 + README 950→1000) — mecânico, e é o que impede o projeto de se perder.
2. **A2 verificada** com 2 usuários — depende de migration 002 (ação do dono).
3. **Aposentar as 175 de autoavaliação (G16) e repor** — o substituto nasce ancorado, então fazer isto
   *dentro* do R3 evita ancorar o mesmo fato duas vezes.
4. **R3 lote a lote** (`ig` primeiro) — o gargalo; cada lote com `.agent/audits/retrofit-<domínio>.md`.
5. ~~**Revisão das 22 da valve**~~ — feita (22→0). Não sobra.
6. **Track C** — `v0.1.0` (código + visibilidade) pode sair a qualquer momento; `v0.2.0` só com R3 fechado.
7. **A3/A4/A5** antes da próxima feature grande.

> **Ordem que quebraria qualidade:** começar o R3 antes de fechar G16 faria ancorar um bloco de 175
> questões que será aposentado logo depois. Daí a aposentadoria vir **dentro** do R3, e não antes.

# §3 Esforço total — recalculado em 29/set (gasto vs restante)
| Trilha | Esforço | Situação |
|---|---|---|
| A1+A2 | ~2,5 h | **gasto** (falta só a verificação com 2 usuários) |
| A3–A10 | ~6 h | **gasto** (`LOG.md` 26/set) |
| B0+B1 (auditoria + snapshot oficial) | ~1,5 dia | **gasto** |
| R0–R2 (grounding-map + check-grounding + validação) | ~3 dias | **gasto** (R0–R2 e R4 fechados) |
| B2 +50 **manual puro** (G13/G14, ~1h/questão) | ~2 semanas | **gasto** (51/51) |
| Rework `st-171/172` | ~2 h | **gasto** |
| B4/B5 integração | ~1 dia | **gasto** |
| **R3 — grounding das 949 restantes** | ~2–3 semanas | **RESTA** (o gargalo) |
| **Aposentar 175 de autoavaliação + repor** (G16) | ~2 semanas | **RESTA** (depende do R3: substituto nasce ancorado) |
| ~~Revisão humana das 22 da valve~~ | ~3 h | **gasta** (22→0; 2 bugs de conteúdo encontrados) |
| **C visibilidade** (C-5 GIF domina) | ~4 h | **RESTA** (nenhum item feito) |
| **Doc-sync §5** | ~3 h | **fechada** (1000 + 115 unit em README/CODE-REVIEW/TESTING/ROADMAP/STUDY-LINKS; A8/A9 corrigidos) |
| **Total restante** | **~4–5 semanas de trabalho focado** | |

# §4 Fora de escopo (mantido — `PLAN.md §15`)
`sw.ts`/`workbox-cli` · TS 7 · `ordering`/`weight` · novos `case-studies`/simulados fixos · gamificação (só a
flag já existe) · push/analytics externo/loja · **`CHANGELOG.md` no repo** (as notas vivem nas Releases) ·
**não** mudar `durationMinutes: 100` sem conferir o sandbox oficial (terceiros discordam entre 100/120 min).

# §5 Doc-sync — situação em 29/set
**Feito:** `LOG.md` (entrada por trilha, incluindo as de 29/set) · `LESSONS.md` (A1, A8, shuffle/explação,
valve de empate) · `AGENTS.md` (gatilhos e skills) · este plano (§0.1, G15, G16, §2, §3).

**Pendente (nada aqui foi executado ainda):**
- `README.md` — **já corrigido** (era "950 questões" em 4 lugares; banco tem 1000). A linha "Banco de
  N questões" é gerada em runtime por `getBankLine()` a partir de `meta.json`, então não volta a divergir.
  O README também precisa declarar a procedência real: **51/1000 com link para a documentação oficial**
  até o R3 fechar (não "cada questão tem link" — seria mentira).
- `PLAN.md` §4 (meta do banco) · §9 (hooks com budget/validate) · §11 (milestone S18) · §14 (DoD 1000±tol).
- `CODE-REVIEW.md` — os 10 achados com "corrigido em <commit>".
- `docs/ARCHITECTURE.md` — ADR-001 (exceção do `study-topics.json`).
- `docs/QUESTION-GUIDELINES.md` · `docs/API-REF.md` · `docs/TROUBLESHOOTING.md` · `CONTRIBUTING.md`
  (CLI real: `validate`, `check-grounding`, `fill-grounding`, `remap-explanation-letters`,
  `check-seq.mjs --domain <nome-do-dominio>` — o script **existe** e o modo `--domain` está entregue e
  verde nos 5 domínios; A8/A9 já corrigidos acima).
- `docs/DEPLOY.md` · `docs/ROADMAP.md` (releases v0.1.0/v0.2.0) · `docs/STUDY-LINKS.md`
  (grounding vs topics) — este último precisa dizer que só 51/1000 têm link.
- Sem `CHANGELOG.md` por decisão (§4).
