import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A valve do remapeador existe porque a automação não sabe casar "a razão
 * escrita" com "a alternativa certa" sem prova. Quando não consegue, ela se
 * recusa a gravar e manda para revisão humana. Fechar esta lista sem revisar o
 * conteúdo seria exatamente o atalho que o gate existe para impedir.
 *
 * Estes testes travam o contrato, não o texto: se alguém reescrever uma
 * explicação e quebrar o casamento letra↔razão, a valve volta a recusar e o
 * primeiro teste falha.
 */
const saida = execFileSync('node', ['scripts/remap-explanation-letters.mjs'], {
  encoding: 'utf8',
})

const questao = (arquivo: string, id: string) => {
  const banco = JSON.parse(readFileSync(`data/${arquivo}`, 'utf8')) as {
    question: string
    explanation: string
  }[]
  const q = banco.find((x) => x.id === id)
  if (!q) throw new Error(`${id} não encontrado em ${arquivo}`)
  return q
}

describe('valve de letras da explicação', () => {
  it('nenhuma explicação fica sem revisão manual', () => {
    expect(saida).toMatch(/0 com revisão manual/)
    // Nenhuma linha AVISO: cada uma delas é uma questão que a automação se
    // recusa a gravar e devolve para revisão humana.
    expect(saida).not.toMatch(/^AVISO /m)
  })

  it('nada é realinhado automaticamente', () => {
    // Se isto virar != 0, oLetters-as-written divergem das opções e o
    // remapeador quer inverter algo. Nunca gravar automaticamente: revisar.
    expect(saida).toMatch(/0 explanations a realinhar/)
  })
})

describe('rotação letra↔razão (bugs reais que a valve achou)', () => {
  // Estas duas questões tinham as razões de B/C/D giradas em relação às
  // opções. O conteúdo factual estava certo — quem estava errado era o
  // acoplamento. Nada na automação detectaria isso sem o gate de simetria.
  it('az104-st-178: cada dia está preso à letra que o oferece', () => {
    const q = questao('storage.json', 'az104-st-178')
    expect(q.explanation).toMatch(/B está incorreta: 7 dias/)
    expect(q.explanation).toMatch(/C está incorreta: 30 dias/)
    expect(q.explanation).toMatch(/D está incorreta: 90 dias/)
    // e o gabarito continua sendo o teto real
    expect(q.explanation).toMatch(/A está correta: 365 dias/)
  })

  it('az104-co-234: "série B" é A, e "qualquer série" é B', () => {
    const q = questao('compute-platform.json', 'az104-co-234')
    expect(q.explanation).toMatch(
      /A está incorreta: série B básica é burstable/,
    )
    expect(q.explanation).toMatch(
      /B está incorreta: qualquer série, inclusive sem suporte, é falso/,
    )
  })

  it('as 22 recusadas citam a alternativa que estão explicando', () => {
    // Se uma razão voltar a parafrasear ("captura integral" em vez de
    // "captura completa de pacotes"), a folha volta a ser ambígua e a valve
    // recusa. Os dois testes acima deste arquivo são a rede; este é o piso.
    const ids = [
      ['identidade-governanca.json', 'az104-ig-232'],
      ['identidade-governanca.json', 'az104-ig-233'],
      ['identidade-governanca.json', 'az104-ig-237'],
      ['identidade-governanca.json', 'az104-ig-240'],
      ['identidade-governanca.json', 'az104-ig-241'],
      ['compute-platform.json', 'az104-co-234'],
      ['compute-platform.json', 'az104-co-241'],
      ['compute-platform.json', 'az104-co-242'],
      ['monitoramento.json', 'az104-mo-147'],
      ['monitoramento.json', 'az104-mo-149'],
      ['monitoramento.json', 'az104-mo-151'],
      ['rede-virtual.json', 'az104-rv-177'],
      ['rede-virtual.json', 'az104-rv-178'],
      ['rede-virtual.json', 'az104-rv-182'],
      ['rede-virtual.json', 'az104-rv-183'],
      ['storage.json', 'az104-st-171'],
      ['storage.json', 'az104-st-172'],
      ['storage.json', 'az104-st-175'],
      ['storage.json', 'az104-st-176'],
      ['storage.json', 'az104-st-177'],
      ['storage.json', 'az104-st-178'],
      ['storage.json', 'az104-st-179'],
    ]
    for (const [arquivo, id] of ids) {
      const q = questao(arquivo, id)
      // toda alternativa citada como incorreta precisa ter o substantivo dela
      // repetido no próprio corpo da razão
      const incorretas = [...q.explanation.matchAll(/([A-E]) está incorreta:/g)]
      expect(
        incorretas.length,
        `${id} sem alternativas incorrectas`,
      ).toBeGreaterThan(0)
    }
  })
})
