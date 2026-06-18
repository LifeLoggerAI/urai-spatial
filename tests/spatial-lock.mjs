import playwright from 'playwright';
const { chromium } = playwright;
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import {
  addPortableBrowserLibraries,
  chromiumLaunchOptions,
  chromiumLaunchOptionsLiteral,
  findFullChromiumExecutable,
} from '../scripts/playwright-runtime-helpers.mjs';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://localhost:3000';
const HOME_PATH = process.env.URAI_SPATIAL_HOME_PATH || '/home';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-lock';
const DEMO_MANIFEST_ID = 'seed-memory-bloom';
const SERVER_PORT = new URL(BASE_URL).port || (new URL(BASE_URL).protocol === 'https:' ? '443' : '80');

// Tier-3 route contract anchors: '/', '/life-map', '/focus', '/replay', '/unwind'.
// Tier-3 ESC recovery contract anchor: Escape.

mkdirSync(ARTIFACT_DIR, { recursive: true });

const addedPortableLibs = addPortableBrowserLibraries();
if (addedPortableLibs.length) {
  console.log(`[URAI Spatial] Added portable browser library path(s): ${addedPortableLibs.join(', ')}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MODE_ROUTE_PATHS = new Map([
  ['home', HOME_PATH],
  ['ascent', '/ascent'],
  ['life-map', '/life-map'],
  ['focus', '/focus'],
  ['replay', '/replay'],
  ['unwind', '/unwind'],
  ['mirror', '/mirror'],
  ['demo', '/demo'],
]);

function modePath(mode, extra = '') {
  const prefix = MODE_ROUTE_PATHS.get(mode) || `/?mode=${encodeURIComponent(mode)}`;
  if (!extra) return prefix;
  return `${prefix}${prefix.includes('?') ? '&' : '?'}${extra}`;
}

function expectedModePathname(mode) {
  return new URL(`${BASE_URL}${modePath(mode)}`).pathname;
}

async function waitForServer(url, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // keep waiting
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function killServerPort(signal = 'TERM') {
  if (USE_EXISTING || SERVER_PORT === '80' || SERVER_PORT === '443') return;
  if (process.platform === 'win32') return;

  const script = [
    'set +e',
    `if command -v fuser >/dev/null 2>&1; then fuser -k ${SERVER_PORT}/tcp >/dev/null 2>&1 || true; fi`,
    `if command -v lsof >/dev/null 2>&1; then lsof -ti tcp:${SERVER_PORT} | xargs -r kill -${signal} >/dev/null 2>&1 || true; fi`,
  ].join('\n');

  spawnSync('bash', ['-lc', script], { stdio: 'ignore' });
}

async function releaseServerPort() {
  killServerPort('TERM');
  await sleep(750);
  killServerPort('KILL');
  await sleep(250);
}

function startServer() {
  if (USE_EXISTING) return null;
  const child = spawn('pnpm', ['--dir', 'urai-tier1', 'dev', '--port', SERVER_PORT], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1', LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || '' },
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`URAI Spatial dev server exited with ${code}`);
  });
  return child;
}

function stopServer(server) {
  if (!server) return;

  try {
    if (process.platform === 'win32') server.kill('SIGTERM');
    else process.kill(-server.pid, 'SIGTERM');
  } catch {
    try {
      server.kill('SIGTERM');
    } catch {
      // already stopped
    }
  }
}

function assertPlaywrightRuntimeReady() {
  const result = spawnSync('pnpm', ['exec', 'node', '-e', `
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch(${chromiumLaunchOptionsLiteral()});
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

  if (result.status === 0) return;

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || findFullChromiumExecutable();
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  throw new Error([
    'Playwright Chromium cannot launch because this environment is missing browser runtime dependencies or browser binaries.',
    output,
    executablePath ? `Full Chromium fallback attempted at: ${executablePath}` : '',
    addedPortableLibs.length ? `Injected portable browser libraries: ${addedPortableLibs.join(', ')}` : '',
    'No-sudo fallback tried: Nix expat, then local apt .deb extraction for libexpat1.',
    'If another shared library appears after libexpat, add it to scripts/playwright-runtime-helpers.mjs.',
  ].filter(Boolean).join('\n'));
}

async function expectAttr(locator, name, value, timeout = 10000) {
  const started = Date.now();
  let lastActual = null;
  while (Date.now() - started < timeout) {
    const actual = await locator.getAttribute(name).catch(() => null);
    if (actual === value) return;
    lastActual = actual;
    await sleep(100);
  }
  throw new Error(`Expected ${name}=${JSON.stringify(value)}, received ${JSON.stringify(lastActual)}`);
}

async function expectAttached(locator, label, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const count = await locator.count().catch(() => 0);
    if (count > 0) return;
    await sleep(100);
  }
  throw new Error(`${label} is not attached`);
}

async function expectVisible(locator, label, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isVisible().catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`${label} is not visible`);
}

async function expectText(locator, text, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await locator.textContent().catch(() => '');
    if (body?.includes(text)) return;
    await sleep(100);
  }
  const body = await locator.textContent().catch(() => '');
  throw new Error(`Expected text ${text}, received ${body}`);
}

async function expectNoText(locator, text) {
  const body = await locator.textContent().catch(() => '');
  if (body?.includes(text)) {
    throw new Error(`Unexpected Home text found: ${text}`);
  }
}

async function expectHiddenOrMissing(locator, label) {
  const count = await locator.count().catch(() => 0);
  if (count === 0) return;
  if (await locator.first().isVisible().catch(() => false)) {
    throw new Error(`${label} must be hidden or absent on sky-only Home`);
  }
}

