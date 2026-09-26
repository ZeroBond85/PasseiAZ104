# TROUBLESHOOTING.md — PasseiAZ-104

## Restore do checkpoint de geração (§7)

O `generate-questions.mts` salva em `data/.generation-state.json` (gitignored) + espelho `~/.az104-gen-state.json` a cada questão.

```bash
npx tsx scripts/generate-questions.mts --resume        # continua de onde parou
npx tsx scripts/generate-questions.mts --dry-run --limit 3  # testa sem gastar quota
```

429 3× seguidos → pausa diária; rode `--resume` no dia seguinte.

## Banco zerado após script destrutivo

Todo script que reescreve `data/` faz backup `.bak` antes. Se perder:

```bash
git checkout -- data/<arquivo>.json     # volta ao HEAD
node check-seq.mjs data/<arquivo> <prefixo>  # confere contagem/dup/sequência
npm run validate
```

## IDB com dados estranhos (dev)

DevTools → Application → IndexedDB → Delete database `passei-az104`, recarregue (reseed automático).

## CI vermelho

RPR (§0.11): teste que reproduz → regressão permanente → `LESSONS.md`. Re-rodar "pra ver" é proibido.

## Shell Windows × WSL

`npm`/`git`/`gh` SOMENTE no Debian. `wsl.exe -d Debian` a partir do Windows. Arquivos: só via ferramenta dedicada, nunca heredoc pelo shell (LESSONS.md).

## Seed parcial / banco incompleto

`ensureSeeded()` lança `seed parcial N/8` e NÃO marca versão; header mostra "⚠ Banco incompleto — tocar para recarregar". Causas: rede instável na 1ª carga, CDN parcial. Retry limpa `VERSION_KEY` e tenta de novo (LESSONS 2026-09-25).

## CSP bloqueando algo legítimo

Console mostra `Refused to ... (Content-Security-Policy)`. Política em `index.html`:
`script-src 'self'`, `connect-src` só `*.supabase.co`. Novo domínio externo (fonte, API)
exige entrada explícita + e2e verde antes do merge.

## Links Microsoft Learn 404

`node scripts/validate-study-links.mjs` aponta a URL morta; o CI mensal abre issue
automaticamente. Escolha substituta em `data/study-topics.json` e valide local antes do PR.

## Treino com placar 0 (histórico)

`QuizEngine.answer()` descarta tudo se `state !== 'active'` — engine novo precisa de `load()`
antes (LESSONS 2026-09-25, Sprint 3.2). Sintoma primo: botão que não faz nada em perfil
zerado = fluxo sem `ensureSeeded()`.
