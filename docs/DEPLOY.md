# DEPLOY.md — PasseiAZ-104

> GitHub Pages via Actions (`deploy.yml`), base `/PasseiAZ104/`.

## Pipeline

1. Push em `main` → `ci` (lint+build+test+validate) → `deploy` (build + upload artifact + deploy-pages).
2. Branch `main` protegida (require check `build`).
3. URL: https://zerobond85.github.io/PasseiAZ104/

## Ativar Pages (feito no Dia 1)

```bash
gh api repos/ZeroBond85/PasseiAZ104/pages -X POST -f build_type=workflow
```

## Rollback

- Revert do commit + push (Pages republica o `main` anterior em ~1min).
- Limites: 100GB/mês banda · 10 builds/h · 1GB site (folgado para este uso).
