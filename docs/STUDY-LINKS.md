# STUDY-LINKS.md — PasseiAZ-104

> Curadoria dos links Microsoft Learn do Study Hub (Sprint 4, PLAN-3).

## Fonte da verdade

`data/study-topics.json` — ~34 tópicos (`domain/topic/label/url/source/match/order_idx`).
`match`: prefixos de `subdomain` do banco cobertos pelo tópico (`matchTopic` casa por prefixo).

## URLs: só oficiais e verificadas

- Base: página da certificação (09/07/2026) + guia de estudo (23/03/2026) + tabela
  "Recursos de estudo" do guia + hubs estáveis (`virtual-machines/`, `virtual-network/`,
  `role-based-access-control/` etc.).
- Regra: URL nova entra com `HEAD 200` conferido na hora; o CI mensal confere o resto.

## Ciclo de vida (automático)

1. `study-links.yml` (mensal): `validate-study-links.mjs` faz HEAD nas 34 URLs.
2. Redirect 301/308 → atualiza o JSON + **abre PR** (merge humano, 1 clique).
3. URL morta → **abre issue** (humano escolhe substituta).
4. Retry 1× em falha de rede (transiente não vira issue).

## Espelho Supabase (`az104_study_topics`)

- Leitura: qualquer autenticado. Escrita: só admin (aba Admin, futuro CRUD).
- App prefere Supabase com fallback p/ JSON embarcado (offline-first intacto).
- Re-seed manual após merge de PR de links (instrução na migration 004).

## Propor um link

PR editando `data/study-topics.json` + `node scripts/validate-study-links.mjs` verde.
Proposta de IA sem verificação HEAD é rejeitada no review.
