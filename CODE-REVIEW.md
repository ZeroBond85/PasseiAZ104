# CODE-REVIEW.md — PasseiAZ-104 v7.1

> Revisão final pós-PLAN-3 (Sprints 1–5). Método: leitura de código + suíte executada
> (lint/tsc/unit/e2e/validate/meta/migration/budget) + screenshots desktop/mobile lidos.
> Data: 2026-09-26. Base: `main` pós-Sprint 5c.

## Verdict geral: APROVADO PARA PRODUÇÃO ✅ (com ressalvas humanas abaixo)

## Por área

### Engines (Scoring/Selector/Leitner/Quiz/Timer/IRT) — ✅ EXCELENTE
- Puros, determinísticos, testáveis, sem estado escondido. Scoring `round(raw/max×1000)`,
  selector Fisher-Yates + mulberry32 + largest-remainder, Leitner 1/2/4/8/16d com cap.
- IRT 1PL com gate n≥30 (sem amostra = fora; sem falsa precisão).
- Cobertura: scoring/selector/engines/keyboard/irt/analytics/drill unit verdes.

### Sync (IndexedDB + SyncEngine + Supabase RLS) — ✅ SÊNIOR
- IDB = fonte de leitura, Supabase = espelho; LWW por `updatedAt`, Leitner `max()`.
- RLS real em 10 tabelas; admin read-only por `with check`; `az104_is_admin()` só lê.
- `SyncController`: retry auto no `online` + token bucket 10/60s + backoff 30s→300s.
- `upsertOwnProfile` valida payload (`ProfileRowSchema.parse`).

### Components (Lit, Shadow DOM) — ✅ BOM
- Estilos via `static styles` + primitivos compartilhados; composição auditada
  (morto removido em `study-guide`; demais verificados 1 a 1).
- a11y nativa: radiogroup, `aria-live`, `aria-expanded`, dialog com focus trap, axe 0.
- `modal-dialog` único p/ confirm/success/info (zero `alert()`/`confirm()` nativos).

### app-shell (orquestrador) — ✅ APROVADO COM NOTA
- 1324→1061 linhas; lógica de quiz/treino/sync em controllers puros testáveis.
- Meta <500 reavaliada e documentada: restam CSS+templates (fatiar mais = prop-drilling).

### QuestionLoader / offline — ✅ ROBUSTO
- Seed parcial nunca marca versão (throw + retry UI). SW `runtimeCaching` p/ `data/*.json`
  provado por e2e (IDB limpo + rede abortada → seed volta do cache).
- `urlPattern` tem que ser RegExp/string (função é descartada em silêncio — LESSONS).

### Question bank (950 PT-BR) — ✅ FECHADO E VIGIADO
- 950/950 validadas, 0 erros; `meta:check` anti-drift no CI; curadoria mensal
  (needsReview>50, sourceUrl) + watch do outline oficial + gap report.

### Study Hub — ✅ ENTREGA O QUE PROMETE
- 34 tópicos MS Learn verificados (HEAD 200), perfil por usuário + sync,
  hub com fracos + links, drill scorer, guia oficial no app e no pós-simulado.

### Segurança — ✅ ROBUSTO
- Sem segredos no repo (gitleaks + pre-commit); senha Postgres nunca em chat/repo;
  CSP via meta; SRI descartado com motivo documentado; backup semanal (precisa secret).

### Testes — ✅ ABRANGENTE
- 67 unit + 16 e2e (quiz, treino, gate, offline ×2, login, catalog ×2, progress, estudo ×2,
  overflow, axe ×3), RPR como lei, `test:count` fail-closed no CI.

### Documentação — ✅ ATUALIZADA
- README com números reais auto-sincronizados; ARCHITECTURE com ADRs 001/008/009/010 + Mermaid;
  COMPONENTS/TESTING/STUDY-LINKS novos; SECURITY/ROADMAP/TUTOR/CONTRIBUTING reais;
  templates de issue/PR; OG + social preview.

## Riscos residuais (todos humanos, nenhum bloqueia código)

1. Migration 004 não aplicada no Supabase (SQL Editor, 5 min).
2. Promoção admin inicial via SQL (owner, RLS exige).
3. `SUPABASE_DB_URL` p/ backup semanal (Settings → Secrets).
4. SMTP próprio Brevo (magic link sem rate-limit).
5. Validação com 2 usuários + iOS físico.
6. GitHub Settings (About/topics/social preview/proteção `main`/labels/Discussions/auto-merge).
7. Estudo até §12 (média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10) → só então agendar a prova.
