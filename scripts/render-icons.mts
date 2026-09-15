// Renderiza os PNGs de ícone a partir de public/icons/emblem.svg via Chromium
// (WYSIWYG: o mesmo motor que exibe o app). Rodar quando o emblema mudar:
//   npx tsx scripts/render-icons.mts
// Também REGENERA brand.svg (lockup com o emblema inline — SVG via <img>
// não carrega sub-recursos externos, então <image href> é proibido).
// Fonte da verdade: emblem.svg (<defs> + <rect> + <g id="mark">).
// Artefatos commitados; NÃO roda no CI.
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const ROOT = new URL('../public/icons/', import.meta.url)
const EMBLEM = readFileSync(new URL('emblem.svg', ROOT), 'utf8')

// Regenera brand.svg com o emblema inline (proibido <image href> externo)
{
  const defs = EMBLEM.match(/<defs>[\s\S]*<\/defs>/)?.[0] ?? ''
  const rect = EMBLEM.match(/<rect[^/]*\/>/)?.[0] ?? ''
  const mark = EMBLEM.match(/<g id="mark">[\s\S]*<\/g>/)?.[0] ?? ''
  if (!defs || !rect || !mark) throw new Error('emblem.svg sem defs/rect/#mark')
  writeFileSync(
    new URL('brand.svg', ROOT),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" role="img" aria-label="Passei AZ-104">\n` +
      `  ${defs}\n` +
      `  <style>\n` +
      `    .t1 { fill: #ffffff; }\n` +
      `    .t2 { fill: #4cc2ff; }\n` +
      `    @media (prefers-color-scheme: light) {\n` +
      `      .t1 { fill: #0b1b2b; }\n` +
      `      .t2 { fill: #0067b8; }\n` +
      `    }\n` +
      `  </style>\n` +
      `  <g transform="translate(8,20) scale(0.3125)">\n  ${rect}\n  ${mark}\n  </g>\n` +
      `  <text x="188" y="122" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif" font-size="60" font-weight="800" letter-spacing="0.5"><tspan class="t1">Passei </tspan><tspan class="t2">AZ-104</tspan></text>\n` +
      `</svg>\n`,
  )
}

function sized(svg: string, size: number): string {
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
}

const browser = await chromium.launch()

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

// Emblema cheio (any + apple-touch + favicon)
for (const [size, out] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
  [32, 'favicon-32.png'],
] as const) {
  await shot(sized(EMBLEM, size), 'svg', out)
}

// Maskable: fundo sólido full-bleed + emblema a 62% (safe zone)
await shot(
  `<div id="m" style="width:512px;height:512px;background:#0b3b66;display:flex;align-items:center;justify-content:center">${sized(EMBLEM, 320)}</div>`,
  '#m',
  'icon-maskable-512.png',
)

await browser.close()
console.log('render-icons: PNGs regenerados a partir de emblem.svg')
