import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'urai-tier1/src/components/TierOneExperience.tsx',
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/home/page.tsx',
  'urai-tier1/src/app/life-map/page.tsx',
  'urai-tier1/src/app/focus/page.tsx',
  'urai-tier1/src/app/replay/page.tsx',
  'urai-tier1/src/app/mirror/page.tsx',
];

const failures = [];

for (const file of requiredFiles) {
  const path = resolve(root, file);
  if (!existsSync(path)) failures.push(`${file} is missing`);
}

function read(file) {
  return readFileSync(resolve(root, file), 'utf8');
}

function expectContains(file, token, label = token) {
  if (!existsSync(resolve(root, file))) return;
  const content = read(file);
  if (!content.includes(token)) failures.push(`${file} must contain ${label}`);
}

expectContains('urai-tier1/src/app/page.tsx', 'TierOneExperience', 'canonical TierOneExperience shell');
expectContains('urai-tier1/src/app/home/page.tsx', 'TierOneExperience', 'canonical TierOneExperience shell');
expectContains('urai-tier1/src/app/life-map/page.tsx', 'TierOneExperience', 'canonical TierOneExperience shell');
expectContains('urai-tier1/src/app/focus/page.tsx', 'TierOneExperience', 'canonical TierOneExperience shell');
expectContains('urai-tier1/src/app/replay/page.tsx', 'TierOneExperience', 'canonical TierOneExperience shell');
expectContains('urai-tier1/src/app/mirror/page.tsx', 'TierOneExperience', 'canonical TierOneExperience shell');
expectContains('urai-tier1/src/components/TierOneExperience.tsx', 'mode', 'routed spatial mode handling');

if (failures.length) {
  console.error('Runtime authority check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime authority checks passed.');
