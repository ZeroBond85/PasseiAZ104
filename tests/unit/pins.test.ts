import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Pins travados do PLAN §1 — divergência quebra o build de propósito.
const PINS: Record<string, string> = {
  vite: '8.2.2',
  typescript: '6.0.3',
  lit: '3.3.3',
  idb: '8.0.3',
  '@biomejs/biome': '2.5.12',
  'vite-plugin-pwa': '1.3.0',
  '@google/genai': '2.21.0',
  husky: '9.1.7',
  'lint-staged': '17.5.0',
}

describe('pins §1', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const all = { ...pkg.dependencies, ...pkg.devDependencies }
  for (const [name, version] of Object.entries(PINS)) {
    it(name, () => {
      expect(all[name]).toBe(version)
    })
  }
})
