# LESSONS.md — PasseiAZ-104

> Registro RPR. Cada falha vira regressão + lição travada no plano.

## 2026-09-11 — scaffold apagou o diretório (Dia 1)

- **O quê:** `npm create vite@latest . -- --template lit-ts --force` → `Operation cancelled` (create-vite 9.x não aceita `--force`). Com `--overwrite`, o scaffold **removeu todos os arquivos pré-existentes** (`PLAN.md`, `LogoPasseiAz104.png`, guard-rails).
- **Causa-raiz:** plano v4.6 descrevia sintaxe do create-vite 8.x; v9 trocou `--force` por `--overwrite` com semântica destrutiva, e o plano mandava rodar scaffold com arquivos já no dir.
- **Correção:** PLAN §16 v5.0 — scaffold SEMPRE em dir contendo só `.git`; docs/assets entram no passo 2; flag documentada como `--overwrite`.
- **Perda:** `LogoPasseiAz104.png` sem backup (verificado: Downloads/Desktop/Documents/Pictures/home WSL). **Pendente re-upload do original.**
- **Regressão permanente:** Gate Dia 1 + §16 exigem ordem passo 0 → 1 (só .git) → 2 (docs/assets).

## 2026-09-11 — heredoc via wsl.exe corrompeu LOG.md (Dia 1)

- **O quê:** append via `wsl.exe -d Debian -- bash -c "...heredoc com backticks..."` — o Git Bash do Windows executou os backticks ANTES de repassar ao Debian, gravando linhas vazias no `LOG.md` (commit cf835b0; corrigido em e0621a9).
- **Causa-raiz:** camada de transporte Windows ≠ alvo Linux. O alvo estava correto; o meio corrompeu.
- **Regra travada:** arquivo SOMENTE via ferramenta dedicada (Edit/Write); shell SOMENTE para execução (npm/git/test/build). Heredoc via shell: proibido.
