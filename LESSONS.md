# LESSONS.md — PasseiAZ-104

> Registro RPR. Cada falha vira regressão + lição travada no plano.

## 2026-09-25 — Treino com placar sempre 0 + botão morto em perfil zerado (Sprint 3.2)

- **O quê:** (1) `startTreino` nunca chamava `engine.load()` → state `idle` → `answer()` descartava
  tudo → `finishTreino` sempre `0/N`, sem erro visível. (2) Treino não chamava `ensureSeeded()`
  (só o quiz chamava) → em perfil zerado o botão do domínio não fazia nada.
  Ambos invisíveis porque **nenhum e2e cobria o treino** (só quiz/gate/offline).
- **Testes que reproduzem:** `tests/unit/treino-controller.test.ts` (start ativa engine; finish
  pontua de verdade) + fluxo e2e manual (pausa/continua/finaliza com diálogo).
- **Correção:** `engine.load(picked)` no `start` + `ensureSeeded()` no `start` + banner reaproveitado.
- **Regressão permanente:** engine novo sempre recebe `load()` antes de `answer()`; todo fluxo
  com botão (treino incluso) tem ≥1 teste que chega ao fim.

## 2026-09-25 — método `async` no template Lit rende Promise em branco (aba Estudo)

- **O quê:** `renderEstudo()` era `async` — o template recebia uma Promise e o Lit renderizava
  nada: aba Estudo 100% em branco em produção, sem nenhum e2e cobrir (só descoberto em screenshot manual).
- **Teste que reproduz:** `tests/e2e/estudo.spec.ts` — guia oficial visível + estado vazio com ação
  (nota: `innerText` não atravessa shadow DOM nem no `body`; medir em elemento interno).
- **Correção:** render síncrono sobre estado (`estudoDue/estudoTruncated/estudoLoaded`) +
  `loadEstudo()` disparado no `select('estudo')`.
- **Regressão permanente:** toda aba/view tem ≥1 e2e afirmando conteúdo visível; método de render
  nunca `async` (async só em loaders com flag de estado).

## 2026-09-25 — workbox-build ignora `urlPattern` função no runtimeCaching (Sprint 2)

- **O quê:** `runtimeCaching` com `urlPattern: ({ url }) => ...` gerou `sw.js` SEM a rota
  (só `precacheAndRoute` + navegação) — teste `offline: seed volta do cache do SW` falhava
  com timeout, sem erro explícito no build.
- **Teste que reproduz:** `tests/e2e/offline.spec.ts` (2º teste) + probe de `caches.keys()`
  (só `workbox-precache-v2`, sem `az104-questions`) + `grep -c az104-questions dist/sw.js` = 0.
- **Causa-raiz:** o `generateSW` do workbox-build serializa a config p/ o `sw.js`; função como
  `urlPattern` não sobrevive à serialização e a rota é descartada em silêncio.
- **Correção:** `urlPattern: /\/data\/.*\.json$/` (RegExp serializa). Prova: `grep -c` = 1 +
  `StaleWhileRevalidate` presente + teste e2e verde.
- **Regressão permanente:** regra nova de runtimeCaching sempre RegExp/string; estreia exige
  `grep <cacheName> dist/sw.js` + teste e2e que aborte a rede e prove o cache.

## 2026-09-25 — Seed parcial silencioso no QuestionLoader (Sprint 1 P0)

- **O quê:** `ensureSeeded()` engolia falha de fetch por arquivo (`continue` mudo) e marcava
  `localStorage SEED_VERSION` incondicionalmente — usuário com 1 arquivo falhando na 1ª carga
  ficava com um domínio faltando para sempre, sem erro visível e sem retry na UI.
- **Teste que reproduz:** `tests/unit/question-loader.test.ts` — mock fetch 7 OK + 1 falha 500
  (e variante com `throw` de rede) → `rejects.toThrow(/seed parcial: 7\/8/)` + seed NÃO marcado.
- **Correção:** track `ok/failures` por arquivo, `warn` via logger por falha, `throw` se
  `ok !== files.length` (nunca marca incompleto) + botão "⚠ Banco incompleto — tocar para
  recarregar" no header (`retrySeed()` limpa `VERSION_KEY` e tenta de novo).
- **Regressão permanente:** seed só marca 100% OK; toda falha de seed tem log + retry visível.

## 2026-09-25 — meta.json com drift silencioso (Sprint 1)

- **O quê:** `countsByDomain` dizia storage 125 / compute 150; o banco real tinha 170 / 230.
  Ninguém atualizava `meta.json` ao fechar lotes — fonte da verdade mentia.
- **Correção:** `scripts/bump-bank-meta.mjs` regenera counts + `updatedAt` do real;
  `npm run meta:check` (`--check`) no `ci` falha o build em drift (fail-closed no PR).
