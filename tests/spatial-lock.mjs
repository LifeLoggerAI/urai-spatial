import playwright from '../urai-tier1/node_modules/playwright/index.js';
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
  const result = spawnSync('pnpm', ['--filter', 'urai-tier1', 'exec', 'node', '-e', `
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
  throw new Error(['Playwright Chromium cannot launch.', output].filter(Boolean).join('\n'));
}

async function expectVisible(locator, label, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isVisible().catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`${label} is not visible`);
}

async function expectText(locator, text, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await locator.textContent().catch(() => '');
    if (body?.includes(text)) return;
    await sleep(100);
  }
  const body = await locator.textContent().catch(() => '');
  throw new Error(`Expected text ${text}, received ${body}`);
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
    const text = message.text();
    if (type === 'error' && !text.includes('WebGL')) messages.push(`[${type}] ${text}`);
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

    await page.goto(`${BASE_URL}/life-map`);
    await expectVisible(page.getByTestId('urai-lifemap-3d-scene'), 'LifeMap 3D scene');
    await expectText(page.locator('body'), 'LIFE MAP 3D V1');
    await expectText(page.locator('body'), 'A living universe of remembered moments.');
    visualReport.screenshots.push(await screenshot(page, '01-lifemap-3d-desktop'));

    await expectText(page.locator('body'), 'Memory Bloom');
    await page.getByText('Memory Bloom').first().click();
    await expectText(page.locator('body'), 'FOCUS STAR');
    await expectText(page.locator('body'), 'Open Focus');
    visualReport.screenshots.push(await screenshot(page, '02-lifemap-3d-focus'));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/life-map`);
    await expectVisible(page.getByTestId('urai-lifemap-3d-scene'), 'mobile LifeMap 3D scene');
    visualReport.screenshots.push(await screenshot(page, '03-lifemap-3d-mobile'));

    await browser.close();
    visualReport.console = consoleMessages;
    if (consoleMessages.length) {
      throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    }
    writeFileSync(`${ARTIFACT_DIR}/visual-audit-report.json`, JSON.stringify(visualReport, null, 2));
    console.log('URAI LifeMap 3D route visual lock passed.');
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
