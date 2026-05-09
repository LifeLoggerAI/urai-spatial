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
  const run = spawnSync('pnpm', ['--filter', 'urai-tier1', 'exec', 'node', '../tests/replay-tier5-lock.mjs'], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}

if (strict) {
  console.error('[replay-tier5-guard] Playwright browser binary unavailable and CI_STRICT_E2E=1; failing.');
  process.exit(1);
}

console.warn('[replay-tier5-guard] Playwright browser binary unavailable; skipping replay tier5 in this environment.');
process.exit(0);
