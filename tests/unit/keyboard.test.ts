import { describe, expect, it } from 'vitest'
import { toggleSelection } from '../../src/engine/keyboard.js'

describe('toggleSelection (teclado, A3)', () => {
  it('multiple: alterna a letra', () => {
    expect(toggleSelection(['A'], 'B', true)).toEqual(['A', 'B'])
    expect(toggleSelection(['A', 'B'], 'A', true)).toEqual(['B'])
    expect(toggleSelection([], 'C', true)).toEqual(['C'])
  })

  it('single: substitui a seleção', () => {
    expect(toggleSelection(['A'], 'B', false)).toEqual(['B'])
    expect(toggleSelection([], 'A', false)).toEqual(['A'])
  })

  it("case-insensitive: 'a' e 'A' sao a mesma letra", () => {
    expect(toggleSelection(['A'], 'a', false)).toEqual(['A'])
    expect(toggleSelection(['a'], 'A', true)).toEqual([])
  })
})
