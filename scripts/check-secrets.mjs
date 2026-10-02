#!/usr/bin/env node
/**
 * check-secrets.mjs — gate de credenciais. Roda no pre-push e no CI.
 *
 * Por que existe separado do gitleaks: o gitleaks olha o HISTÓRICO do git e
 * roda no CI, ou seja, depois do push. O que falta era barrar ANTES. Além
 * disso o gitleaks depende de action externa e tem allowlist, então "não
 * disparou" pode ser config e não ausência de segredo.
 *
 * Três classes, na ordem de importância:
 *
 *  1. ARQUIVO INTEIRO — .env, .env.local, *.pem, id_rsa, .npmrc com token.
 *     O pre-commit antigo só pegava o nome EXATO `.env`; `.env.local` passava.
 *     O .gitignore era a única defesa, e defesa única não é defesa.
 *
 *  2. CONTEÚDO — padrões de chave real (Supabase service_role, Google API key,
 *     GitHub token, chave privada PEM, connection string com senha).
 *
 *  3. HISTÓRICO — todo o histórico passa pelo gitleaks; aqui só avisamos.
 *
 * Não verifica `VITE_*`: essas vão no bundle por definição (o app precisa
 * delas no cliente) e a anon key é pública por projeto. Proibi-las aqui seria
 * um gate que só pode ser burlado com --no-verify.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = process.cwd()

// ── 1. caminhos que nunca podem existir versionados ─────────────────────────
const ARQUIVOS_PROIBIDOS = [
  { re: /^\.env(\..*)?$/, porQue: 'variável de ambiente' },
  { re: /(^|\/)\.env\./, porQue: 'variável de ambiente' },
  { re: /\.pem$/, porQue: 'chave privada/certificado' },
  { re: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/, porQue: 'chave privada SSH' },
  { re: /(^|\/)credentials$/, porQue: 'credencial de cloud' },
  { re: /(^|\/)\.pypirc$/, porQue: 'pode conter senha de registry' },
  { re: /\.(sqlite|db)$/, porQue: 'banco local' },
]

// ── 2. padrões de segredo no conteúdo ────────────────────────────────────────
// Cada um precisa de um segredo "de verdade" ao lado, para não disparar em
// menção a docs. `exige` = o que torna o match perigoso em vez de didático.
const PADROES = [
  {
    nome: 'Supabase service_role',
    re: /service_role["'\s:=]+[A-Za-z0-9._-]{40,}/gi,
    exige: /eyJ[A-Za-z0-9_-]{10,}/,
    nota: 'a service_role IGNORA a RLS — com ela qualquer um lê/escreve tudo',
  },
  {
    nome: 'Supabase anon/service key JWT solta',
    re: /eyJhbGciOi[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    exige: /supabase|eyJ[a-z0-9_-]{20,}/i,
    nota: 'JWT de anon/service sem variável de ambiente em volta',
  },
  {
    nome: 'Google/Gemini API key',
    re: /AIza[A-Za-z0-9_-]{30,}/g,
    exige: null,
    nota: 'formato único; menção em doc não produz 35 chars assim',
  },
  {
    nome: 'OpenAI key',
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}/g,
    exige: null,
    nota: null,
  },
  {
    nome: 'GitHub token',
    re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{30,}/g,
    exige: null,
    nota: null,
  },
  {
    nome: 'npm _authToken',
    re: /_auth(?:Token)?\s*[=:]\s*\S{12,}/gi,
    exige: null,
    nota: 'o .npmrc em si é versionado de propósito (save-exact=true); só o token não pode',
  },
  {
    nome: 'Chave privada PEM',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    exige: null,
    nota: null,
  },
  {
    nome: 'Connection string com senha',
    re: /postgres(?:ql)?:\/\/[^:@\s"']{1,64}:[^:@\s"']{3,}@[^\s"']+/gi,
    exige: null,
    nota: 'tem senha embutida — use secrets no workflow (GitHub Actions)',
  },
]

// ── o que nunca é segredo ────────────────────────────────────────────────────
const IGNORAR_CONTEUDO = [
  /(^|\/)(node_modules|dist|build|coverage|\.git|\.agent|\.opencode|vendor)(\/|$)/,
  /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|eot|zip|gz|pdf|mp4|webm)$/i,
  /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /(?:^|\/)LE(?:SSONS|ADME|CONTRIBUTING)\.md$/i,
]

function textoVarrido(p) {
  try {
    if (statSync(p).size > 1_500_000) return null // binário/gerado
    const b = readFileSync(p)
    if (b.includes(0)) return null // binário
    return b.toString('utf8')
  } catch {
    return null
  }
}

function listaVersionavel() {
  try {
    return execFileSync('git', ['ls-files', '-z'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
      .split('\0')
      .filter(Boolean)
  } catch {
    // sem git (ou erro): cai para varrer a árvore, pulando ignorados
    const out = []
    const pular = new Set([
      'node_modules',
      'dist',
      'build',
      '.git',
      '.agent',
      '.opencode',
      'coverage',
    ])
    const anda = (d) => {
      for (const e of readdirSync(d)) {
        if (pular.has(e)) continue
        const f = join(d, e)
        try {
          if (statSync(f).isDirectory()) anda(f)
          else out.push(relative(RAIZ, f).replace(/\\/g, '/'))
        } catch {}
      }
    }
    try {
      anda(RAIZ)
    } catch {}
    return out
  }
}

const arquivos = listaVersionavel()
const achados = []

// 1. arquivo proibido
for (const rel of arquivos) {
  for (const regra of ARQUIVOS_PROIBIDOS) {
    if (regra.re.test(rel)) {
      achados.push({
        tipo: 'ARQUIVO',
        arquivo: rel,
        msg: `${regra.porQue} — versionado no git`,
        como: 'não versionar; use .gitignore + variable de ambiente local e secrets no CI',
      })
      break
    }
  }
}

// 2. segredo no conteúdo
for (const rel of arquivos) {
  if (IGNORAR_CONTEUDO.some((r) => r.test(rel))) continue
  const txt = textoVarrido(join(RAIZ, rel))
  if (!txt) continue
  const linhas = txt.split('\n')
  for (const p of PADROES) {
    p.re.lastIndex = 0
    const achadosRegex = [...txt.matchAll(p.re)]
    if (!achadosRegex.length) continue
    for (const m of achadosRegex) {
      if (p.exige && !p.exige.test(m[0])) continue
      // acha a linha, para o gate ser acionável e não só "algo achou"
      const idx = linhas.findIndex((l) => l.includes(m[0]))
      achados.push({
        tipo: 'CONTEÚDO',
        arquivo: rel,
        linha: idx + 1,
        msg: p.nome,
        trecho: `${m[0].slice(0, 12)}…${m[0].slice(-6)} (${m[0].length} chars)`,
        como: p.nota
          ? `${p.nota}. Rodar no CI via secrets, nunca no repo.`
          : 'Rodar no CI via secrets, nunca no repo.',
      })
    }
  }
}

// 3. histórico — quem já commitou algo, o gitleaks do CI acha. Avisar, não barrar.
let historicoSujo = false
try {
  const r = execFileSync(
    'git',
    ['log', '-p', '--all', '-G', 'service_role|AIza|-----BEGIN', '--oneline'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  )
  historicoSujo = r.trim().length > 0
} catch {}

console.log(
  `check-secrets: ${arquivos.length} arquivos versionados · ${achados.length} achado(s)`,
)

if (achados.length === 0) {
  console.log('  OK  nenhum arquivo proibido e nenhum padrão de credencial')
} else {
  console.log('')
  // Rotacionar só faz sentido se um SEGREDO (não só um arquivo proibido) foi achado.
  const temSegredo = achados.some((a) => a.tipo === 'CONTEÚDO')
  for (const a of achados) {
    const onde = `${a.arquivo}${a.linha ? `:${a.linha}` : ''}`
    console.log(`  ${a.tipo === 'ARQUIVO' ? 'ARQUIVO' : 'SEGREDO'}  ${onde}`)
    console.log(`          ${a.msg}${a.trecho ? `  → ${a.trecho}` : ''}`)
    console.log(`          ${a.como}`)
  }
  console.log(
    `\nBLOQUEADO: ${achados.length} problema(s).` +
      (temSegredo
        ? ' Rotacione a credencial exposta — remover a linha NÃO invalida a chave.'
        : ' Nenhuma credencial exposta, então não há o que rotacionar.'),
  )
}

if (historicoSujo) {
  console.log(
    '\nAVISO: o histórico do git contém padrão de credencial. O gitleaks do CI\n' +
      '        vai apontar; limpar histórico exige rotação da chave primeiro.',
  )
}

process.exitCode = achados.length === 0 ? 0 : 1