- **Regressão permanente:** `data/*.json` mudou → `meta.json` acompanha ou o CI quebra.

## 2026-09-25 — SRI descartado com motivo (Sprint 1)

- **O quê:** plano previa SRI nos assets; análise mostrou N/A — zero sub-recursos third-party
  (sem CDN scripts/fontes); injeção pós-build de `integrity` invalidaria a revisão do precache
  Workbox para `index.html` (offline quebraria); CSP `script-src 'self'` + filenames com hash
  já cobrem o modelo de ameaça.
- **Regra:** SRI só entra se surgir sub-recurso cross-origin; reavaliar nesse PR.

## 2026-09-25 — `createRenderRoot() { return this }` mata os `static styles` (QA visual)

- **O quê:** no mobile (390px) TODAS as telas estouravam para ~1029px de largura — logo `source-logo.webp` (1008px) em tamanho intrínseco no header e no hero. Visível só lendo screenshots (e2e/axe passavam verdes).
- **Teste que reproduz:** `tests/e2e/overflow.spec.ts` — viewport 390, home + quiz, `document.documentElement.scrollWidth <= 390` (falhava: 1029/1008).
- **Causa-raiz:** `app-shell` sobrescrevia `createRenderRoot()` retornando `this` (light DOM "para seletores atravessarem nos testes") — **o Lit não injeta `static styles` em render root de light DOM**: 0 `<style>`, regra `header .logo-chip img` existia no código mas em stylesheet nenhum (provado via `matches()=true` + `scrollWidth` + varredura de `document.styleSheets`). Todo o bloco `static styles` do app-shell (~250 linhas: hero, header, brand, nav, media queries) era código morto; o que parecia estilizado vinha do CSS global (`.btn`/`.card`). A premissa do override também era falsa: o Playwright atravessa shadow root aberto sozinho (só o combinador legado `>>>` não funciona).
- **Correção:** override removido (shadow DOM default) + `cardStyles` que faltava no `review-card` (usava `.card` com só `controlStyles`) + nav mobile com `flex-wrap` (os estilos reais reativados mostravam 7 siglas `Ini…/Si…` em 1 linha — wrap devolve 2–3 linhas legíveis).
- **Regressão permanente:** (1) componente novo usa shadow DOM default; light DOM só com justificativa + prova de que os estilos aplicam (screenshot); (2) classe compartilhada usada no template exige o bloco correspondente no `static styles` (auditoria `.btn`/`.card`/`.sr-only` × composição); (3) `overflow.spec.ts` trava scroll horizontal em 390px.

## 2026-09-23 — Botões em Arial 13px: UA stylesheet vence dentro do shadow DOM

- **O quê:** botões crus (nav, theme-toggle, opções do quiz, tags de erro, "Sair", mapa de questões) renderizavam em **Arial 13.3px** em vez de system-ui — medido via `getComputedStyle` no Chromium.
- **Causa-raiz:** a UA impõe `font: 400 13.3333px Arial` em `button/input/select`; o `button { font: inherit }` do `global.css` **não atravessa shadow DOM** (mesma lição do CSS global, 15/set). Só `.btn` (btnStyles) e o input do login (regra local) escapavam.
- **Correção:** `controlStyles` em `shared.ts` (`button,input,select,textarea { font: inherit; color: inherit }`), composto nos 7 componentes com controles crus (app-shell, question-card, review-card, navigator-grid, progress-panel, user-menu, theme-toggle). Verificado: nav e opções agora system-ui.
- **Regressão permanente:** componente novo com button/input/select sempre compõe `controlStyles`; em review de UI conferir **família computada**, não só tamanho (13px Arial ≈ 16px system-ui no olho desatento).

## 2026-09-23 — Trocar asset por `source.png` ao vivo estourou o budget do perf (lh total 900KB)

- **O quê:** deploy do redesign do logo (`384ec10`) com `source.png` (387KB, PNG 1426×905 transparente) direto no login/home. Lighthouse **total 1003.6KB / teto 900KB → falhou**; `security`/`ci`/`deploy` verdes não pegaram (image budget 500KB também OK — o estouro é no total).
- **Causa-raiz:** `hero-wide.png` renderizado (162KB) foi substituído pelo PNG master **387KB** — o asset "certo" em visual, errado em peso; budget de imagem (500KB) deu falso-verde para peso de total.
- **Correção:** `render-icons.mts` deriva **`source-logo.webp` transparente** (140KB, mesma arte; master `source.png` preservada) e login/home o exibem. Perf re-rodado até verde.
- **Regressão permanente:** (1) `source.png` é só master — display sempre por derivado otimizado; (2) trocar asset de UI = **rodar perf até verde**, não basta deploy/security verde; (3) ao trocar asset, conferir o **total** do Lighthouse, não só o budget individual do asset.

