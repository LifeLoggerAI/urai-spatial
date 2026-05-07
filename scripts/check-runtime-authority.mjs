import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const shellPath = 'urai-tier1/src/spatial/layout/TierOneExperience.tsx';
const requiredFiles = [
  shellPath,
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/home/page.tsx',
  'urai-tier1/src/app/ascent/page.tsx',
  'urai-tier1/src/app/life-map/page.tsx',
  'urai-tier1/src/app/focus/page.tsx',
  'urai-tier1/src/app/replay/page.tsx',
  'urai-tier1/src/app/mirror/page.tsx',
];

const failures = [];

function fileExists(file) {
  return existsSync(resolve(root, file));
}

for (const file of requiredFiles) {
  if (!fileExists(file)) failures.push(`${file} is missing`);
}

function read(file) {
  return readFileSync(resolve(root, file), 'utf8');
}

function expectContains(file, token, label = token) {
  if (!fileExists(file)) return;
  const content = read(file);
  if (!content.includes(token)) failures.push(`${file} must contain ${label}`);
}

for (const routeFile of requiredFiles.filter((file) => file !== shellPath)) {
  expectContains(routeFile, 'TierOneExperience', 'canonical TierOneExperience shell');
}

expectContains(shellPath, 'mode', 'routed spatial mode handling');
expectContains(shellPath, 'life-map', 'canonical Life Map mode');
expectContains(shellPath, 'focus', 'canonical Focus mode');
expectContains(shellPath, 'replay', 'canonical Replay mode');
expectContains(shellPath, 'mirror', 'canonical Mirror mode');

if (failures.length) {
  console.error('Runtime authority check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Runtime authority checks passed.');
