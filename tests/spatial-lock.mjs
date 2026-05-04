import playwright from '../urai-tier1/node_modules/playwright/index.js';
const { chromium } = playwright;
import { spawn } from 'node:child_process';
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

async function expectVisible(locator, label) {
  if (!(await locator.isVisible())) throw new Error(`${label} is not visible`);
}

async function expectText(locator, text) {
  const body = await locator.textContent();
  if (!body || !body.includes(text)) throw new Error(`Expected text ${text}, received ${body}`);
}

async function screenshot(page, name) {
  const path = `${ARTIFACT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function collectConsole(page) {
  const messages = [];
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error') messages.push(`[${type}] ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message}`));
  return messages;
}

async function run() {
  const server = startServer();
  const visualReport = { screenshots: [], console: [] };
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = await collectConsole(page);

    await page.goto(`${BASE_URL}/home`);
    const stage = page.getByTestId('urai-spatial-stage');
    await expectAttr(stage, 'data-mode', 'home');
    await expectVisible(page.getByTestId('urai-home-scene'), 'home scene');
    await expectVisible(page.getByTestId('urai-orb-button'), 'home orb');
    await expectVisible(page.getByTestId('urai-home-body'), 'home body');
    visualReport.screenshots.push(await screenshot(page, '01-home-desktop'));

    await page.getByTestId('urai-orb-button').click();
    await expectAttr(stage, 'data-mode', 'ascent');
    await expectVisible(page.getByTestId('urai-ascent-cover'), 'ascent cover');
    visualReport.screenshots.push(await screenshot(page, '02-ascent-desktop'));
    await expectAttr(stage, 'data-mode', 'lifemap', 3000);
    await expectVisible(page.getByTestId('urai-lifemap-scene'), 'lifemap scene');
    await expectVisible(page.getByTestId('lifemap-starfield'), 'lifemap starfield');
    await expectText(page.locator('body'), 'LifeMap');
    await expectText(page.locator('body'), 'Visible Stars');
    await expectText(page.locator('body'), 'Private Spatial State');
    visualReport.screenshots.push(await screenshot(page, '03-lifemap-desktop'));

    await page.getByTestId('lifemap-node-pattern-01').click();
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'Pattern Recognition');
    await expectText(page.getByTestId('urai-focus-card'), 'Replay');
    visualReport.screenshots.push(await screenshot(page, '04-focus-desktop'));

    await page.getByRole('button', { name: /^Replay$/ }).first().click();
    await expectAttr(stage, 'data-mode', 'replay');
    await expectText(page.getByTestId('urai-replay-overlay'), 'REPLAY STREAM');
    await expectText(page.getByTestId('urai-replay-overlay'), 'MEMORY');
    visualReport.screenshots.push(await screenshot(page, '05-replay-desktop'));

    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'focus');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'lifemap');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'home');
    visualReport.screenshots.push(await screenshot(page, '06-return-home-desktop'));

    await page.goto(`${BASE_URL}/life-map`);
    await expectAttr(stage, 'data-mode', 'lifemap');
    await expectVisible(page.getByTestId('lifemap-node-pattern-01'), 'pattern-01 direct route node');

    await page.goto(`${BASE_URL}/?phase=lifemap`);
    await expectAttr(stage, 'data-mode', 'lifemap');
    await expectVisible(page.getByTestId('lifemap-starfield'), 'query phase starfield');

    await page.getByRole('button', { name: 'Filter' }).click();
    await expectVisible(page.getByTestId('lifemap-filter-panel'), 'filter panel');
    await page.getByRole('button', { name: 'Memory' }).click();
    await expectText(page.locator('body'), 'Visible Stars');

    await page.getByRole('button', { name: 'Era' }).click();
    await expectVisible(page.getByTestId('lifemap-era-panel'), 'era panel');
    await page.getByRole('button', { name: 'Shadow to Return' }).click();
    await expectText(page.locator('body'), 'Shadow to Return');

    await page.getByTestId('lifemap-node-memory-03').click();
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'This memory is still forming.');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/life-map`);
    await expectAttr(stage, 'data-mode', 'lifemap');
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
    console.log('URAI Spatial canonical LifeMap E2E and visual lock flow passed.');
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