## 2026-09-23 — migration SQL falhou: função `language sql` exige tabela existir antes

- **O quê:** 1º run da migration 002 no Supabase erro `42P01` (relation "public.az104_profiles" does not exist) na criação da função `az104_is_admin()`.
- **Causa-raiz:** ordem do script criava a FUNCTION primeiro; **`language sql` valida o corpo (parse/analyze) no CREATE** — como a função referenciava `az104_profiles`, a tabela tinha que existir antes (funções `plpgsql` adiam a validação; `sql` não).
- **Correção:** tabela `az104_profiles` passou a vir antes da função + comentário-guia "ORDEM OBRIGATÓRIA" no arquivo. Idempotência preservada (nada havia sido criado: o script aborta no 1º erro).
- **Regressão permanente:** ao adicionar migration com function `language sql` que referencia table nova → criar a table ANTES; roda sempre no SQL Editor do Supabase (owner) e valida `select` pós-run via PostgREST (`404` = tabela não existe).

## 2026-09-16 — `keyPath: 'date:kind'` inválido aborteu o upgrade do IDB v2

- **O quê:** após adicionar o store `activity` no IDB v2, TODOS os e2e que iniciavam simulado quebraram presos em "Carregando questões…" (4/4 falhos).
- **Teste que reproduz:** `npx playwright test quiz` — em `pageerror`: `Failed to execute 'createObjectStore' on 'IDBDatabase': The keyPath option is not a valid key path` + `Version change transaction was aborted`.
- **Causa-raiz:** `createObjectStore('activity', { keyPath: 'date:kind' })` — **IndexedDB não aceita `:` em key path** (só identificadores `[A-Za-z0-9_$]` e arrays); o upgrade ab-roda a transação, `openDB()` rejeita e `ensureSeeded()`/seed penduram sem nunca resolver.
- **Correção:** store com `keyPath: 'key'`; `ActivityRecord.key = 'YYYY-MM-DD:kind'` explícito no `markActivity` e no pull do `SyncEngine` (LWW continua por `createdAt`).
- **Regressão permanente:** key path de store IDB nunca contém `:`; upgrade v2+ exige rodar o e2e completo (seed passa por `openDB`) — passar só `tsc`/unit não pega esse tipo de erro de runtime.

## 2026-09-15 — vite preview sem `--host` quebra no runner (IPv6)

- **O quê:** estreia do job `e2e` no CI + `perf.yml`: `ERR_CONNECTION_REFUSED` em 127.0.0.1 em todos os testes/lighthouse, mesmo funcionando local.
- **Causa-raiz:** `vite preview` escuta em `localhost` (no runner resolve para ::1); cliente pede 127.0.0.1 explícito → refused.
- **Correção:** `--host 127.0.0.1` no `webServer` de `playwright.config.ts` e no step de preview do `perf.yml`.
- **Regressão permanente:** todo servidor local de teste usa host IPv4 explícito; estreia de workflow novo exige acompanhar o 1º run verde (não assumir).

## 2026-09-15 — CSS global não entra no shadow DOM (marca/botões sem estilo)

- **O quê:** botões `.btn-primary` cinzas sem estilo, `.card` invisível, `label.sr-only` visível, `.hero` desalinhado — mesmo com as regras existindo em `components.css`.
- **Causa-raiz:** componentes Lit usam shadow DOM; CSS global nunca atravessa. As regras "compartilhadas" eram globais de mentira.
- **Correção:** `src/styles/shared.ts` (card/btn/sr-only como `CSSResult`) composto no `static styles` de cada componente; `.hero` movido para dentro do `app-shell`.
- **Bônus do gate:** com o estilo aplicado de verdade, o axe pegou contraste insuficiente (branco sobre `--progress` 3.7<4.5) → token `--btn-primary-bg` (AA).
- **Regressão permanente:** regra nova de componente visual exige classe usada dentro do shadow estar no `shared.ts` ou no próprio `static styles`; e2e axe cobre as superfícies.

## 2026-09-15 — SVG via `<img>` não carrega sub-recursos externos

- **O quê:** `brand.svg` com `<image href="emblem.svg">` renderizou só o texto (emblema sumiu) no app, mesmo com o arquivo presente em `dist/icons/`.
- **Causa-raiz:** SVG em contexto `<img>` roda em "secure static mode": referências externas são bloqueadas.
- **Correção:** `scripts/render-icons.mts` REGENERA `brand.svg` com o emblema inline (extrai `<defs>`+`<rect>`+`<g id="mark">` de `emblem.svg`, fonte da verdade). Editar `brand.svg` à mão é proibido.
- **Regressão permanente:** todo SVG exibido via `<img>` deve ser autocontido; o script falha se `emblem.svg` perder `defs/rect/#mark`.

