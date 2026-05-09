#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const targets = [
  path.join(repoRoot, 'urai-tier1', '.next'),
  path.join(repoRoot, 'urai-tier1', 'tsconfig.tsbuildinfo'),
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`[clean-next-state] removed ${path.relative(repoRoot, target)}`);
}

console.log('[clean-next-state] Next.js generated state is clean.');
