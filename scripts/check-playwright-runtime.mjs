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

function prependLdLibraryPath(libDir) {
  if (!libDir || !existsSync(libDir)) return false;
  const current = process.env.LD_LIBRARY_PATH || '';
  const parts = current.split(':').filter(Boolean);
  if (!parts.includes(libDir)) {
    process.env.LD_LIBRARY_PATH = [libDir, ...parts].join(':');
  }
  return true;
}

function addNixBrowserLibraries() {
  if (!IS_LINUX || process.env.URAI_DISABLE_NIX_BROWSER_LIBS === 'true' || !commandExists('nix')) return [];

  const added = [];
  const packages = [
    ['expat', 'libexpat.so.1'],
  ];

  for (const [pkg, marker] of packages) {
    const result = spawnSync('nix', ['eval', '--raw', `nixpkgs#${pkg}.outPath`], {
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: false,
      encoding: 'utf8',
    });
    if (result.status !== 0 || !result.stdout) continue;
    const outPath = result.stdout.trim();
    const libDir = path.join(outPath, 'lib');
    if (existsSync(path.join(libDir, marker)) && prependLdLibraryPath(libDir)) {
      added.push(`${pkg}:${libDir}`);
    }
  }

  return added;
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
    const candidates = [
      path.join(browsersDir, entry, 'chrome-linux64', 'chrome'),
      path.join(browsersDir, entry, 'chrome-linux', 'chrome'),
      path.join(browsersDir, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join(browsersDir, entry, 'chrome-win', 'chrome.exe'),
    ];
    for (const candidate of candidates) {
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
    env: process.env,
  });
}

function extractMissingLibraries(output) {
  const matches = [...output.matchAll(/error while loading shared libraries: ([^:]+):/g)];
  return [...new Set(matches.map((match) => match[1]))];
}

function printHelp(probe, addedNixLibs = []) {
  const combined = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`.trim();
  const missingLibraries = extractMissingLibraries(combined);
  const fullChromium = findFullChromiumExecutable();

  console.error('\n[URAI Spatial] Playwright Chromium cannot launch in this environment.');
  if (combined) console.error(`\nLaunch probe output:\n${combined}\n`);
  if (addedNixLibs.length) {
    console.error(`[URAI Spatial] Injected Nix browser libraries: ${addedNixLibs.join(', ')}`);
  }
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
  console.error('\nFor Nix preview sandboxes without sudo, the repo auto-injects nixpkgs#expat when nix is available. Disable with URAI_DISABLE_NIX_BROWSER_LIBS=true.');
  console.error('\nFor low-disk preview sandboxes, a full Chromium install without chromium-headless-shell is supported when chrome-linux64/chrome or chrome-linux/chrome exists under ~/.cache/ms-playwright/chromium-* or when PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is set.');
  console.error('\nIf this is a non-root sandbox and another shared library appears after libexpat, run E2E in CI or add that package to scripts/check-playwright-runtime.mjs and tests/spatial-lock.mjs.');
}

function maybeInstall() {
  if (!AUTO_INSTALL) return false;
  if (!IS_LINUX) return false;

  const hasChromium = Boolean(findFullChromiumExecutable());
  if (!hasChromium) {
    console.log('[URAI Spatial] Installing Playwright Chromium...');
    const installBrowser = run('pnpm', ['--filter', 'urai-tier1', 'exec', 'playwright', 'install', 'chromium']);
    if (installBrowser.status !== 0 && !findFullChromiumExecutable()) return false;
  }

  if (!canAttemptSystemInstall()) {
    console.warn('[URAI Spatial] Skipping install-deps because this process is not root and sudo is unavailable.');
    return true;
  }

  console.log('[URAI Spatial] Installing Playwright Linux runtime dependencies...');
  const installDeps = run('pnpm', ['--filter', 'urai-tier1', 'exec', 'playwright', 'install-deps', 'chromium']);
  return installDeps.status === 0;
}

const addedNixLibs = addNixBrowserLibraries();
if (addedNixLibs.length) {
  console.log(`[URAI Spatial] Added Nix browser library path(s): ${addedNixLibs.join(', ')}`);
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

printHelp(probe, addedNixLibs);
process.exit(1);
