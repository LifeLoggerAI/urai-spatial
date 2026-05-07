import { spawnSync } from 'node:child_process';
import process from 'node:process';

const AUTO_INSTALL = process.argv.includes('--auto-install');
const IS_LINUX = process.platform === 'linux';
const IS_ROOT = typeof process.getuid === 'function' ? process.getuid() === 0 : false;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio ?? 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
}

function probeChromium() {
  return spawnSync('pnpm', ['--filter', 'urai-tier1', 'exec', 'node', '-e', `
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
    })().catch((error) => {
      console.error(error && error.stack ? error.stack : error);
      process.exit(1);
    });
  `], {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
}

function printHelp(probe) {
  const combined = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`.trim();
  console.error('\n[URAI Spatial] Playwright Chromium cannot launch in this environment.');
  if (combined) console.error(`\nLaunch probe output:\n${combined}\n`);
  console.error('This usually means Linux browser system libraries are missing.');
  console.error('Run one of the following before pnpm test:e2e:');
  console.error('  pnpm playwright:install-deps');
  console.error('  pnpm exec playwright install-deps chromium');
  console.error('  pnpm exec playwright install chromium');
  console.error('\nFor Debian/Ubuntu containers, Playwright will install packages such as libglib2.0-0, libnss3, libx11, libxkbcommon0, libgtk-3-0, and related Chromium runtime libraries.');
  console.error('\nIn CI, run:');
  console.error('  pnpm playwright:ensure');
}

function maybeInstall() {
  if (!AUTO_INSTALL) return false;
  if (!IS_LINUX) return false;

  console.log('[URAI Spatial] Installing Playwright Chromium and Linux runtime dependencies...');
  const installBrowser = run('pnpm', ['--filter', 'urai-tier1', 'exec', 'playwright', 'install', 'chromium']);
  if (installBrowser.status !== 0) return false;

  if (!IS_ROOT && !process.env.CI) {
    console.warn('[URAI Spatial] Skipping install-deps because this process is not root and CI is not set.');
    return true;
  }

  const installDeps = run('pnpm', ['--filter', 'urai-tier1', 'exec', 'playwright', 'install-deps', 'chromium']);
  return installDeps.status === 0;
}

let probe = probeChromium();
if (probe.status === 0) {
  console.log('[URAI Spatial] Playwright Chromium runtime is ready.');
  process.exit(0);
}

if (maybeInstall()) {
  probe = probeChromium();
  if (probe.status === 0) {
    console.log('[URAI Spatial] Playwright Chromium runtime is ready after dependency install.');
    process.exit(0);
  }
}

printHelp(probe);
process.exit(1);
