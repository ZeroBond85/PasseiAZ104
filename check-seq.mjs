#!/usr/bin/env node
// check-seq.mjs — valida contagem, duplicatas e sequencia de IDs por dominio.
// Uso: node check-seq.mjs <arquivo> <prefixo>  (compat)
//      node check-seq.mjs --domain <domain>    (novo: valida dominio completo)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DATA = join(process.cwd(), 'data')
const META = join(DATA, 'meta.json')

const DOMAIN_FILES = {
  'identidade-governanca': [
    'identidade-governanca.json',
    'identidade-acesso.json',
  ],
  storage: ['storage.json'],
  compute: ['compute-vms.json', 'compute-apps.json', 'compute-platform.json'],
  'rede-virtual': ['rede-virtual.json'],
  monitoramento: ['monitoramento.json'],
}

const PREFIX_BY_DOMAIN = {
  'identidade-governanca': 'ig',
  storage: 'st',
  compute: 'co',
  'rede-virtual': 'rv',
  monitoramento: 'mo',
}

function loadMeta() {
  return JSON.parse(readFileSync(META, 'utf8'))
}

function loadDomainQuestions(domain) {
  const files = DOMAIN_FILES[domain]
  if (!files) {
    console.error(`Dominio desconhecido: ${domain}`)
    console.error('Disponiveis:', Object.keys(DOMAIN_FILES).join(', '))
    process.exit(1)
  }
  const all = []
  for (const f of files) {
    const path = join(DATA, f)
    try {
      const arr = JSON.parse(readFileSync(path, 'utf8'))
      if (!Array.isArray(arr)) continue
      for (const q of arr) {
        all.push({ ...q, _sourceFile: f })
      }
    } catch {
      console.error(`Arquivo nao encontrado ou invalido: ${path}`)
      process.exit(1)
    }
  }
  return all
}

function checkFile(file, prefix) {
  const path = join(DATA, file)
  const arr = JSON.parse(readFileSync(path, 'utf8'))
  console.log(`${file}: ${arr.length}`)
  const ids = arr.map((q) => q.id)
  const seen = new Set()
  const dup = []
  for (const id of ids) {
    if (seen.has(id)) dup.push(id)
    seen.add(id)
  }
  console.log(`dup: ${dup.length} ${dup.join(',')}`)
  const nums = ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.split('-')[2]))
    .sort((a, b) => a - b)
  const gaps = []
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) gaps.push(`${nums[i - 1]}->${nums[i]}`)
  }
  console.log(
    `seq ${nums[0]}..${nums[nums.length - 1]} gaps: ${gaps.join(',') || 'nenhum'}`,
  )
}

function checkDomain(domain) {
  const prefix = PREFIX_BY_DOMAIN[domain]
  if (!prefix) {
    console.error(`Prefixo nao encontrado para: ${domain}`)
    process.exit(1)
  }
  const meta = loadMeta()
  const questions = loadDomainQuestions(domain)
  console.log(`--- ${domain} (${questions.length} questoes) ---`)
  const ids = questions.map((q) => q.id)
  const seen = new Set()
  const dup = []
  for (const id of ids) {
    if (seen.has(id)) dup.push(id)
    seen.add(id)
  }
  if (dup.length) {
    console.log(`DUPLICATAS: ${dup.length} ${dup.join(', ')}`)
  } else {
    console.log('DUPLICATAS: 0')
  }
  const nums = ids
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.split('-')[2]))
    .sort((a, b) => a - b)
  const gaps = []
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) gaps.push(`${nums[i - 1]}->${nums[i]}`)
  }
  if (gaps.length) {
    console.log(`GAPS: ${gaps.join(', ')}`)
  } else {
    console.log('GAPS: nenhum')
  }
  const metaCount = meta.countsByDomain?.[domain] ?? 0
  console.log(`CONTAGEM meta.json: ${metaCount}`)
  console.log(`CONTAGEM real: ${questions.length}`)
  if (metaCount !== questions.length) {
    console.log(`DRIFT: meta.json ${metaCount} vs real ${questions.length}`)
    process.exit(1)
  }
}

function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--domain') {
    if (!args[1]) {
      console.error('Uso: node check-seq.mjs --domain <domain>')
      process.exit(1)
    }
    checkDomain(args[1])
  } else if (args.length === 2) {
    checkFile(args[0], args[1])
  } else {
    console.error(
      'Uso: node check-seq.mjs <arquivo> <prefixo> | --domain <domain>',
    )
    process.exit(1)
  }
}

main()
