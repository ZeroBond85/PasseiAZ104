#!/usr/bin/env node
/**
 * Enrich missing sourceUrl in all JSON banks using per-subdomain most frequent URL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'node:glob';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const FILES = glob.sync('*.json', { cwd: DATA_DIR, absolute: true });

const subdomainStats = {}; // subdomain -> {url: count}
const filesToUpdate = [];

for (const file of FILES) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const updated = [];
    for (const q of data) {
      if (q.sourceUrl) {
        const sub = q.subdomain || 'unknown';
        if (!subdomainStats[sub]) subdomainStats[sub] = {};
        subdomainStats[sub][q.sourceUrl] = (subdomainStats[sub][q.sourceUrl] || 0) + 1;
      } else {
        updated.push({ file, q });
      }
    }
    if (updated.length) filesToUpdate.push({ file, questions: updated });
  } catch (e) {
    console.error(`Failed to process ${file}:`, e.message);
  }
}

// Determine most frequent URL per subdomain
const bestUrlPerSubdomain = {};
for (const [sub, map] of Object.entries(subdomainStats)) {
  let bestUrl = null;
  let bestCount = 0;
  for (const [url, cnt] of Object.entries(map)) {
    if (cnt > bestCount) {
      bestCount = cnt;
      bestUrl = url;
    }
  }
  if (bestUrl) bestUrlPerSubdomain[sub] = bestUrl;
}

console.log('Subdomain best URLs:');
for (const [sub, url] of Object.entries(bestUrlPerSubdomain)) {
  console.log(`  ${sub}: ${url}`);
}

// Apply updates
let totalUpdated = 0;
for (const { file, questions } of filesToUpdate) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  for (const { q } of questions) {
    const sub = q.subdomain || 'unknown';
    const url = bestUrlPerSubdomain[sub] || 'https://learn.microsoft.com/azure/';
    if (!q.sourceUrl) {
      q.sourceUrl = url;
      q.needsReview = true;
      totalUpdated++;
    }
  }
  writeFileSync(file, JSON.stringify(data, null, 2));
}
console.log(`\nUpdated ${totalUpdated} questions across ${filesToUpdate.length} files.`);
