## O que muda

<!-- 2-3 linhas: comportamento antes → depois -->

## Verificação

- [ ] `npm run ci` verde local (lint + build + test + test:count + validate + meta:check + migration:check)
- [ ] e2e (`npx playwright test`) verde — ou motivo documentado
- [ ] Budget JS gzip ≤140KB (`npm run budget`)
- [ ] axe 0 violações (se tocou UI)

## Evidência

<!-- Screenshots desktop 1526 + mobile 390 se visual; log de comando se script/CI -->

## RPR (se corrige bug ou falha de CI)

- Teste que reproduz:
- Entrada no `LESSONS.md`: <!-- sim/não + data -->