## 2026-09-11 — scaffold apagou o diretório (Dia 1)

- **O quê:** `npm create vite@latest . -- --template lit-ts --force` → `Operation cancelled` (create-vite 9.x não aceita `--force`). Com `--overwrite`, o scaffold **removeu todos os arquivos pré-existentes** (`PLAN.md`, `LogoPasseiAz104.png`, guard-rails).
- **Causa-raiz:** plano v4.6 descrevia sintaxe do create-vite 8.x; v9 trocou `--force` por `--overwrite` com semântica destrutiva, e o plano mandava rodar scaffold com arquivos já no dir.
- **Correção:** PLAN §16 v5.0 — scaffold SEMPRE em dir contendo só `.git`; docs/assets entram no passo 2; flag documentada como `--overwrite`.
- **Perda:** `LogoPasseiAz104.png` sem backup (verificado: Downloads/Desktop/Documents/Pictures/home WSL). **Pendente re-upload do original.**
- **Regressão permanente:** Gate Dia 1 + §16 exigem ordem passo 0 → 1 (só .git) → 2 (docs/assets).

## 2026-09-15 — gitleaks falhou no CI com falso positivo (RPR)

- **O quê:** `generic-api-key` em `.opencode/skills/*/references/*.md` (docs de terceiros vendorizados).
- **Teste que reproduz:** o próprio run do `security.yml` (exit 2).
- **Regressão permanente:** `.gitleaks.toml` com allowlist de `\.opencode/` + este registro.
- **Regra:** segredos reais só em `.env.local` (gitignored) e GitHub Secrets; nada no repo.

## 2026-09-15 — `gh secret set` gravou secrets VAZIOS (v6.0)

- **O quê:** builds de deploy sem env (login gate inativo em produção); step de verificação contava linhas (`grep -c ""` casa tudo → falso verde 599).
- **Causa-raiz:** `set -a && . .env.local` + pipe para `gh secret set` não propagou valores (stdin vazio = secret vazio, sem erro).
- **Correção:** recriar via `sed -n 's/^VAR=//p' .env.local | gh secret set VAR`; verificação fail-closed (lengths + `exit 1` se count=0) em `deploy.yml`.
- **Regressão permanente:** nunca confiar em `gh secret list` (mostra nomes, não valores); todo secret novo exige verificação de consumo no CI.

## 2026-09-11 — heredoc via wsl.exe corrompeu LOG.md (Dia 1)

- **O quê:** append via `wsl.exe -d Debian -- bash -c "...heredoc com backticks..."` — o Git Bash do Windows executou os backticks ANTES de repassar ao Debian, gravando linhas vazias no `LOG.md` (commit cf835b0; corrigido em e0621a9).
- **Causa-raiz:** camada de transporte Windows ≠ alvo Linux. O alvo estava correto; o meio corrompeu.
- **Regra travada:** arquivo SOMENTE via ferramenta dedicada (Edit/Write); shell SOMENTE para execução (npm/git/test/build). Heredoc via shell: proibido.

## 2026-09-12 — script de normalização zerou compute.json (S10-2)

- **O quê:** `fix-compute.mjs` com lógica de depth invertida capturou objetos `options` em vez das questões e sobrescreveu `data/compute.json` com `[]` (200 questões no limbo).
- **Causa-raiz:** script destrutivo (write in-place) sem backup e sem dry-run, rodado direto no banco.
- **Recuperação:** `git checkout -- data/compute.json` (HEAD tinha 185 íntegras) + reescrita das 15 perdidas (186-200) + `check-seq.mjs` (contagem/dup/sequência) como verificação permanente.
- **Regressão permanente:** (1) todo script que reescreve `data/` faz backup `.bak` antes; (2) `check-seq.mjs <arquivo> <prefixo>` roda após qualquer edição em massa de banco; (3) teste de sanidade: contagem esperada antes do commit.

## 2026-09-15 — senha de banco colada no chat (v6.0)

- **O quê:** credencial Postgres do Supabase colada em chat pelo dono do projeto.
- **Tratamento:** senha tratada como comprometida (rotação exigida no dashboard); app desenhado para NUNCA precisar dela (migrations via SQL Editor pelo dono; frontend usa só anon key pública + RLS).
- **Regra travada:** senha de BD nunca em chat/env/repo (PLAN §17 + `docs/multi-filho.md`); anon key pode ir a `.env.local` (gitignored) e GitHub Secrets — é pública por design.

## 2026-09-26 — `saveProfile` invalidava o LWW que o próprio sync usa (PLAN-4 A1)

