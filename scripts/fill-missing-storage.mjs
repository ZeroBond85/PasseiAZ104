#!/usr/bin/env node
/**
 * Fill missing sourceUrl and needsReview for storage-accounts.json
 * Uses a default URL as placeholder; intended for manual review later.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FILE = join(ROOT, 'data', 'storage-accounts.json');
const DEFAULT_URL = 'https://learn.microsoft.com/azure/storage/common/storage-account-overview';

const data = JSON.parse(readFileSync(FILE, 'utf8'));
let updated = 0;
for (const q of data) {
  if (!q.sourceUrl) {
    q.sourceUrl = DEFAULT_URL;
    q.needsReview = true;
    updated++;
  }
}
writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`Updated ${updated} questions in ${FILE}`);
