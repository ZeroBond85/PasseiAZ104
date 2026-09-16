// Renderiza os PNGs de ícone a partir de public/icons/source.png (logo original
// do dono) via Chromium — WYSIWYG: o mesmo motor que exibe o app.
// Rodar quando o logo mudar (somente depois de substituir source.png):
//   npx tsx scripts/render-icons.mts
// Fonte da verdade: source.png (1426×905, wide). NUNCA redesenhar; só derivar.
// Quadrados e square PWA usam letterbox #0a0e14 preservando proporção.
// Artefatos commitados; NÃO roda no CI.
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const ROOT = new URL('../public/icons/', import.meta.url)
const SRC = new URL('source.png', ROOT)
const SRC_B64 = readFileSync(SRC).toString('base64')
const DATA = `data:image/png;base64,${SRC_B64}`

const browser = await chromium.launch()

// Captura um <div> com o logo contido (letterbox #0a0e14) nas dimensões exatas.
async function shot(html: string, selector: string, out: string) {
  const page = await browser.newPage()
  await page.setContent(
    `<body style="margin:0;background:transparent">${html}</body>`,
  )
  const el = page.locator(selector)
  await el.waitFor()
  writeFileSync(
    new URL(out, ROOT),
    await el.screenshot({ omitBackground: true }),
  )
  await page.close()
}

const logo = (max: number) =>
  `<img src="${DATA}" alt="" style="max-width:${max}px;max-height:${max}px;width:auto;height:auto;">`

// Ícones quadrados PWA/favicon/apple com letterbox #0a0e14 (contém).
for (const [size, out] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
  [32, 'favicon-32.png'],
] as const) {
  await shot(
    `<div id="s" style="width:${size}px;height:${size}px;background:#0a0e14;display:flex;align-items:center;justify-content:center">${logo(size)}</div>`,
    '#s',
    out,
  )
}

// Maskable: fundo sólido full-bleed + arte ≤62% (safe zone).
await shot(
  `<div id="m" style="width:512px;height:512px;background:#0a0e14;display:flex;align-items:center;justify-content:center">${logo(317)}</div>`,
  '#m',
  'icon-maskable-512.png',
)

// Header wide: logo contido em caixa wide (letterbox vertical, mantém proporção).
await shot(
  `<div id="h" style="width:176px;height:112px;background:#0a0e14;display:flex;align-items:center;justify-content:center">${logo(176)}</div>`,
  '#h',
  'header-112.png',
)

// Hero/login wide: logo em alta resolução (aspect real) para exibição grande.
await shot(
  `<div id="w" style="width:1024px;height:650px;display:flex;align-items:center;justify-content:center;background:#0a0e14">${logo(1024)}</div>`,
  '#w',
  'hero-wide.png',
)

await browser.close()
console.log(
  'render-icons: PNGs regenerados a partir de source.png (letterbox #0a0e14)',
)
