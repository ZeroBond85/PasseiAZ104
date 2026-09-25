// Feature flags (Sprint 4, PLAN-3): mergear incompleto sem quebrar `main`.
// Override local: localStorage `az104-flags='{"study-hub":false}'.
const DEFAULTS: Record<string, boolean> = {
  'study-hub': true,
  drill: true,
  gamification: false,
}

export function isEnabled(flag: string): boolean {
  try {
    const raw = localStorage.getItem('az104-flags')
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as Record<string, unknown>)[flag] === 'boolean'
      ) {
        return (parsed as Record<string, boolean>)[flag]
      }
    }
  } catch {
    // localStorage indisponível ou JSON inválido: usa default
  }
  return DEFAULTS[flag] ?? false
}
