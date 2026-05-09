import { spawnSync } from 'node:child_process';
import process from 'node:process';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio ?? 'inherit',
    shell: process.platform === 'win32',
    encoding: options.encoding ?? 'utf8',
  });
}

const probe = run('pnpm', ['playwright:check'], { stdio: 'pipe' });

if (probe.status === 0) {
  const e2e = run('node', ['tests/spatial-lock.mjs']);
  process.exit(e2e.status ?? 1);
}

const output = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`.trim();

if (process.env.CI) {
  console.error(output);
  console.error('[URAI Spatial] Playwright is required in CI. Failing aggregate test run.');
  process.exit(probe.status ?? 1);
}

console.warn('[URAI Spatial] Skipping e2e in this local/rootless environment because Playwright Chromium cannot launch.');
console.warn('[URAI Spatial] Core unit tests, functions tests, typecheck/build, and rules checks should still be run.');
console.warn('[URAI Spatial] To run e2e locally, install Chromium runtime libraries with root privileges or run inside a Playwright-ready container.');
if (output) {
  console.warn('\nPlaywright probe output:');
  console.warn(output);
}
process.exit(0);
