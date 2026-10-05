#!/usr/bin/env node
/**
 * R3 Pipeline - Auditoria completa + Geração de patches cirúrgicos
 * Uso: node scripts/r3-pipeline.mjs [--dry-run] [--verbose]
 */
import fs from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DATA_DIR = join(ROOT, 'data');
const SCRIPTS_DIR = join(ROOT, 'scripts');
const DOCS_CACHE = join(ROOT, '.cache/docs');

const BANK_FILES = [
  'data/identidade-acesso.json',
  'data/identidade-governanca.json',
  'data/storage-accounts.json',
  'data/storage-access.json',
  'data/storage-files-blobs.json',
  'data/compute-platform.json',
  'data/monitoramento.json',
  'data/rede-vnets.json',
  'data/rede-secure-access.json',
  'data/rede-dns-lb.json',
  'data/compute-vms.json',
  'data/compute-apps.json',
];

const DOC_SOURCES = {
  entra: 'https://raw.githubusercontent.com/MicrosoftDocs/entra-docs/main/docs',
  storage: 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/storage',
  arm: 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/azure-resource-manager',
  intune: 'https://raw.githubusercontent.com/MicrosoftDocs/entra-docs/main/docs/intune',
  azure: 'https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles',
};

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

async function fetchDoc(url) {
  const cachePath = join(ROOT, '.cache/docs', url.replace(/[^a-z0-9]/gi, '_') + '.md');
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();
  fs.mkdirSync(join(ROOT, '.cache/docs'), { recursive: true });
  fs.writeFileSync(cachePath, text);
  return text;
}

async function loadAllDocs() {
  console.log('📥 Baixando docs de referência...');
}

function loadAllBanks() {
  const banks = {};
  for (const f of BANK_FILES) {
    if (fs.existsSync(f)) {
      banks[f] = JSON.parse(fs.readFileSync(f, 'utf8'));
    }
  }
  return banks;
}

function findQuestionsWithoutSourceUrl(banks) {
  const missing = [];
  for (const [file, questions] of Object.entries(banks)) {
    for (const q of questions) {
      if (!q.sourceUrl) {
        missing.push({ file, id: q.id, subdomain: q.subdomain, question: q.question.slice(0, 120) });
      }
    }
  }
  return missing;
}

function generatePatch(file, updates) {
  // Gera patch cirúrgico para um arquivo
}

function main() {
  console.log('🔍 R3 Pipeline - Auditoria completa');
  
  const banks = loadAllBanks();
  const missing = findQuestionsWithoutSourceUrl(banks);
  
  console.log(`\n📊 Estado atual:`);
  console.log(`   Total questões: ${Object.values(banks).reduce((a, b) => a + b.length, 0)}`);
  console.log(`   Sem sourceUrl: ${missing.length}`);
  
  const bySubdomain = {};
  for (const q of missing) {
    if (!bySubdomain[q.subdomain]) bySubdomain[q.subdomain] = [];
    bySubdomain[q.subdomain].push(q);
  }
  
  console.log('\n📋 Por subdomínio:');
  for (const [sub, items] of Object.entries(bySubdomain).sort((a,b) => b[1].length - a[1].length)) {
    console.log(`   ${sub}: ${items.length}`);
  }
  
  if (!DRY_RUN) {
    // TODO: baixar docs, gerar patches, aplicar, validar
  }
  
  console.log('\n✅ Auditoria completa. Use --dry-run para apenas ver o relatório.');
}

main();