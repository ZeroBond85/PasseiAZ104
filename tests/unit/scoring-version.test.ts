import { describe, expect, it } from 'vitest'
import { SCORING_MODEL_VERSION } from '../../src/engine/ScoringEngine.js'
import {
  type AttemptRecord,
  AttemptRecordSchema,
  partitionByScoringModel,
  SCORING_MODEL_LEGACY,
  scoringModelOf,
} from '../../src/sync/types.js'

function attempt(over: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: 'a1',
    userId: 'u1',
    kind: 'simulado',
    simuladoId: 'sim-oficial-01',
    startedAt: 0,
    finishedAt: 1,
    durationSeconds: 10,
    questions: 50,
    score: 760,
    passed: true,
    answers: [],
    byDomain: {},
    errorTags: {},
    createdAt: 0,
    ...over,
  }
}

describe('Gate 1.4 — versionamento do modelo de pontuação', () => {
  it('a versão atual é 2', () => {
    expect(SCORING_MODEL_VERSION).toBe(2)
    expect(SCORING_MODEL_LEGACY).toBe(1)
  })

  it('tentativa nova carrega a versão corrente', () => {
    const a = attempt({ scoringModelVersion: SCORING_MODEL_VERSION })
    expect(scoringModelOf(a)).toBe(2)
  })

  it('registro antigo sem o campo é legado 1, não undefined', () => {
    // Todo attempt gravado antes da migration 005 não tem a coluna. Sem este
    // fallback o app quebraria ao ler o histórico, e o pior seria assumir 2 e
    // tratar crédito parcial como se fosse 1 ponto por item.
    const antigo = attempt()
    expect(antigo.scoringModelVersion).toBeUndefined()
    expect(scoringModelOf(antigo)).toBe(SCORING_MODEL_LEGACY)
  })

  it('não faz backfill: registro antigo mantém a nota antiga', () => {
    // 868 era a nota do modelo 1 (crédito parcial). Reescrever para o valor do
    // modelo 2 seria inventar resultado; a nota fica, marcada como legado.
    const antigo = attempt({ score: 868 })
    expect(antigo.score).toBe(868)
    expect(scoringModelOf(antigo)).toBe(1)
  })

  it('particiona para a média não somar modelos incompatíveis', () => {
    const lista = [
      attempt({ id: 'v2a', score: 760, scoringModelVersion: 2 }),
      attempt({ id: 'v1a', score: 868 }),
      attempt({ id: 'v2b', score: 840, scoringModelVersion: 2 }),
    ]
    const { current, legacy } = partitionByScoringModel(lista)
    expect(current.map((a) => a.score)).toEqual([760, 840])
    expect(legacy.map((a) => a.score)).toEqual([868])
  })

  it('schema aceita tentativa nova e antiga', () => {
    expect(
      AttemptRecordSchema.safeParse(attempt({ scoringModelVersion: 2 }))
        .success,
    ).toBe(true)
    expect(AttemptRecordSchema.safeParse(attempt()).success).toBe(true)
  })
})
