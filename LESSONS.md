# LESSONS.md — PasseiAZ-104

> Registro RPR. Cada falha vira regressão + lição travada no plano.

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
