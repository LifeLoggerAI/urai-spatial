import { spawnSync } from 'node:child_process';

function run(label, command, args, options = {}) {
  console.log(`\n[ci-spatial-e2e] ${label}`);
  console.log(`[ci-spatial-e2e] $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: process.env.CI ?? '1' },
    ...options,
  });

  if (result.status !== 0) {
    console.error(`[ci-spatial-e2e] Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run('Install Playwright Chromium and runtime dependencies', ['pnpm'][0], ['playwright:ensure']);
run('Run canonical spatial E2E lock', 'pnpm', ['test:e2e']);
