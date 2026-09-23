// A3: teclado do simulado — alterna múltipla escolha e aceita letras A–D.
// Dado verificado: nenhuma questão tem >4 options (maxOptions=4 no banco).
export function toggleSelection(
  current: readonly string[],
  letter: string,
  isMultiple: boolean,
): string[] {
  const want = letter.toUpperCase()
  if (!isMultiple) return [want]
  const asUpper = current.map((l) => l.toUpperCase())
  return asUpper.includes(want)
    ? current.filter((l) => l.toUpperCase() !== want)
    : [...current, want]
}
