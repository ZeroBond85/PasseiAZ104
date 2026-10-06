import type { Question } from './question-schema.js'

// Modelo de pontuação fiel à prova AZ-104 (Gates 1.2 e 1.3).
//
//  - 1 ponto por item, SEM peso por dificuldade. Pearson, exam FAQ:
//    "Each item on the certification examination is worth one point unless
//     noted... Are item scores weighted? No."
//  - múltipla escolha é tudo-ou-nada: sem alternativa errada e com o conjunto
//    exato de gabaritos. Microsoft Learn: "you must select all of the correct
//    options without selecting any incorrect options. Note that this is
//    different from how these question types are scored on Microsoft
//    Certification exams."
//
// A versão anterior dava crédito parcial (w × k/n) e pesava difficulty
// (easy 15 / medium 20 / hard 25). Medido no sim-oficial-01: quem marcava
// "1 de 2" em cada múltipla fechava 868/1000 em vez de 760 — +108 pontos de
// graça, e o peso por dificuldade ainda inflava byDomain.pct, que é o corte
// de prontidão (nenhum domínio <70%).
export const SCORING_MODEL_VERSION = 2

export interface ScoreResult {
  raw: number
  maxRaw: number
  score: number // 0..1000
  passed: boolean
  byDomain: Record<string, { raw: number; max: number; pct: number }>
  weakAreas: string[] // domínios <70%
}

// Conjunto exato: mesmo tamanho e todo gabarito marcado. Sem resposta = 0.
// Fonte única de verdade — o StudyGuide consumia o mesmo conceito numa cópia
// própria, o que permitia a mesma sessão render duas notas diferentes.
export function isAnswerCorrect(
  q: Question,
  given: string[] | undefined,
): boolean {
  const g = new Set(given ?? [])
  if (g.size === 0) return false
  const e = new Set(q.correct)
  if (g.size !== e.size) return false
  return [...e].every((l) => g.has(l))
}

export function scoreSession(
  questions: Question[],
  answers: Map<string, string[]>,
): ScoreResult {
  let raw = 0
  let maxRaw = 0
  const byDomain: Record<string, { raw: number; max: number; pct: number }> = {}

  for (const q of questions) {
    maxRaw += 1
    let d = byDomain[q.domain]
    if (!d) {
      d = { raw: 0, max: 0, pct: 0 }
      byDomain[q.domain] = d
    }
    d.max += 1
    if (!isAnswerCorrect(q, answers.get(q.id))) continue
    raw += 1
    d.raw += 1
  }

  const score = maxRaw === 0 ? 0 : Math.round((raw / maxRaw) * 1000)
  const weakAreas: string[] = []
  for (const [domain, d] of Object.entries(byDomain)) {
    d.pct = d.max === 0 ? 0 : Math.round((d.raw / d.max) * 100)
    if (d.pct < 70) weakAreas.push(domain)
  }
  return { raw, maxRaw, score, passed: score >= 700, byDomain, weakAreas }
}
