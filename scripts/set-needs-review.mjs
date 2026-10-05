#!/usr/bin/env node
/**
 * Set needsReview: true for all questions in all JSON banks.
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
    // Skip if not an array
    if (!Array.isArray(data)) continue;

    let updatedInFile = 0;
    for (const q of data) {
      // Only process objects
      if (q && typeof q === 'object' && !Array.isArray(q)) {
        if (q.needsReview !== true) {
          q.needsReview = true;
          updatedInFile++;
        }
      }
    }
    if (updatedInFile > 0) {
      writeFileSync(file, JSON.stringify(data, null, 2));
      totalUpdated += updatedInFile;
      console.log(`✅ ${file.split(/[\/]/).pop()}: ${updatedInFile} questions updated needsReview to true`);
    }
  } catch (e) {
    console.error(`❌ Failed to process ${file}:`, e.message);
  }
}

console.log(`\n🎉 Total questions updated needsReview: true: ${totalUpdated}`);
