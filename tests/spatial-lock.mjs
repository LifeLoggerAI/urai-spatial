import playwright from 'playwright';
const { chromium } = playwright;
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://localhost:3000';
const HOME_PATH = process.env.URAI_SPATIAL_HOME_PATH || '/';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-lock';
const DEMO_MANIFEST_ID = 'seed-memory-bloom';

mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modePath(mode, extra = '') {
  const prefix = mode === 'home' ? HOME_PATH : `/?mode=${encodeURIComponent(mode)}`;
  if (!extra) return prefix;
  return `${prefix}${prefix.includes('?') ? '&' : '?'}${extra}`;
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

function startServer() {
  if (USE_EXISTING) return null;
  const child = spawn('pnpm', ['--dir', 'urai-tier1', 'dev', '--port', '3000'], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`URAI Spatial dev server exited with ${code}`);
  });
  return child;
}

function assertPlaywrightRuntimeReady() {
  const result = spawnSync('pnpm', ['exec', 'node', '-e', `
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

  if (result.status === 0) return;

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  throw new Error([
    'Playwright Chromium cannot launch because this environment is missing browser runtime dependencies.',
    output,
    'Fix:',
    '  pnpm playwright:install',
    '  pnpm playwright:install-deps',
    'or run:',
    '  pnpm exec playwright install chromium',
    '  pnpm exec playwright install-deps chromium',
    'The failing log commonly looks like: libglib-2.0.so.0: cannot open shared object file.',
  ].filter(Boolean).join('\n'));
}

async function expectAttr(locator, name, value, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const actual = await locator.getAttribute(name).catch(() => null);
    if (actual === value) return;
    await sleep(100);
  }
  const actual = await locator.getAttribute(name).catch(() => null);
  throw new Error(`Expected ${name}=${value}, received ${actual}`);
}

async function expectVisible(locator, label, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isVisible().catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`${label} is not visible`);
}

async function expectAnyVisible(candidates, label, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const candidate of candidates) {
      if (await candidate.locator.isVisible().catch(() => false)) return candidate.name;
    }
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

async function expectLifeMapReadyOrGate(page) {
  const visibleState = await expectAnyVisible([
    { name: 'lifemap guidance', locator: page.getByTestId('urai-lifemap-guidance') },
    { name: 'tier gate panel', locator: page.getByTestId('urai-tier-gate-panel') },
  ], 'lifemap guidance or tier gate panel');

  if (visibleState === 'lifemap guidance') {
    await expectText(page.locator('body'), 'Click a star to open memory focus');
  }
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

async function gotoMode(page, stage, mode, extra = '') {
  await page.goto(`${BASE_URL}${modePath(mode, extra)}`);
  await expectAttr(stage, 'data-scene-mode', mode);
}

async function run() {
  assertPlaywrightRuntimeReady();
  const server = startServer();
  const visualReport = { screenshots: [], console: [] };
  try {
    await waitForServer(`${BASE_URL}${HOME_PATH}`);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = collectConsole(page);
    const stage = page.getByTestId('urai-scene-stage');

    await gotoMode(page, stage, 'home');
    await expectVisible(stage, 'sky-only home stage');
    await expectHiddenOrMissing(page.getByTestId('urai-orb-button'), 'home orb');
    await expectHiddenOrMissing(page.getByTestId('urai-sky-guidance'), 'home guidance');
    await expectHiddenOrMissing(page.getByTestId('urai-camera-reset'), 'home camera reset');
    await expectNoText(page.locator('body'), 'Your inner weather');
    await expectNoText(page.locator('body'), 'Begin Ascent');
    visualReport.screenshots.push(await screenshot(page, '01-home-sky-only-desktop'));

    await gotoMode(page, stage, 'ascent');
    await expectVisible(page.getByTestId('urai-ascent-guidance'), 'ascent guidance');
    visualReport.screenshots.push(await screenshot(page, '02-ascent-desktop'));

    await gotoMode(page, stage, 'life-map');
    await expectLifeMapReadyOrGate(page);
    visualReport.screenshots.push(await screenshot(page, '03-lifemap-desktop'));

    await gotoMode(page, stage, 'focus', `manifestId=${encodeURIComponent(DEMO_MANIFEST_ID)}`);
    await expectVisible(page.getByTestId('urai-focus-action-panel'), 'focus action panel');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Start Replay');
    visualReport.screenshots.push(await screenshot(page, '04-focus-desktop'));

    await gotoMode(page, stage, 'replay', `manifestId=${encodeURIComponent(DEMO_MANIFEST_ID)}`);
    await expectVisible(page.getByTestId('urai-focus-action-panel'), 'replay action panel');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Replay Stream');
    visualReport.screenshots.push(await screenshot(page, '05-replay-desktop'));

    await gotoMode(page, stage, 'unwind');
    await expectVisible(page.getByTestId('urai-unwind-guidance'), 'unwind recovery guidance');
    visualReport.screenshots.push(await screenshot(page, '05b-unwind-desktop'));

    for (const mode of ['focus', 'replay', 'unwind']) {
      const extra = mode === 'unwind' ? '' : `manifestId=${encodeURIComponent(DEMO_MANIFEST_ID)}`;
      await gotoMode(page, stage, mode, extra);
    }

    await gotoMode(page, stage, 'life-map');
    await expectLifeMapReadyOrGate(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoMode(page, stage, 'life-map');
    const box = await page.getByTestId('urai-scene-stage').boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) < 700) {
      throw new Error(`Mobile LifeMap viewport mismatch: ${JSON.stringify(box)}`);
    }
    visualReport.screenshots.push(await screenshot(page, '07-lifemap-mobile'));

    await browser.close();
    visualReport.console = consoleMessages;
    if (consoleMessages.length) {
      throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    }
    writeFileSync(`${ARTIFACT_DIR}/visual-audit-report.json`, JSON.stringify(visualReport, null, 2));
    console.log('URAI Spatial canonical root-mode E2E and visual lock flow passed.');
  } catch (error) {
    writeFileSync(`${ARTIFACT_DIR}/visual-audit-report.json`, JSON.stringify(visualReport, null, 2));
    throw error;
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
