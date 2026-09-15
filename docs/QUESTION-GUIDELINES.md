# QUESTION-GUIDELINES.md (+ SKILL de autoria)

> Checklist §4.1 é lei: cenário realista · 4 alternativas plausíveis (misconceptions reais, nunca serviços falsos) · explanation ≥100 PT-BR com porquê de cada erro · grounded MS Learn (MCP+URL quando `mslearn`) · `validate` limpo.

## Códigos travados (id ↔ domain)

- `ig` → identidade-governanca · `st` → storage · `co` → compute · `rv` → rede-virtual · `mo` → monitoramento
- Formato: `az104-<code>-<NNN>` (ex.: `az104-ig-001`). Ver `meta.json`.

## Tipos

- `single`: 1 correct, ≥4 options · `multiple`: ≥2 correct, ≥4 options · `yes-no`: 2 options + 1 correct · `case-study`: ≥4 options + `caseStudyId` válido em `case-studies.json`
- `ordering`: CORTADO (§15) — não usar

## Fontes

- `original`: sem URL · `mslearn`/`community`: `sourceUrl` obrigatório · `ai-generated`: + `generatedWith {model,date}`; sem grounding → `needsReview:true` (WIP ≤50)

## Particionamento (§9)

- Arquivo `data/*.json` ≤200KB; estourou = particiona por subdomínio (precedentes: `identidade-acesso`, `compute-vms/apps/platform`).
- Todo lote novo: `node check-seq.mjs` + `npm run validate` antes do commit.
