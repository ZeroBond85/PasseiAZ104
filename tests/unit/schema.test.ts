import { describe, expect, it } from 'vitest'
import { validateQuestion } from '../../src/engine/question-schema.js'

const valid = {
  id: 'az104-ig-001',
  domain: 'identidade-governanca',
  subdomain: 'entra-id',
  type: 'single',
  difficulty: 'medium',
  question: 'Questão válida com mais de cinquenta caracteres para passar.',
  options: [
    { letter: 'A', text: 'a' },
    { letter: 'B', text: 'b' },
    { letter: 'C', text: 'c' },
    { letter: 'D', text: 'd' },
  ],
  correct: ['A'],
  explanation:
    'Explicação válida com bem mais de cem caracteres para satisfazer com folga o mínimo exigido pelo schema Zod do projeto.',
  source: 'original',
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
}

describe('question-schema §3', () => {
  it('aceita questão válida', () => {
    expect(validateQuestion(valid).success).toBe(true)
  })

  it.each([
    ['id fora do padrão', { ...valid, id: 'x' }],
    ['id incompatível com domain', { ...valid, id: 'az104-st-001' }],
    ['single com 2 correct', { ...valid, correct: ['A', 'B'] }],
    ['correct fora de options', { ...valid, correct: ['E'] }],
    ['community sem sourceUrl', { ...valid, source: 'community' }],
    ['case-study sem caseStudyId', { ...valid, type: 'case-study' }],
    ['explanation curta', { ...valid, explanation: 'curta' }],
  ])('rejeita %s', (_label, q) => {
    expect(validateQuestion(q).success).toBe(false)
  })
})
