/**
 * json-append.mjs — Insere em um array JSON sem reserializar o arquivo inteiro.
 *
 * Por que nao `JSON.parse` + `JSON.stringify(arr, null, 2)`: os bancos em
 * data/ tem um formato especifico do Biome (indent 2, arrays de primitivos em
 * uma linha, escapes \uXXXX para acentos). Reserializar reescreve as ~836
 * perguntas ja existentes e o diff vira ilegivel — 15 mil linhas em vez de 164
 * perguntas. Aqui a insercao e textual: le o arquivo, acha o `]` final e
 * escreve os objetos novos antes dele, no mesmo estilo.
 *
 *   appendJson(file, objetos) -> { added, bytesAntes, bytesDepois }
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs'

/** Escapa tudo fora do ASCII imprimivel como \uXXXX, que e como o banco esta. */
function asciiEscape(s) {
  return s.replace(
    /[^ -~]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
}

/**
 * Serialize no estilo do Biome: indent 2, e arrays cujos elementos sao todos
 * primitivos ficam numa linha unica (e o que o banco usa em "correct"/"tags").
 */
function encodeValue(value, indent) {
  const pad = ' '.repeat(indent)
  const padIn = ' '.repeat(indent + 2)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const soPrimitivos = value.every(
      (v) =>
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean',
    )
    if (soPrimitivos) {
      return `[${value.map((v) => asciiEscape(JSON.stringify(v))).join(', ')}]`
    }
    const itens = value.map((v) => `${padIn}${encodeValue(v, indent + 2)}`)
    return `[\n${itens.join(',\n')}\n${pad}]`
  }

  if (value && typeof value === 'object') {
    const chaves = Object.keys(value).filter((k) => value[k] !== undefined)
    if (chaves.length === 0) return '{}'
    const itens = chaves.map(
      (k) =>
        `${padIn}${JSON.stringify(k)}: ${encodeValue(value[k], indent + 2)}`,
    )
    return `{\n${itens.join(',\n')}\n${pad}}`
  }

  if (value === null) return 'null'
  return asciiEscape(JSON.stringify(value))
}

/**
 * Serialize um objeto do array no nivel de topo. As chaves ficam em 4 espacos
 * e a chave de abertura `{` em 2, que e como o banco existente esta.
 */
export function encodeItem(obj) {
  // encodeValue(obj, 2) poe as chaves em 4 espacos e o `}` de fecho em 2; o
  // prefixo alinha o `{` de abertura. Prefixar so a primeira linha: aplicar o
  // indent em todas empurra o corpo 2 espacos para fora do alinhamento.
  return `  ${encodeValue(obj, 2)}`
}

/**
 * Acrescenta `objetos` ao array JSON em `file`, preservando byte a byte o que
 * ja estava la. Aborta se o arquivo nao for um array de objetos.
 */
export function appendJson(file, objetos) {
  if (objetos.length === 0) return { added: 0, bytesAntes: 0, bytesDepois: 0 }

  const antes = readFileSync(file, 'utf8')
  const bytesAntes = statSync(file).size

  const abre = antes.indexOf('[')
  if (abre !== 0) throw new Error(`${file}: nao comeca com '['`)
  const fecha = antes.lastIndexOf(']')
  if (fecha <= abre) throw new Error(`${file}: ']' final nao encontrado`)

  // o conteudo entre o '[' e o ']' final tem que ser so whitespace quando
  // vazio, ou objetos separados por virgula. Rejeitar qualquer outra coisa
  // evita emitir um arquivo invalido e so descobrir no validate.
  const corpo = antes.slice(abre + 1, fecha)
  const temConteudo = corpo.trim().length > 0
  if (temConteudo) {
    try {
      JSON.parse(antes)
    } catch (e) {
      throw new Error(`${file}: JSON invalido antes de inserir (${e.message})`)
    }
  }

  // encodeItem ja emite no indent 2 do array de topo: as chaves ficam em 4
  // espacos. Nao somar indent aqui, senao tudo ganha 2 espacos a mais que o
  // resto do arquivo e o Biome reclamaria.
  const bloco = objetos.map(encodeItem).join(',\n')

  const sep = temConteudo ? ',\n' : '\n'
  // `corpo` ja pode terminar com whitespace (normalmente um \n antes do ']')
  const semNl = corpo.replace(/\s+$/, '')
  const depois = `${antes.slice(0, abre + 1)}${semNl}${sep}${bloco}\n${antes.slice(fecha)}`

  // nunca emitir algo que o JSON.parse nao aceite
  JSON.parse(depois)

  writeFileSync(file, depois, 'utf8')
  return { added: objetos.length, bytesAntes, bytesDepois: statSync(file).size }
}

/**
 * Substitui um objeto do array JSON, localizado pelo campo `id`, sem tocar no
 * resto do arquivo. Faz parse antes e depois: se a substituicao produzir JSON
 * invalido, nada e gravado.
 */
export function replaceItem(file, id, novo, campo = 'id') {
  const antes = readFileSync(file, 'utf8')
  const arr = JSON.parse(antes)

  const marcados = arr.filter((o) => o && o[campo] === id)
  if (marcados.length === 0)
    throw new Error(`${file}: nenhum item com ${campo}=${id}`)
  if (marcados.length > 1)
    throw new Error(`${file}: ${campo}=${id} aparece ${marcados.length}x`)

  const alvo = `"${campo}": "${id}"`
  const posAlvo = antes.indexOf(alvo)
  if (posAlvo === -1)
    throw new Error(`${file}: ${alvo} nao encontrado no texto`)

  // recorta do `{` que abre o objeto ate o `}` que fecha no mesmo nivel,
  // pulando strings para nao contar chaves que fazem parte do conteudo
  const abre = antes.lastIndexOf('{', posAlvo)
  let depth = 0
  let fecha = -1
  for (let k = abre; k < antes.length; k++) {
    const ch = antes[k]
    if (ch === '"') {
      k++
      while (k < antes.length && antes[k] !== '"') {
        if (antes[k] === '\\') k++
        k++
      }
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        fecha = k
        break
      }
    }
  }
  if (fecha === -1)
    throw new Error(`${file}: nao encontrei o fim do item ${id}`)

  // encodeItem prefixa 2 espacos no `{`; aqui o `{` ja existe no lugar
  const bloco = encodeItem(novo).slice(2)
  const depois = antes.slice(0, abre) + bloco + antes.slice(fecha + 1)
  JSON.parse(depois)

  writeFileSync(file, depois, 'utf8')
  return { bytesAntes: antes.length, bytesDepois: depois.length }
}