- **O quê:** `saveProfile` carimbava `updatedAt = Date.now()` incondicionalmente; `pullStudyProfile` montava o perfil remoto com `updatedAt = remoteAt` e em seguida chamava `saveProfile`, que **mutava o mesmo objeto** e regravava no localStorage.
- **Efeito:** o LWW (`if (remoteAt <= local.updatedAt) return`) comparava sempre contra o relógio local → atualização legítima de outro aparelho era **descartada**, e o `push` reenviava o timestamp inflado. Perda silenciosa de progresso entre dispositivos; nenhum teste cobria `push`/`pull`.
- **Causa-raiz:** carimbar tempo dentro da função de *persistência* confunde "gravar" com "alterar". O mesmo bug reaparece em qualquer `save*` que muta o payload.
- **Correção:** `saveProfile` só persiste; quem muta carimba (`study-hub.ts`, `study-hub-panel.ts`). `pullStudyProfile` mantém `remoteAt` e o `setItem` manual redundante foi removido.
- **Teste que reproduz:** `tests/unit/study-profile-sync.test.ts` (preserva `updatedAt` no save · pull mantém o remoto · pull ignora remoto mais velho · push envia o persistido). RPR: os 4 falharam antes do fix (`expected 900, received 1000000`).
- **Regressão permanente:** regra travada — **função `save*` nunca carimba `updatedAt`**; o carimbo é do call site que muta. Qualquer novo `save*` entra neste teste.
- **Plano:** `PLAN-4.md` §A1.

## 2026-09-27 — Write sem Glob sobrescreveu teste existente + execução paralela (PLAN-4)

- **O quê:** meu `Write` em `tests/unit/treino-controller.test.ts` substituiu os 5 testes de engine do
  Sprint 3.2 pelos meus 4 de shuffle — a ferramenta não exigiu `Read` prévio e a visão do FS estava
  inconsistente com o disco. Detectado por `git show c26d511:path` + contagem de `it(` (9ab3a76 só tinha os meus).
- **Correção:** arquivo mesclado (5 engine + 4 shuffle, mock único original) → 9/9 verdes.
- **Regra travada (1):** **`Glob` (ou `Read`) antes de todo `Write`** — prova que o arquivo não existe na
  árvore efetiva; nunca confie só na memória da sessão para "arquivo novo".
- **Regra travada (2):** **uma sessão por repo por vez.** Sinais de concorrência (stash piscando,
  arquivos sumindo entre comandos, `git status` inconsistente com `ls`) = **parar tudo** e chamar o dono.
  Nenhum gate vale mais que o trabalho não commitado.
- **Calibração R1 (check-grounding.mts):** medir stem+texto-da-correta (nunca explicação — ela cita
  conceitos fora da página por construção); calibrar o limiar com âncora certa E errada de propósito
  antes de travar (0.5 separou 0.56/0.57/0.48 vs 0.19/0.37). Re-verificar se o estilo dos stems mudar.

## 2026-09-28 — shuffle de `options` desatualizou as letras da `explanation` (v7.0)

- **O quê:** `shuffle-options.mjs` reatribui as letras de `options` e reescreve `correct`, mas a
  `explanation` é escrita contra a ordem de autoria ("A está correta: ..."). Resultado: 34/51 questões
  `mslearn` com a explicação **contradizendo o próprio gabarito** na tela do aluno.
- **Causa-raiz:** determinismo por campo não é determinismo de *banco*. Um campo derivado depende de
  outro (`explanation` depende de `options` + `correct`) e precisa ser regravado junto.
- **Correção:** `remap-explanation-letters.mjs` — casa cada trecho com a alternativa por
  **similaridade de texto** (Dice sobre prefixos de token, insensível a acentuação e flexão), com o
  **veredicto do texto como restrição dura** (trechos "correta" só podem receber letra do gabarito).
  Nenhuma dependência de posição ou de estado anterior.
- **Armadilha intermediária (o que deu errado primeiro):** tentei reconstruir as letras "originais por
  posição" (a i-ª menção = a i-ª letra). **Inválido** — o que está gravado no banco já é o texto
  *pós*-shuffle, então a "âncora posicional" só reinjeta a corrupção. O baseline de comparação tinha de
  ser o gabarito + o texto, nunca o arquivo anterior.
- **Erro de regex (silencioso):** o guard usava `est[áa]` e não casava com "**estão**". Todas as
  alegações em grupo plural (`A, B e D estão incorretas`) ficavam **invisíveis** para o gate. Corrigido
  para `est[áaã]o?` — e o gate de letra repetida só passou a ter valor depois disso.
- **Teste que reproduz:** regressão artificial em `az104-st-173` injetando letra repetida
  (`A, B e B estão incorretas`) → gate acusa; injetando letra contraditória → gate acusa.
