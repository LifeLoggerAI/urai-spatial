import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  addPortableBrowserLibraries,
  chromiumLaunchOptionsLiteral,
  commandExists,
  findFullChromiumExecutable,
} from './playwright-runtime-helpers.mjs';

const AUTO_INSTALL = process.argv.includes('--auto-install');
const IS_LINUX = process.platform === 'linux';
const IS_ROOT = typeof process.getuid === 'function' ? process.getuid() === 0 : false;

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: options.stdio ?? 'inherit',
    shell: options.shell ?? false,
    ...options,
  });
}

function pnpmInvocation(args) {
  const candidates = [
    process.env.npm_execpath && /pnpm/i.test(process.env.npm_execpath) ? process.env.npm_execpath : null,
    path.join(process.cwd(), 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    path.join(process.cwd(), 'node_modules', '.pnpm', 'pnpm@10.0.0', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  ].filter(Boolean);

  const entrypoint = candidates.find((candidate) => fs.existsSync(candidate));
  if (entrypoint) return { command: process.execPath, args: [entrypoint, ...args] };
  return { command: 'pnpm', args };
}

function runPnpm(args, options = {}) {
  const pnpm = pnpmInvocation(args);
  return run(pnpm.command, pnpm.args, options);
}

function canAttemptSystemInstall() {
  if (!IS_LINUX) return false;
  if (IS_ROOT) return true;
  return commandExists('sudo');
}

function probeChromium() {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { chromium } from 'playwright';
    try {
      const browser = await chromium.launch(${chromiumLaunchOptionsLiteral()});
      await browser.close();
    } catch (error) {
      console.error(error && error.stack ? error.stack : error);
      process.exit(1);
    }
  `], {
    stdio: 'pipe',
    shell: false,
    encoding: 'utf8',
    env: process.env,
  });
}

function extractMissingLibraries(output) {
  const matches = [...output.matchAll(/error while loading shared libraries: ([^:]+):/g)];
  return [...new Set(matches.map((match) => match[1]))];
}

function printHelp(probe, addedPortableLibs = []) {
  const combined = `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`.trim();
  const missingLibraries = extractMissingLibraries(combined);
  const fullChromium = findFullChromiumExecutable();

  console.error('\n[URAI Spatial] Playwright Chromium cannot launch in this environment.');
  if (combined) console.error(`\nLaunch probe output:\n${combined}\n`);
  if (addedPortableLibs.length) {
    console.error(`[URAI Spatial] Injected portable browser libraries: ${addedPortableLibs.join(', ')}`);
  }
  if (missingLibraries.length) {
    console.error(`[URAI Spatial] Missing browser runtime libraries: ${missingLibraries.join(', ')}`);
  }
  if (fullChromium) {
    console.error(`\n[URAI Spatial] Full Chromium exists at ${fullChromium}, but launch still failed.`);
  }
  console.error('This usually means Linux browser system libraries are missing or the Playwright browser install is incomplete.');
  console.error('The repo now tries no-sudo fallbacks first: Nix expat, then local apt .deb extraction for libexpat1.');
  console.error('If another shared library appears after libexpat, add it to scripts/playwright-runtime-helpers.mjs.');
  console.error('\nFor a clean CI environment, run:');
  console.error('  pnpm playwright:ensure');
  console.error('  pnpm lock:all');
}

function maybeInstall() {
  if (!AUTO_INSTALL) return false;

  const hasChromium = Boolean(findFullChromiumExecutable());
  if (!hasChromium) {
    console.log('[URAI Spatial] Installing Playwright Chromium...');
    const installBrowser = runPnpm(['--filter', 'urai-tier1', 'exec', 'playwright', 'install', 'chromium']);
    if (installBrowser.status !== 0 && !findFullChromiumExecutable()) return false;
  }

  if (!IS_LINUX) return true;

  if (!canAttemptSystemInstall()) {
    console.warn('[URAI Spatial] Skipping install-deps because this process is not root and sudo is unavailable.');
    return true;
  }

  console.log('[URAI Spatial] Installing Playwright Linux runtime dependencies...');
  const installDeps = runPnpm(['--filter', 'urai-tier1', 'exec', 'playwright', 'install-deps', 'chromium']);
  return installDeps.status === 0;
}

const addedPortableLibs = addPortableBrowserLibraries();
if (addedPortableLibs.length) {
  console.log(`[URAI Spatial] Added portable browser library path(s): ${addedPortableLibs.join(', ')}`);
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

printHelp(probe, addedPortableLibs);
process.exit(1);
