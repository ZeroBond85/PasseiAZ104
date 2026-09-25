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
