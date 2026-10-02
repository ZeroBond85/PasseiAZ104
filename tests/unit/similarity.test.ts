import { describe, expect, it } from 'vitest'
import {
  jaccard,
  normText,
  textSimilarity,
  trigrams,
} from '../../src/engine/similarity.js'

describe('similarity (dedup semântico)', () => {
  it('texto idêntico (normalizado) dá 1', () => {
    expect(textSimilarity('Blobs Excluídos!', 'blobs excluídos')).toBe(1)
  })

  it('strings curtas/vazias dão 0 sem quebrar', () => {
    expect(textSimilarity('', 'qualquer coisa aqui')).toBe(0)
    expect(jaccard(new Set(), new Set(['abc']))).toBe(0)
  })

  it('paráfrase próxima pontua acima de questão não relacionada', () => {
    const base =
      'Blobs excluídos por engano precisam ser recuperáveis por 30 dias sem restaurar backup externo. Qual proteção retém blobs apagados?'
    const parafrase =
      'Blobs apagados por engano devem ser recuperáveis por 30 dias sem restaurar backup externo. Qual proteção retém os blobs apagados?'
    const outra =
      'Máquinas virtuais em zonas de disponibilidade distintas sobrevivem à falha de datacenter com replicação síncrona entre zonas.'
    const sPar = textSimilarity(base, parafrase)
    const sOutra = textSimilarity(base, outra)
    expect(sPar).toBeGreaterThan(0.7)
    expect(sOutra).toBeLessThan(0.5)
    expect(sPar).toBeGreaterThan(sOutra)
  })

  it('normText dobra acento, caixa e espaços', () => {
    expect(normText('  Exclusão   REVERSÍVEL ')).toBe('exclusao reversivel')
  })

  it('trigrams cobre a string inteira', () => {
    const t = trigrams('abcdef')
    expect(t.has('abc')).toBe(true)
    expect(t.has('def')).toBe(true)
    expect(t.size).toBe(4)
  })
})
