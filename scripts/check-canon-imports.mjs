#!/usr/bin/env node
import fs from 'node:fs';

const index = fs.readFileSync('src/canon/index.ts', 'utf8');
for (const token of ['tier1','tier2','tier3','tier4','tier5','locs']) {
  if (!index.includes(token)) {
    console.error(`src/canon/index.ts missing export reference for ${token}`);
    process.exit(1);
  }
}
console.log('Canon import/export surface looks valid.');
