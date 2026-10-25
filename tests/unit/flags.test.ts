import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isEnabled } from '../../src/config/flags.js'

const mockLocalStorage = new Map<string, string>()

beforeEach(() => {
  mockLocalStorage.clear()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => mockLocalStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage.set(key, value)
      },
      removeItem: (key: string) => {
        mockLocalStorage.delete(key)
      },
      clear: () => {
        mockLocalStorage.clear()
      },
    },
    writable: true,
  })
})

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: undefined,
    writable: true,
  })
})

describe('isEnabled', () => {
  it('returns default true for study-hub without override', () => {
    expect(isEnabled('study-hub')).toBe(true)
  })

  it('returns default false for gamification', () => {
    expect(isEnabled('gamification')).toBe(false)
  })

  it('honors localStorage override', () => {
    ;(globalThis.localStorage as Storage).setItem(
      'az104-flags',
      JSON.stringify({ 'study-hub': false }),
    )
    expect(isEnabled('study-hub')).toBe(false)
  })

  it('ignores invalid JSON and uses default', () => {
    ;(globalThis.localStorage as Storage).setItem('az104-flags', '{not json')
    expect(isEnabled('study-hub')).toBe(true)
  })

  it('returns false for unknown flag', () => {
    expect(isEnabled('nao-existe')).toBe(false)
  })
})