- **Regra travada:** **campo derivado de `options`/`correct` é regravado no mesmo passo do shuffle**, ou
  o shuffle está errado. E o gate de consistência tem que cobrir *plural* (`está`/`estão`) — regex de
  validação precisa ser testada contra todas as formas que a linguagem realmente usa.
- **Limite do automatismo:** o mapeamento por texto errou em 2 de 7 casos revisados (`rv-183`, `st-179`,
  desempate por corpo ambíguo). O script **recusa gravar** quando algum trecho fica abaixo de
  `SIM_FLOOR`; os casos ambíguos vão para revisão humana, nunca para escrita automática.
- **Armadilha seguinte: o piso de similaridade não é margem.** Com o `SIM_FLOOR` sozinho, `rv-183` e
  `st-179` ainda passavam e o `--write` invertia as letras de um texto que já estava **correto**.
  Causa: corpo compartilhado ("C e A estão corretas: *mesma razão*") gera **dois slots com texto
  idêntico**, então as duas bijeções empatam e quem fica com `C` é decidido pela **ordem de
  `permutations()`** — puro acaso. Similaridade alta **nos dois lados** não é confiança; é ambiguidade.
- **Correção:** `bestMatch` passou a devolver `{ p, margin }`, a folga normalizada para a segunda melhor
  bijeção. Abaixo de `MARGIN_FLOOR` (0.15) a questão vai para revisão manual em vez de ser gravada.
 Validade do valve provada nos dois sentidos: (1) `rv-183`/`st-179` → folga 0%/2% → recusados;
  (2) `rv-179` com letras trocadas e corpos intactos → folga suficiente → planeja, `--write` corrige e
  devolve o texto **exatamente** ao original. (3) injeção de letra repetida e de letra contraditória
  → detectadas.
- **Regra travada:** **um piso absoluto não detecta empate.** Num emparelhamento bijetivo, o que separa
  "casou certo" de "deu empate" é a **folga para o segundo colocado**, não a nota do vencedor. Gate de
  automação que possa inverter algo precisa de um critério de **indecisão** (empate/folga), senão ele
  converte sorte em reescrita.
- **Cuidado com valves fail-closed:** a recusa é o comportamento correto, mas precisa de prova de que a
  ferramenta não ficou inerte — por isso os testes (2) e (3). "0 planejadas" só é notícia boa se houver
  um caso em que a ferramenta **deveria** planejar e planeja.

## Lessons (setembro 2026)

### 27. Trocar âncora primária é editar a `PRIMARY`, não a `EXTRA`

O `fill-grounding.mjs` tem duas tabelas: `PRIMARY` (sobrescreve a `url` do bullet) e `EXTRA` (só
**acrescenta** `extraUrls`). Editei a `EXTRA` achando que trocava a âncora primária de
`ig-access-resources#3`; o mapa continuou com a URL antiga e o verifier reportou **0 URLs com
problema** — porque a URL antiga estava viva, só era a página errada. O sintoma foi o log do fill
dizer "OK ... + role-assignments" para uma URL que virou só extra.

Regra: âncora primária muda na `PRIMARY`; a `EXTRA` é para completar o parágrafo de apoio. Se o fill
não imprimiu a linha `URL <bullet> -> ...`, a primária não mudou.

### 28. Gate de URL não é gate de âncora — e o pior erro é o que passa nos dois

Os três bullets reprovados na auditoria de semântica (`st-accounts#3`, `ig-subscriptions-governance#5`,
`ig-access-resources#3`) respondiam **200**, eram **PT-BR**, e passavam em todo gate automático. O
erro era a página tratar de outra coisa (redundância ≠ replicação · faturamento ≠ assinatura ·
definições ≠ atribuições). Um aluno que estuda pelo link errado aprende a coisa errada com confiança.

Corolário: o gate de cobertura mede questão × página e **não mede bullet**, porque bullet não tem
questão ancorada. Auditoria de âncora tem que existir separada e ser semântica
(`npm run grounding:audit`).

### 29. O slug da URL pode mentir — verificar o H1, não o caminho

`manage/subscription-transfer` responde 200, é PT-BR e a URL diz "transferência de assinatura". A
página é o "hub de transferência de **produto**". O único jeito de pegar foi ler o H1 de cada
candidato depois de um 200. Regra: para âncora nova, olhar o H1 da página, não confiar no slug.

### 30. Comparação textual precisa de radical, senão o relatório accuse âncora boa

Primeira versão do `audit-anchor-semantics` acusou 5 bullets; 4 eram falso positivo por
singular/plural ("Gerenciar **usuários** externos" × "ID **Externa**", "assinatura" × "**assinaturas**",
"rede" × "**redes**"). Cortar o termo no radical de 6 caracteres antes de comparar derrubou de 5
suspeitos para 1 — e o 1 que sobrou era o erro real. Filtro de relatório que alarma em massa é
ruído, e ruído treina a pessoa a ignorar o relatório.

