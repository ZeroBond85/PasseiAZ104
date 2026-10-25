import { describe, expect, it } from 'vitest'
import {
  hashForRoute,
  ROUTE_TABS,
  type RouteTab,
  routeFromHash,
} from '../../src/components/router.js'

describe('router de abas', () => {
  it('cobre exatamente as 9 abas do app', () => {
    expect([...ROUTE_TABS].sort()).toEqual(
      [
        'admin',
        'catalog',
        'estudo',
        'home',
        'progress',
        'quiz',
        'review',
        'stats',
        'treino',
      ].sort(),
    )
  })

  it.each(ROUTE_TABS)('faz round-trip de hash para %s', (route: RouteTab) => {
    expect(routeFromHash(hashForRoute(route))).toBe(route)
  })

  it.each(['', '#', '#/inexistente', '#treino-extra', null, undefined])(
    'ignora hash inválido %s',
    (hash) => {
      expect(routeFromHash(hash)).toBeNull()
    },
  )
})
