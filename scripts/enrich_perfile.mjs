#!/usr/bin/env node
/**
 * For each JSON bank, fill missing sourceUrl using the most frequent URL
 * within the same subdomain in that same file.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const files = readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => join(DATA_DIR, f));

let totalUpdated = 0;

for (const file of files) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    // Build subdomain -> URL frequency map from questions that have sourceUrl
    const subdomainStats = {};
    for (const q of data) {
      if (q.sourceUrl) {
        const sub = q.subdomain || 'unknown';
        if (!subdomainStats[sub]) subdomainStats[sub] = {};
        subdomainStats[sub][q.sourceUrl] = (subdomainStats[sub][q.sourceUrl] || 0) + 1;
      }
    }
    // Determine best URL per subdomain
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
    // Update missing
    let updatedInFile = 0;
    for (const q of data) {
      if (!q.sourceUrl) {
        const sub = q.subdomain || 'unknown';
        const url = bestUrlPerSubdomain[sub] || 'https://learn.microsoft.com/azure/';
        q.sourceUrl = url;
        q.needsReview = true;
        updatedInFile++;
      }
    }
    if (updatedInFile > 0) {
      writeFileSync(file, JSON.stringify(data, null, 2));
      totalUpdated += updatedInFile;
      console.log(`✅ ${file.split(/[\/]/).pop()}: ${updatedInFile} questions updated`);
    }
  } catch (e) {
    console.error(`❌ Failed to process ${file}:`, e.message);
  }
}

console.log(`\n🎉 Total questions updated: ${totalUpdated}`);
