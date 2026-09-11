# wsl-environment.md

> Ambiente canônico: **WSL2 Debian**. Tudo abaixo verificado em 11/set/2026.

- Distro: Debian (WSL2). Projeto em `~/projects/PasseiSimuladosTI/AZ104` (ext4).
- Node via nvm: `v24.21.0`, npm `11.19.0`. `~/.nvm/versions/node/v24.21.0`.
- Shells não-interativos (`wsl.exe -d Debian -- bash -c`) **não carregam o nvm** sozinhos: exportar `PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"` ou usar `bash -ic`.
- Git SEMPRE dentro do Debian (o git do Windows bloqueia o repo com `unsafe repository`).
- A partir do Windows, o projeto aparece em `\\wsl$\Debian\home\ericsf\projects\PasseiSimuladosTI\AZ104` (somente leitura/edição — nunca `npm`/`git` por esse caminho).
- VS Code: usar Remote-WSL.