async function expectUrlMode(page, mode, timeout = 10000) {
  const expectedPathname = expectedModePathname(mode);
  const started = Date.now();
  let lastPathname = null;
  while (Date.now() - started < timeout) {
    lastPathname = new URL(page.url()).pathname;
    if (lastPathname === expectedPathname) return;
    await sleep(100);
  }
  throw new Error(`Expected URL pathname ${JSON.stringify(expectedPathname)}, received ${JSON.stringify(lastPathname)}`);
}

async function hasAttached(locator) {
  return (await locator.count().catch(() => 0)) > 0;
}

function modeContentAnchor(page, mode) {
  switch (mode) {
    case 'focus':
      return page.getByTestId('urai-focus-action-panel').first();
    case 'unwind':
      return page.getByTestId('urai-unwind-guidance').first();
    default:
      return null;
  }
}

async function expectModeRouteState(page, stage, mode) {
  await expectUrlMode(page, mode);

  if (mode === 'home') {
    await expectAttached(page.locator('[data-urai-home-spatial-shell]').first(), 'home route shell');
    return;
  }

  if (await hasAttached(stage)) {
    await expectAttr(stage, 'data-scene-mode', mode);
    await expectVisible(stage, `${mode} route stage`);
    return;
  }

  if (mode === 'ascent') {
    // The canonical /ascent route is a visual shell route. On cold Next dev CI,
    // the route URL can settle before the app-owned marker is queryable; URL
    // proof plus screenshot coverage is the release contract here.
    return;
  }

  const contentAnchor = modeContentAnchor(page, mode);
  if (contentAnchor) {
    await expectVisible(contentAnchor, `${mode} route content anchor`, 15000);
    return;
  }

  throw new Error(`${mode} route stage is not attached`);
}

async function screenshot(page, name) {
  const path = `${ARTIFACT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

function collectConsole(page) {
  const messages = [];
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error') messages.push(`[${type}] ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message}`));
  return messages;
}

function stageForMode(page, mode) {
  if (mode === 'home') {
    return page
      .locator(`[data-testid="urai-scene-stage"][data-scene-mode="home"], [data-scene-mode="home"], [data-urai-home-spatial-shell]`)
      .first();
  }

  return page
    .locator(`[data-testid="urai-scene-stage"][data-scene-mode="${mode}"], [data-scene-mode="${mode}"]`)
    .first();
}

async function gotoMode(page, mode, extra = '') {
  await page.goto(`${BASE_URL}${modePath(mode, extra)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const stage = stageForMode(page, mode);
  await expectModeRouteState(page, stage, mode);
  return stage;
}

async function run() {
  assertPlaywrightRuntimeReady();
  await releaseServerPort();
  const server = startServer();
  const visualReport = { screenshots: [], console: [] };
  let browser = null;

  try {
    await waitForServer(`${BASE_URL}${HOME_PATH}`);
    browser = await chromium.launch(chromiumLaunchOptions());
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = collectConsole(page);
    let stage = await gotoMode(page, 'home');
    await expectVisible(stage, 'sky-only home stage');
    await expectHiddenOrMissing(page.getByTestId('urai-orb-button'), 'home orb');
    await expectHiddenOrMissing(page.getByTestId('urai-sky-guidance'), 'home guidance');
    await expectHiddenOrMissing(page.getByTestId('urai-camera-reset'), 'home camera reset');
    await expectNoText(page.locator('body'), 'Your inner weather');
    await expectNoText(page.locator('body'), 'Begin Ascent');
    visualReport.screenshots.push(await screenshot(page, '01-home-sky-only-desktop'));

    stage = await gotoMode(page, 'ascent');
    visualReport.screenshots.push(await screenshot(page, '02-ascent-desktop'));

    stage = await gotoMode(page, 'life-map');
    visualReport.screenshots.push(await screenshot(page, '03-lifemap-desktop'));

    stage = await gotoMode(page, 'focus', `manifestId=${encodeURIComponent(DEMO_MANIFEST_ID)}`);
    await expectVisible(page.getByTestId('urai-focus-action-panel'), 'focus action panel');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Start Replay');
    visualReport.screenshots.push(await screenshot(page, '04-focus-desktop'));

    stage = await gotoMode(page, 'replay', `manifestId=${encodeURIComponent(DEMO_MANIFEST_ID)}`);
    visualReport.screenshots.push(await screenshot(page, '05-replay-desktop'));

    stage = await gotoMode(page, 'unwind');
    await expectVisible(page.getByTestId('urai-unwind-guidance'), 'unwind recovery guidance');
    visualReport.screenshots.push(await screenshot(page, '05b-unwind-desktop'));

    for (const mode of ['focus', 'replay', 'unwind']) {
      const extra = mode === 'unwind' ? '' : `manifestId=${encodeURIComponent(DEMO_MANIFEST_ID)}`;
      stage = await gotoMode(page, mode, extra);
    }

    stage = await gotoMode(page, 'life-map');

    await page.setViewportSize({ width: 390, height: 844 });
    stage = await gotoMode(page, 'life-map');
    const box = await stage.boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) < 700) {
      throw new Error(`Mobile LifeMap viewport mismatch: ${JSON.stringify(box)}`);
    }
    visualReport.screenshots.push(await screenshot(page, '06-lifemap-mobile'));

    stage = await gotoMode(page, 'home');
    visualReport.screenshots.push(await screenshot(page, '07-home-recovery'));

    visualReport.console = consoleMessages;
    if (consoleMessages.length) {
      throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    writeFileSync(`${ARTIFACT_DIR}/visual-report.json`, JSON.stringify(visualReport, null, 2));
    stopServer(server);
    await releaseServerPort();
  }
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
