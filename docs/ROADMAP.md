# ROADMAP.md — PasseiAZ-104

> Estado: banco 1000/1000 + PLAN v7.0 executado (Sprints 1–5, QA local ✅).  
> R3 completo: 0 questões sem `sourceUrl`, 100% auditado semanticamente.  
> Falta (humano): estudo até atender às 3 condições do §12 (média‑5 ≥750, nenhum domínio <70%, Caixa 1 <10) · iOS físico · checklist GitHub Settings (Sprint 5d).

## Antes da prova (restante)

- Estudar até média‑5 ≥750 + 3 condições do §12 (ver painel de prontidão)  
- Testar em dispositivo iOS físico (humano)  
- Revisar checklist de configurações do GitHub (secrets, workflows, etc.)

## Feito na v7.0 (16/set/2026)

- [x] Marca revertida para source.png do dono + derivados letterbox  
- [x] Copy final + tela de Orientação (corte 700 só lá)  
- [x] Migration 002: profiles/attempts/doubts/activity_log/study_suggestions/admin_logs + `az104_is_admin()`  
- [x] Experiência por usuário: Progresso (histórico, streak, weak-map, dúvidas, prontidão §12)  
- [x] Study Guide pós-simulado + tags de erro ×5 + aba Admin (analytics por questão c/ distrator, CSV)  
- [x] IDB v2 + SyncEngine push/pull platform · e2e 9/9 · axe 0 · CI verde  
- [x] R3 completo: 0 sem `sourceUrl`, 100% auditado semanticamente  
- [x] Gate de segredo no pre-push/ci ativo  
- [x] v0.1.0 publicada  

## Feito na v6.0 (antecipado do pós-prova)

- [x] Supabase + Auth magic link + sync multi-dispositivo  
- [x] Lighthouse 98/100/100 + axe 0 · UX 2026 (OKLCH, radiogroup, aria-live)  

## Pós-prova

- [ ] Reavaliar TS 7 (pin atual 6.0.3) e lista de modelos §7  
- [ ] Quarentena community (fontes pós-prova: RoodneyMoraes, Anki 4k, Study-Guide)  
- [ ] v1.0.0 · Gamificação extra · push · analytics externo · loja  
- [ ] `ordering` de volta se fonte exigir (§15)  

## Não fazer (cortes §15)

`sw.ts` próprio, `workbox-cli`, auth pré-prova, OpenRouter/runtime, Capacitor garantido, changelog separado, reports na raiz, migration/rollback, `weight`.

