import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('data/storage-accounts.json', 'utf8'));
d.filter(x => !x.sourceUrl).forEach(q => console.log(q.id, q.subdomain, q.question.slice(0, 80)));