### 31. Duas listas paralelas do mesmo dado: uma delas sempre mente

`verify-grounding-urls.mjs` mantinha `CANDIDATES` (o que eu *achava* ser a âncora) enquanto
`fill-grounding.mjs` mantinha PRIMARY/EXTRA (o que *era* a âncora). Divergiram em dozens de
entradas — inclusive nas quatro que a auditoria de semântica acabou de corrigir. Como todas as URLs
divergentes respondem 200 em PT-BR, nenhuma gate pegaria, e o `--write` do `verify` desfaria as
correções silenciosamente.

Regra: para cada arquivo editado por script, **um autor só**. Escrita no mapa é do
`fill-grounding`; o `verify` só lê e sai com código != 0. Se duas ferramentas escrevem o mesmo
arquivo, uma delas já está obsoleta sem ninguém perceber.

### 32. "O script rodou e não reclamou" não é prova — injete o erro

Escrevi os testes com o HTML do erro **real** (a página de redundância com "replicados" na
descrição, o slug que redireciona, o título "404 - Conteúdo não encontrado"). Dois achados só
apareceram porque as fixtures foram adversariais, não porque o código estava ruim:
- a descrição enfraquecia a checagem e segurava o bug;
- tirando a descrição, apareceu um quarto bug que estava mascarado.

Genuíno, com filtros que rejeitam null/NaN e data no passado, evita esse caminho. Inject-and-verify
acha os buracos; review do código sozinho não pega.

### 33. Página de "não encontrei" pode responder 200

O Learn devolve **200** com página de erro em alguns casos. `status === 200` não prova que a
âncora existe. O `isSoft404` olha título e corpo. Os marcadores são âncora no início do título
(`/^\s*404\b/`) porque existe documentação real sobre **páginas de erro 404 personalizadas** no App
Gateway: casar "404" em qualquer lugar reprovaria âncora boa.

### 34. "Empate de 0%" num matcher é sinal de conteúdo girado, não de matcher fraco

O remapeador recusou 15 questões por empate. Duas delas tinha as **letras rotacionadas**:
`st-178` (B↔C↔D num ciclo de três, cada razão descrevendo o número da opção vizinha)
e `co-234` (A e B trocadas: "B é burstable" descrevia a *série B*, que é a opção A).

O conteúdo factual estava certo nos dois casos. Quem estava errado era o
acoplamento letra↔razão — invisível para quem lê a questão e olha só se o
gabarito está certo. O `--write` teria invertido as letras com base no empate,
que é a inversão sem prova que o gate existe para impedir.

Regra: quando uma ferramenta se recusa a gravar, **a leitura padrão é que o
conteúdo está errado**, não o threshold. Ajustar o threshold para a lista sumir é
destruir o único instrumento que sobrou.

### 35. Filtro de ruído que descarta números cega o item por número

`tokens()` filtrava `length > 2`, o que eliminava "7", "30", "90". Em `st-178`,
onde as opções são "365/90/30/7 dias", as três erradas tokenizavam **todas** para
`{dias}`: sem número não havia vocabulário que as distinguisse, e nenhuma redação
de razão fecharia o caso.

Duas saídas: dar vocabulário às opções (`"90 dias — o mínimo da Cold"`, que
entrega o porquê de cada distrator e trivializa a questão) ou corrigir o filtro,
que é o defeito real. **Ruído de token é palavra, não dígito.** Mesmo regime para
qualquer normalizador que tenha sido escrito olhando prosa.

### 36. Assertion que contradiz o resumo é bug do teste, não do produto

Eu escrevi `expect(saida).not.toMatch(/revisão manual/)` para garantir zero
recusas, mas a linha de resumo **sempre** contém a frase "0 com revisão manual".
O teste reprovava o código perfeito. O certo é `not.toMatch(/^AVISO /m)`: nenhuma
linha de aviso é a condição que importa.

### 37. Cobertura lexical não é veredito, e extração automática acusa a questão certa

`check-grounding` em 51/0 e `audit-anchor-semantics` em 0 suspeitos dizem que a
página existe, é PT-BR e fala do assunto. Nada disso diz que a página **sustenta o
gabarito** — e as 51 lidas uma a uma acharam 2 que não sustentavam, uma delas
com o gabarito errado.

O caso simétrico é o mais perigoso: a folha por janelas acusou `st-176` de defeito
porque pôs ao lado dela "os clientes **podem** enumerar blobs dentro do contêiner".
Essa frase é da lista do nível **Container**. O nível **Blob** — o gabarito da
questão — diz "os clientes anônimos **não podem enumerar os blobs**". A questão
estava certa e a máquina sugeria reescrever.

