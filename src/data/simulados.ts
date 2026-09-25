import raw from '../../data/simulados.json'
import {
  type Domain,
  SimuladoSchema,
  type SimuladoSpec,
} from '../engine/question-schema.js'

// §4 — distribuição oficial da prova (50q): ig12 · st9 · co12 · rv10 · mo7.
// Mesmas proporções já usadas no teste do selector (largest-remainder).
export const PROPORTIONS: { domain: Domain; share: number }[] = [
  { domain: 'identidade-governanca', share: 0.24 },
  { domain: 'storage', share: 0.18 },
  { domain: 'compute', share: 0.24 },
  { domain: 'rede-virtual', share: 0.2 },
  { domain: 'monitoramento', share: 0.14 },
]

// Guard §3: simulados.json inválido/vazio deve quebrar em build/teste, não em runtime.
export const SIMULADOS: SimuladoSpec[] = (() => {
  const parsed = SimuladoSchema.array().min(1).safeParse(raw)
  if (!parsed.success) {
    throw new Error(`simulados.json inválido: ${parsed.error.message}`)
  }
  return parsed.data
})()

export function getSimuladoById(id: string): SimuladoSpec | undefined {
  return SIMULADOS.find((s) => s.id === id)
}

// Simulado Dinâmico: mesmo id sempre, seed novo a cada chamada (cada clique
// gera um set diferente). Fonte única — catalog-screen e app-shell usam este.
export const DYNAMIC_ID = 'sim-dinamico'

export function buildDynamicSpec(): SimuladoSpec {
  return {
    mode: 'seed',
    id: DYNAMIC_ID,
    title: 'Simulado Dinâmico',
    seed: Date.now() % 100000,
    questionCount: 50,
    timeLimitMinutes: 100,
  }
}
