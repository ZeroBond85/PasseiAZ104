export const ROUTE_TABS = [
  'home',
  'catalog',
  'treino',
  'estudo',
  'review',
  'stats',
  'progress',
  'admin',
  'quiz',
] as const

export type RouteTab = (typeof ROUTE_TABS)[number]

export function hashForRoute(route: RouteTab): string {
  return `#/${route}`
}

export function routeFromHash(
  hash: string | null | undefined,
): RouteTab | null {
  if (!hash) return null
  const route = hash.replace(/^#\/?/, '').split(/[?/]/, 1)[0]?.trim()
  return (ROUTE_TABS as readonly string[]).includes(route ?? '')
    ? (route as RouteTab)
    : null
}
