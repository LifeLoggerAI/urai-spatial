import { spawnSync } from 'node:child_process';
const strict = process.env.CI_STRICT_E2E === '1';

const probe = spawnSync(
  'pnpm',
  [
    '--filter',
    'urai-tier1',
    'exec',
    'node',
    '-e',
    "const { chromium } = require('playwright'); chromium.launch({ headless: true }).then(b=>b.close()).then(()=>process.exit(0)).catch(()=>process.exit(1));",
  ],
  { stdio: 'ignore' },
);

if (probe.status === 0) {
  const run = spawnSync('pnpm', ['--filter', 'urai-tier1', 'exec', 'node', '../tests/spatial-lock.mjs'], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}

if (strict) {
  console.error('[e2e-guard] Playwright browser binary unavailable and CI_STRICT_E2E=1; failing.');
  process.exit(1);
}

console.warn('[e2e-guard] Playwright browser binary unavailable; skipping e2e in this environment.');
process.exit(0);
