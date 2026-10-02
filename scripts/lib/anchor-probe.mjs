// Camada compartilhada dos dois verificadores de âncora.
//
// Motivo da extração: `verify-grounding-urls.mjs` (vivacidade) e
// `audit-anchor-semantics.mjs` (semântica) precisavam das mesmas cinco coisas —
// normalizar texto, extrair título/H1, seguir redirect, detectar fallback
// EN-US e cachear. Cada um tinha a sua cópia, e foi exatamente essa duplicação
// que deixou o `verify` com uma lista `CANDIDATES` paralela que divergiu do
// mapa e passaria a sobrescrever as âncoras corrigidas se alguém usasse
// `--write`. Uma fonte só.
//
// Divisão entre o que é puro e o que faz I/O: `norm`, `stripHtml`,
// `extractMeta`, `extractH1`, `classifyPage` e `termCoverage` são funções
// puras, sem rede, e é nelas que `tests/unit/anchor-checks.test.ts` fixa o
// comportamento com fixtures de HTML. `fetchPage` é a única parte que fala com
// a rede.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// `new URL(...).pathname` descarta o host em caminho UNC e vira
// `\\wsl$\Debian\Debian\home\...`, quebrando todo mkdir/leitura por cache.
// `fileURLToPath` preserva o UNC. A barra final é necessária: `ROOT` é
// concatenado como `${ROOT}data/...` e `${ROOT}.agent/...`.
export const ROOT = `${fileURLToPath(new URL('../..', import.meta.url))}/`
const CACHE = `${ROOT}.agent/cache`
const UA = 'PasseiAZ104-grounding-check/1.0'
const CACHE_TTL = 7 * 24 * 3600 * 1000

export const LEARN_PTBR = 'https://learn.microsoft.com/pt-br/'

/* ------------------------------------------------------------------ texto */

/** minúsculas, sem acento, só alfanumérico — para comparar texto PT-BR. */
export const norm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')

export const extractMeta = (html, name) => {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)`,
    'i',
  )
  return html.match(re)?.[1]?.trim() || ''
}

export const extractH1 = (html) =>
  (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
    .replace(/<[^>]+>/g, '')
    .trim()

export const extractTitle = (html) =>
  extractMeta(html, 'title') ||
  (html.match(/<title>([^<]*)<\/title>/i)?.[1] || '').trim()

/* ------------------------------------------------------------------ checks */

// Um termo que aparece em qualquer página não prova nada sobre o assunto.
const STOP = new Set(
  (
    'de da do das dos que para por uma com como mais mas seu sua este esta isso aquilo ao aos ' +
    'sobre entre usando criar configurar gerenciar definir listar verifique ao usar'
  ).split(' '),
)

// Verbo de ação do rótulo do bullet: é genérico e não nomeia o recurso.
const GENERIC_VERB =
  /^(criar|configurar|gerenciar|definir|implementar|monitorar|executar|identificar|analisar|administrar|planejar|validar|inspecionar|auditar|proteger|aplicar|alterar|atualizar|adicionar|remover|excluir|modificar|atribuir|interpretar|importar|exportar|implantar)$/

// Termos do rótulo do bullet, já reduzidos a radical de 6 letras para casar
// singular/plural e flexões do PT-BR ("usuários"↔"usuário", "redes"↔"rede").
// Sem o radical o relatório acusava âncora boa e virava ruído — ver LESSONS 30.
export const terms = (s) =>
  norm(s)
    .split(' ')
    .filter((t) => t.length > 3 && !STOP.has(t))
    .map((t) => t.slice(0, 6))

export const keyTerms = (label) =>
  terms(label).filter((t) => !GENERIC_VERB.test(norm(t)))

/** O redirect caiu para a versão em inglês? */
export const fellBackToEnglish = (finalUrl) =>
  /learn\.microsoft\.com\/en-us/i.test(String(finalUrl || ''))

/** A URL está no host e locale do Learn PT-BR? */
export const isPtBrLearn = (url) => String(url || '').startsWith(LEARN_PTBR)

/**
 * Soft-404: o Learn às vezes responde **200** com uma página de "não encontrei".
 * Status 200 sozinho não prova que a âncora existe — é o que deixa um link morto
 * passar como vivo, que é o pior resultado possível aqui porque o aluno estuda
 * por ele e não percebe.
 *
 * Os marcadores são âncora no início do título porque existe documentação real
 * sobre o número 404 (páginas de erro 404 personalizadas no App Gateway e no
 * Load Balancer): casar "404" em qualquer lugar reprovaria âncora boa.
 */
const SOFT_404_TITLE = [
  /^\s*404\b/, // "404 - Page not found"
  /page not found/i,
  /página não encontrada/i,
  /pagina nao encontrada/i,
  /content not found/i,
  /we couldn'?t find/i,
  /não foi possível encontrar/i,
  /não encontramos essa página/i,
]

const SOFT_404_BODY = [
  /we couldn'?t find that page/i,
  /não foi possível encontrar essa página/i,
  /the content you requested doesn't exist/i,
]

export const isSoft404 = ({ title = '', h1 = '', text = '' } = {}) => {
  const head = `${title} ${h1}`
  return (
    SOFT_404_TITLE.some((re) => re.test(head)) ||
    SOFT_404_BODY.some((re) => re.test(text))
  )
}

/**
 * Classifica uma página já buscada, sem fazer rede. Separado do `fetchPage`
 * para poder ser testado com HTML de fixture.
 *
 * @returns {{ok: boolean, reasons: string[]}}
 */
export function classifyPage({
  url,
  finalUrl,
  status,
  title = '',
  h1 = '',
  text = '',
}) {
  const reasons = []
  if (!isPtBrLearn(url)) reasons.push(`fora do Learn PT-BR: ${url}`)
  if (status !== 200) reasons.push(`status ${status}`)
  if (fellBackToEnglish(finalUrl ?? url))
    reasons.push(`caiu em EN-US: ${finalUrl}`)
  if (status === 200 && isSoft404({ title, h1, text }))
    reasons.push(`soft-404: ${title || h1}`)
  return { ok: reasons.length === 0, reasons }
}

/**
 * Cobertura do vocabulário do bullet na página, em três camadas.
 *
 * `title` = título + H1. É o único nível que reprova. A descrição fica de fora
 * **de propósito**: a página de redundância do Armazenamento tem na descrição
 * "os dados sejam replicados com LRS ou GRS" e casaria com o bullet de
 * replicação de objeto, que é exatamente o bug do `st-accounts#3`. Descrição é
 * texto de venda e pode citar qualquer palavra; título nomeia o assunto.
 *
 * O corpo fica separado porque mede outra coisa (a página discorre sobre o tema
 * em algum momento) e serve de contexto para distinguir erro de paráfrase.
 */
