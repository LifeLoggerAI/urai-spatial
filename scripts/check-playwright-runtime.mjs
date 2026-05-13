import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
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

function commandExists(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${command}`], {
    stdio: 'ignore',
    shell: false,
  });
  return result.status === 0;
}

function canAttemptSystemInstall() {
  if (!IS_LINUX) return false;
  if (IS_ROOT) return true;
  return commandExists('sudo');
}

function findFullChromiumExecutable() {
  const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(browsersDir)) return null;

  const entries = readdirSync(browsersDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();

  for (const entry of entries) {
    const linuxCandidate = path.join(browsersDir, entry, 'chrome-linux', 'chrome');
    const macCandidate = path.join(browsersDir, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
    const winCandidate = path.join(browsersDir, entry, 'chrome-win', 'chrome.exe');
    for (const candidate of [linuxCandidate, macCandidate, winCandidate]) {
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
}

function probeChromium() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || findFullChromiumExecutable();
  const launchOptions = executablePath ? `{ headless: true, executablePath: ${JSON.stringify(executablePath)} }` : '{ headless: true }';

  return spawnSync('pnpm', ['--filter', 'urai-tier1', 'exec', 'node', '-e', `
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch(${launchOptions});
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

function extractMissingLibraries(output) {
  const matches = [...output.matchAll(/error while loading shared libraries: ([^:]+):/g)];
  return [...new Set(matches.map((match) => match[1]))];
}

function printHelp(probe) {
  const combined = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`.trim();
  const missingLibraries = extractMissingLibraries(combined);
  const fullChromium = findFullChromiumExecutable();

  console.error('\n[URAI Spatial] Playwright Chromium cannot launch in this environment.');
  if (combined) console.error(`\nLaunch probe output:\n${combined}\n`);
  if (missingLibraries.length) {
    console.error(`[URAI Spatial] Missing browser runtime libraries: ${missingLibraries.join(', ')}`);
  }
  if (fullChromium) {
    console.error(`\n[URAI Spatial] Full Chromium exists at ${fullChromium}, but launch still failed.`);
  }
  console.error('This usually means Linux browser system libraries are missing or the Playwright browser install is incomplete.');
  console.error('Run one of the following before pnpm test:e2e in an environment with root/sudo access:');
  console.error('  pnpm playwright:install-deps');
  console.error('  pnpm exec playwright install-deps chromium');
  console.error('  pnpm exec playwright install chromium');
  console.error('\nFor low-disk preview sandboxes, a full Chromium install without chromium-headless-shell is supported when chrome-linux/chrome exists under ~/.cache/ms-playwright/chromium-* or when PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set.');
  console.error('\nFor Debian/Ubuntu containers, Playwright installs packages such as libglib2.0-0, libnss3, libx11-6, libxext6, libxkbcommon0, libgtk-3-0, and related Chromium runtime libraries.');
  console.error('\nIf this is a non-root sandbox without sudo, run E2E in CI or a container image where those libraries are preinstalled. Do not bypass lock:e2e for production certification.');
  console.error('\nIn CI, run:');
  console.error('  pnpm playwright:ensure');
}

function maybeInstall() {
  if (!AUTO_INSTALL) return false;
  if (!IS_LINUX) return false;

  console.log('[URAI Spatial] Installing Playwright Chromium...');
  const installBrowser = run('pnpm', ['--filter', 'urai-tier1', 'exec', 'playwright', 'install', 'chromium']);
  if (installBrowser.status !== 0 && !findFullChromiumExecutable()) return false;

  if (!canAttemptSystemInstall()) {
    console.warn('[URAI Spatial] Skipping install-deps because this process is not root and sudo is unavailable.');
    return true;
  }

  console.log('[URAI Spatial] Installing Playwright Linux runtime dependencies...');
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
