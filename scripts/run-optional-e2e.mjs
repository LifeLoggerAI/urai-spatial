import { spawnSync } from 'node:child_process';
import process from 'node:process';

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio ?? 'inherit',
    shell: false,
    encoding: options.encoding ?? 'utf8',
  });
}

const probe = run(process.execPath, ['scripts/run-pnpm.mjs', 'playwright:check'], { stdio: 'pipe' });

if (!probe.error && probe.status === 0) {
  // The previous route-constant lock was not an executed browser journey.
  // Run the original mounted React/Three.js application and all five real
  // Playwright hardening lanes (navigation, physical camera, race, data, visual).
  const e2e = run(process.execPath, ['tests/spatial-tier-lock-hardening.mjs', '--suite=all']);
  if (e2e.error) {
    console.error(`[URAI Spatial] Could not launch real browser acceptance: ${e2e.error.message}`);
    process.exit(1);
  }
  process.exit(e2e.status ?? 1);
}

const output = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`.trim();
if (probe.error) console.error(`[URAI Spatial] Playwright probe failed to execute: ${probe.error.message}`);

// An explicit, non-CI development opt-out is never release acceptance.
// Missing Chromium is otherwise a failure, including when CI is unset.
if (process.env.URAI_ALLOW_OPTIONAL_E2E_SKIP === '1' && !process.env.CI) {
  console.warn('[URAI Spatial] EXPLICIT LOCAL E2E SKIP: browser acceptance NOT VERIFIED; NOT RELEASE READY.');
  if (output) console.warn(output);
  process.exit(0);
}

if (output) console.error(output);
console.error('[URAI Spatial] Real Playwright browser acceptance is required; no implicit static-test fallback.');
process.exit(probe.status || 1);