export function termCoverage(label, page) {
  const kt = keyTerms(label)
  const titleSet = new Set(terms(`${page.title} ${page.h1}`))
  const descSet = new Set(terms(page.desc))
  const bodySet = new Set(terms(page.text))
  const inTitle = kt.filter((t) => titleSet.has(t))
  const inDesc = kt.filter((t) => descSet.has(t))
  const inBody = kt.filter((t) => bodySet.has(t))
  const ratio = (n) => (kt.length ? n / kt.length : 1)
  return {
    kt,
    inTitle,
    inDesc,
    inBody,
    titleCov: ratio(inTitle.length),
    descCov: ratio(inDesc.length),
    bodyCov: ratio(inBody.length),
  }
}

/* ------------------------------------------------------------------- mapa */

/** Todos os pares (bulletId, url, papel) do grounding-map. */
export function mapUrls() {
  const map = JSON.parse(readFileSync(`${ROOT}data/grounding-map.json`, 'utf8'))
  const out = []
  for (const [bullet, entry] of Object.entries(map.bullets || {})) {
    if (entry.url)
      out.push({ bullet, url: entry.url, role: 'primary', label: entry.label })
    for (const u of entry.extraUrls || []) {
      out.push({ bullet, url: u, role: 'extra', label: entry.label })
    }
  }
  return { map, urls: out }
}

/* -------------------------------------------------------------------- rede */

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const cachePath = (url) =>
  `${CACHE}/anchor-${createHash('sha1').update(url).digest('hex')}.json`

/**
 * Busca a página com retry, timeout e cache em disco. Único ponto do módulo
 * que faz I/O de rede.
 */
export async function fetchPage(url, { ttl = CACHE_TTL } = {}) {
  const path = cachePath(url)
  if (existsSync(path)) {
    try {
      const c = JSON.parse(readFileSync(path, 'utf8'))
      if (Date.now() - c.at < ttl) return { ...c, cached: true }
    } catch {
      /* cache corrompido: refaz */
    }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 25000)
      const res = await fetch(url, {
        headers: { 'user-agent': UA },
        redirect: 'follow',
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      const html = res.status === 200 ? await res.text() : ''
      const out = {
        at: Date.now(),
        status: res.status,
        finalUrl: res.url,
        url,
        title: extractTitle(html),
        h1: extractH1(html),
        desc: extractMeta(html, 'description'),
        text: res.status === 200 ? norm(stripHtml(html)).slice(0, 60000) : '',
      }
      mkdirSync(CACHE, { recursive: true })
      writeFileSync(path, JSON.stringify(out))
      return out
    } catch (err) {
      if (attempt === 1) {
        return {
          at: Date.now(),
          status: 0,
          url,
          finalUrl: url,
          title: '',
          h1: '',
          desc: '',
          text: '',
          error: String(err).slice(0, 90),
        }
      }
      await wait(500)
    }
  }
}