Duas lições: janela de texto é *localizador*, não *veredito*; e uma ferramenta que
proponha mudança de conteúdo precisa ser lida contra a fonte antes de virar commit.
Automação que só filtra nunca deve editar enunciado.

### 38. Recurso aposentado como gabarito é o defeito que nenhum gate pega

`az104-mo-150` tinha gabarito "NSG flow logs + Traffic Analytics", ancorada na
página que **declara a aposentadoria**: 30/09/2027, sem novas instalações, e sem
análise de tráfego para eles depois disso. A URL respondia 200, em PT-BR, com
título perfeito ("Visão geral dos logs de fluxo do NSG"), e `verify` + `audit` +
`check-grounding` passavam.

Âncora viva prova que a página existe. Prova que a página serve **para a pergunta
que está feita hoje** é outra leitura, e ela exige abrir o documento.

Regra: gabarito que cita um produto com data de EOL é candidato obrigatório a
reescrita, mesmo com todos os gates verdes. E a correção tem de preservar `id` e
letra do gabarito sempre que possível — assim nada se move no `data/simulados.json`
e o conserto não vira pendência de reconstrução.

### 39. `new URL(...).pathname` joga fora o host de um caminho UNC

Com o repositório acessado como `\wsl$\Debian\home\...`,
`new URL('..', import.meta.url).pathname` devolve `\wsl$\Debian\Debian\home\...`:
o `.pathname` de uma URL `file://` traz só o *path*, e o servidor UNC fica de
fora.

O pior não é o `mkdir` falhar. É o `fetchPage` **engolir** a exceção e devolver
`status: 0` com `text` vazio. Toda sonda de frase passou a responder "não casou",
o que se lê como "a página não sustenta a afirmação" — a conclusão oposta. Se eu
tivesse aceitado esse sinal, teria reescrito 15 questões corretas com base numa
falha de I/O.

O sintoma que denunciou: **todas** as sondas falhando ao mesmo tempo, inclusive em
URLs que eu sabia existirem. Falha total é ambiente; falha parcial é conteúdo.

`fileURLToPath` é a forma correta. Onde `ROOT` é concatenado (`${ROOT}data/…`),
a barra final precisa continuar explícita.

### 40. `fill-grounding` não promove página nova a primária — ele só reescreve o que está no `PRIMARY`

Para reancorar uma questão numa página melhor, editar `data/*.json` **não
basta**. `validate` exige que todo `sourceUrl` de questão `mslearn` esteja no
`grounding-map`, e `fill-grounding.mjs` reescreve o mapa a partir de duas
constantes no próprio script — `PRIMARY` e `EXTRA`. Ele tem como invariantE
remover de `extraUrls` qualquer URL que nenhuma questão use.

Ordem que funciona: editar a questão → declarar a URL em `PRIMARY`/`EXTRA` do
`fill-grounding` → rodar `fill-grounding` → `biome --write` → `validate`. Pular
o passo do script faz o `fill-grounding` seguinte **apagar** a URL que eu tinha
acabado de adicionar, e o `validate` acusa "sourceUrl fora do grounding-map"
três questões depois, com a causa duas etapas atrás.

O sinal que denunciou: as três URLs que eu tinha acabado de gravar em
`extraUrls` sumiram sozinhas no `fill` seguinte, e a mensagem do `validate`
("fora do grounding-map") apontava para uma URL que eu ainda estava olhando no
arquivo. **Recalcular um mapa a partir do dado invalida o ajuste manual do
mapa** — o mapa é derivado, e a fonte da intenção é o script.

### 41. Documentar a forma do comando não basta; o valor do argumento também

`docs/QUESTION-GUIDELINES.md`, `docs/API-REF.md` e `docs/TROUBLESHOOTING.md`
documentavam `node check-seq.mjs --domain <ig|st|co|rv|mo>`. O flag existia e
funcionava; os cinco valores documentados saíam com `Prefixo nao encontrado`,
porque o modo novo recebe o **nome do domínio**
(`identidade-governanca`, `rede-virtual`…), não o prefixo do id.

Os três docs estavam errado de forma **idêntica**, e o defeito era invisível a
revisão de leitura: a linha é sintaticamente válida, o comando existe, o flag é
real. Só rodar o exemplo pegou. Um doc que documenta um comando tem de ser
executado antes de ser aceito — por isso os exemplos do `API-REF.md` entram no
`ci` como smoke test, não como prosa.

Corolário: `PLAN-4.md` afirmava que `check-seq.mjs` "não existe neste repo".
Estava errado no sentido oposto: o script existia desde 27/set e o modo
`--domain` já estava verde nos 5 domínios. A entrada de plano envelheceu sem
que ninguém a rolasse junto com a entrega.
