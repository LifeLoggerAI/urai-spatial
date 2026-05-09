import playwright from 'playwright';
const { chromium } = playwright;
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-lock';

mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      // keep waiting
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startServer() {
  if (USE_EXISTING) return null;
  const child = spawn('pnpm', ['--filter', 'urai-tier1', 'dev', '--port', '3000'], {
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

async function run() {
  assertPlaywrightRuntimeReady();
  const server = startServer();
  const visualReport = { screenshots: [], console: [] };
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = collectConsole(page);
    const stage = page.getByTestId('urai-scene-stage');

    await page.goto(`${BASE_URL}/home`);
    await expectAttr(stage, 'data-scene-mode', 'home');
    await expectVisible(stage, 'sky-only home stage');
    await expectHiddenOrMissing(page.getByTestId('urai-orb-button'), 'home orb');
    await expectHiddenOrMissing(page.getByTestId('urai-sky-guidance'), 'home guidance');
    await expectHiddenOrMissing(page.getByTestId('urai-camera-reset'), 'home camera reset');
    await expectNoText(page.locator('body'), 'Your inner weather');
    await expectNoText(page.locator('body'), 'Begin Ascent');
    visualReport.screenshots.push(await screenshot(page, '01-home-sky-only-desktop'));

    await stage.click({ position: { x: 700, y: 500 } });
    await expectAttr(stage, 'data-scene-mode', 'ascent');
    await expectVisible(page.getByTestId('urai-ascent-scene'), 'ascent scene');
    visualReport.screenshots.push(await screenshot(page, '02-ascent-desktop'));

    await expectAttr(stage, 'data-scene-mode', 'life-map', 5000);
    await expectVisible(page.getByTestId('urai-lifemap-scene'), 'lifemap scene');
    await expectVisible(page.getByTestId('lifemap-starfield'), 'lifemap starfield');
    await expectText(page.locator('body'), 'Life Map');
    await expectText(page.locator('body'), 'Remembered moments are visible');
    visualReport.screenshots.push(await screenshot(page, '03-lifemap-desktop'));

    await page.getByTestId('lifemap-node-seed-memory-bloom').click();
    await expectAttr(stage, 'data-scene-mode', 'focus');
    await expectVisible(page.getByTestId('urai-focus-action-panel'), 'focus action panel');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Memory Bloom');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Start Replay');
    visualReport.screenshots.push(await screenshot(page, '04-focus-desktop'));

    await page.getByRole('button', { name: 'Start Replay' }).click();
    await expectAttr(stage, 'data-scene-mode', 'replay');
    await expectVisible(page.getByTestId('urai-focus-scene'), 'replay visual scene');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Replay Stream');
    visualReport.screenshots.push(await screenshot(page, '05-replay-desktop'));

    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-scene-mode', 'focus');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-scene-mode', 'life-map');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-scene-mode', 'home');
    visualReport.screenshots.push(await screenshot(page, '06-return-home-desktop'));

    await page.goto(`${BASE_URL}/life-map`);
    await expectAttr(stage, 'data-scene-mode', 'life-map');
    await expectVisible(page.getByTestId('lifemap-node-seed-memory-bloom'), 'direct route demo node');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/life-map`);
    await expectAttr(stage, 'data-scene-mode', 'life-map');
    const box = await page.getByTestId('urai-lifemap-scene').boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) !== 844) {
      throw new Error(`Mobile LifeMap viewport mismatch: ${JSON.stringify(box)}`);
    }
    visualReport.screenshots.push(await screenshot(page, '07-lifemap-mobile'));

    await browser.close();
    visualReport.console = consoleMessages;
    if (consoleMessages.length) {
      throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    }
    writeFileSync(`${ARTIFACT_DIR}/visual-audit-report.json`, JSON.stringify(visualReport, null, 2));
    console.log('URAI Spatial canonical Life Map E2E and visual lock flow passed.');
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
