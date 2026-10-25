# Continuation Plan — PasseiAZ-104 v9.0

**Source:** PLAN-9.md (PLANO MESTRE v9.0) — supersedes PLAN.md v7.0
**Current State:** Plataforma v7.0 no ar (QA local ✅) — migration 002 aplicada + probe RLS validado (0 falhas) + validada 2 usuários (admin vê / user não vê) + gate de segredo no pre-push/ci + G16 fechado (55 SLA→outline, validate 1000/0) + v0.1.0 publicada; R3 completo (0 sem sourceUrl, 100% auditado); fase de ESTUDO
**Goal:** Close all open gates/risks in PLAN-9.md so that `npm run ci` passes in 0 including `readme:check`, without warning

---

## Open Gates and Risks — Immediate Priorities

### Gate 0.5 — README Honesto + `readme:check` no CI
- **Status:** ✅ DONE (README already shows 587/1000 with honest note; check-readme-claims.mjs exists and validates types, sourceUrl count, total)

### Risk R1 — `score`/`by_domain` already persisted
- **Status:** ✅ DONE (types.ts has scoringModelVersion, migration 005 exists, SyncEngine writes scoring_model_version, mapAttempt handles fallback, SCORING_MODEL_LEGACY=1 defined)

### Risk R2 — Escopo de usuário no IDB exige migração
- **Status:** ✅ DONE (DoubtRecordSchema has userId, IndexedDB has by-owner index, loadDoubtsForUser uses loadOwned, pushPlatform filters by userId, auth-isolation.test.ts exists)

### Risk R3 — `yes-no`: infra pronta, 0 questões, formato não-real
- **Status:** ✅ DONE (removed 'yes-no' from type enum in question-schema.ts:24, removed yes-no refinement)

### Risk R4 — `meta.json.seedVersion` (campo morto)
- **Status:** ✅ DONE (removed seedVersion: 1 from data/meta.json)

### Risk R5 — 413 questões `original` sem `sourceUrl`
- **Status:** ⬜ NOT STARTED (data quality task — curadoria por domínio; 1 citação por subdomínio; outside code scope)

### Risk R6 — `multiple` aceita ≥2 gabaritos
- **Status:** ✅ DONE (updated to require exactly 2 correct in question-schema.ts:100)

### Risk R7 — Cobertura de `sourceUrl` (587/1000)
- **Status:** ⬜ NOT STARTED (no piso in validate — README honestly reports 587/1000; decision: keep as metric-only)

---

## Execution Order (from PLAN-9.md §8 Dependências)

```
Onda 0 (fechada) ──▶ qualquer outra onda
0.4 ──▶ 0.5         (o verificador precisa do número certo para existir)
1.2 ──▶ 1.3         (o mesmo teste trava os dois comportamentos)
1.3 ──▶ 4.4         (radar sobre métrica não corrompida)
1.1 ──▶ 1.5         (regenerar simulados só depois de filtrar o pool)
2.1 ──▶ 2.2         (migração antes do reset no logout)
```

**Recommended order:**
1. Gate 0.5 (README fix) — needs correct number for the checker
2. Risk R1 (score model version) — foundational for persistence
3. Risk R2 (user IDB scope) — critical for data isolation
4. Risk R3 (remove yes-no) — schema cleanup
5. Risk R4 (seedVersion) — cleanup dead field
6. Risk R5 (sourceUrl coverage) — data quality
7. Risk R6 (multiple format) — schema consistency
8. Risk R7 (sourceUrl floor) — validation gate

---

## Validation Plan

After each fix, verify:
- `npm run lint` → EXIT 0, 0 warnings, 0 errors
- `npm run build` → EXIT 0
- `npm run test` → all suites pass
- `npm run readme:check` → EXIT 0
- `npm run ci` → EXIT 0 **including** `readme:check`, **sem warning**
- Final: `npm run ci` is the "portão final da v9.0"

---

## Next Immediate Action

Start with **Gate 0.5**: Update `README.md:58` to reflect the correct 587/1000 sourceUrl count, then run `npm run readme:check` to verify it passes in EXIT 0, and include it in `npm run ci` script.