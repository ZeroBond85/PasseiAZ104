# API-REF.md — PasseiAZ-104

> Referência dos motores (`src/engine/`, `src/sync/`, `scripts/`).

## Engines

- `scoreSession(questions, answers: Map<id, letters>) → { raw, maxRaw, score, passed, byDomain, weakAreas }`
- `selectQuestions(pool, { seed, count, quotas, recentIds, usageCount }) → Question[]` (Fisher-Yates + mulberry32; quotas por largest-remainder via `domainQuotas`)
- `QuizEngine`: `load → answer/flag/go → pause/resume → submit → finish`; `snapshot()/restore()`; estados `idle|loading|active|paused|reviewing|completed`
- `TimerEngine(totalMinutes=100)`: `start/pause/tick(s) → warnings[]`; `expired`; avisos 30/15/5/1
- `gradeCard(card, ok, now)`, `getDue(cards, now, limite=50) → { due, truncated }`; intervalos 1/2/4/8/16d
- `validateQuestion(q) → SafeParseResult` (Zod + superRefine §3)

## Sync (IDB `passei-az104` v1)

- `saveSession/loadSession(id)` · `saveProgress/loadAllProgress()` · `seedQuestions/loadAllQuestions/questionsCount()`
- `ensureSeeded() → { seeded, count }` · `getQuestionPool()`

## Scripts

- `npm run validate` — Zod + FK caseStudyId + ids únicos + dedup FNV-1a
- `node check-model.mjs` — probe de modelos → `meta.json.generatedWith` (precisa `GEMINI_API_KEY`)
- `npx tsx scripts/generate-questions.mts --domain X --count N [--dry-run] [--resume]`
- `npx tsx scripts/build-simulados.mts [N]` — N oficiais fixed/100min
- `npx tsx scripts/import-community.mts --url ...` — quarentena com `needsReview:true`
- `node check-seq.mjs <arquivo> <prefixo>` — contagem/dup/sequência do banco
