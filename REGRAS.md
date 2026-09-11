# REGRAS.md — PasseiAZ-104

> Regras rígidas. Violação = revert.

## RPR (falha no CI = gap de teste)

1. Escrever teste que reproduz a falha.
2. Torná-lo regressão permanente.
3. Registrar em `LESSONS.md`.
4. Só então re-disparar. Exceções: flake de rede, outage externo, mudança só em workflow (só registro).

## WSL

- Projeto SOMENTE em `~/projects/PasseiSimuladosTI/AZ104` (ext4). `/mnt/c` proibido como home.
- `npm`, `git`, hooks, scripts, testes: tudo no WSL Debian. Windows só abre o editor (Remote-WSL).
- `.gitattributes`: `* text=auto eol=lf`.

## Pins

- `.npmrc` com `save-exact=true` existe desde antes do primeiro `npm install`.
- Sem `^`/`~`. `package-lock.json` é a fonte da verdade.
- Scaffold (`create-vite --overwrite`) APAGA o dir — rodar só com `.git` dentro; docs/assets entram depois (§16).

## Segurança

- `.env` nunca commitado (gitleaks). Segredo nunca com prefixo `VITE_`.
- `--no-verify` proibido fora de emergência documentada.
