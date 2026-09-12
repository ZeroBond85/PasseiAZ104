// LeitnerEngine §5 — intervalos 1/2/4/8/16d, 5 caixas, cap de fila.
export const INTERVALS_DAYS = [1, 2, 4, 8, 16] as const
export const MAX_BOX = 4

export interface Card {
  questionId: string
  box: number
  dueAt: number // epoch ms
}

export function gradeCard(card: Card, correct: boolean, now: number): Card {
  const box = correct ? Math.min(card.box + 1, MAX_BOX) : 0
  return {
    questionId: card.questionId,
    box,
    dueAt: now + INTERVALS_DAYS[box] * 86_400_000,
  }
}

export function getDue(
  cards: Card[],
  now: number,
  limite = 50,
): { due: Card[]; truncated: boolean } {
  const due = cards
    .filter((c) => c.dueAt <= now)
    .sort((a, b) => a.box - b.box || a.dueAt - b.dueAt)
  return { due: due.slice(0, limite), truncated: due.length > limite }
}
