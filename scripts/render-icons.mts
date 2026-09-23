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
// NÃO usado no app — mantido como referência (legado).
await shot(
  `<div id="w" style="width:1024px;height:650px;display:flex;align-items:center;justify-content:center;background:#0a0e14">${logo(1024)}</div>`,
  '#w',
  'hero-wide.png',
)

// Logo de exibição (login/home): WebP recortado nas margens transparentes
// (a arte ocupa ~1/3 do quadro — crop deixa o logo ~3x maior na mesma largura)
// + fundo transparente preservado. PNG de 387KB seria ~2x o peso do hero-wide
// antigo (guard: perf/lh total 900KB).
async function shotWebp(out: string) {
  const page = await browser.newPage()
  await page.setContent(
    `<img id="l" src="${DATA}" style="width:1px;height:auto">`,
  )
  await page.locator('#l').waitFor()
  const dataUrl = await page.evaluate(async () => {
    const img = document.getElementById('l') as HTMLImageElement
    const src = document.createElement('canvas')
    src.width = img.naturalWidth
    src.height = img.naturalHeight
    const sx = src.getContext('2d')
    if (!sx) return ''
    sx.drawImage(img, 0, 0)
    // bbox dos pixels visíveis (alpha > 10) + respiro de 24px
    const d = sx.getImageData(0, 0, src.width, src.height).data
    let minX = src.width,
      minY = src.height,
      maxX = 0,
      maxY = 0
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        if (d[(y * src.width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    const pad = 24
    minX = Math.max(0, minX - pad)
    minY = Math.max(0, minY - pad)
    maxX = Math.min(src.width - 1, maxX + pad)
    maxY = Math.min(src.height - 1, maxY + pad)
    const w = maxX - minX + 1,
      h = maxY - minY + 1
    const dst = document.createElement('canvas')
    dst.width = w
    dst.height = h
    const dx = dst.getContext('2d')
    if (!dx) return ''
    dx.drawImage(src, minX, minY, w, h, 0, 0, w, h)
    return dst.toDataURL('image/webp', 0.9)
  })
  writeFileSync(
    new URL(out, ROOT),
    Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'),
  )
  await page.close()
}
await shotWebp('source-logo.webp')

await browser.close()
console.log(
  'render-icons: PNGs regenerados a partir de source.png (letterbox #0a0e14)',
)
