import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-tier5-lock';

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

async function expectMissingText(locator, text, timeout = 1200) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await locator.textContent().catch(() => '');
    if (body?.includes(text)) throw new Error(`Unexpected text ${text} found in ${body}`);
    await sleep(100);
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
  const server = startServer();
  const report = { screenshots: [], console: [], audits: [] };

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = collectConsole(page);
    const stage = page.getByTestId('urai-scene-stage');

    await page.goto(`${BASE_URL}/life-map`);
    await expectAttr(stage, 'data-scene-mode', 'life-map', 5000);
    await expectVisible(page.getByTestId('lifemap-node-seed-memory-bloom'), 'seed memory bloom node');
    await page.getByTestId('lifemap-node-seed-memory-bloom').click();
    await expectAttr(stage, 'data-scene-mode', 'focus');
    await expectVisible(page.getByTestId('urai-focus-action-panel'), 'focus action panel');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Start Replay');
    report.screenshots.push(await screenshot(page, '01-focus-memory-bloom'));

    await page.getByRole('button', { name: 'Start Replay' }).click();
    await page.waitForURL(/\/replay\?manifestId=seed-memory-bloom/);
    await expectAttr(stage, 'data-scene-mode', 'replay');
    await expectAttr(stage, 'data-replay-segment', 'memory');
    await expectVisible(page.getByTestId('urai-replay-timeline'), 'replay timeline');
    await expectVisible(page.getByTestId('urai-replay-meta-panel'), 'replay meta panel');
    await expectText(stage, 'Pattern Replay');
    await expectText(stage, 'Pause');
    await expectText(stage, 'Esc returns to Focus');
    await expectText(stage, 'Return to Focus');
    await expectText(stage, 'Why this appeared');
    await expectText(stage, 'Private · Only visible to you');
    await expectText(stage, 'Save');
    await expectText(stage, 'Hide');
    await expectText(stage, 'Correct');
    await expectMissingText(stage, 'Unwind to Focus');
    await expectMissingText(stage, 'ESC unwinds to focus');
    await expectMissingText(stage, 'READINESS 87%');
    await expectMissingText(stage, 'INTENSITY 88%');
    await expectMissingText(stage, 'BOUNDARY 75%');
    report.screenshots.push(await screenshot(page, '02-memory-theater-replay'));

    await page.getByRole('button', { name: 'Pause replay' }).click();
    await expectAttr(stage, 'data-replay-phase', 'replay_paused');
    await expectText(stage, 'Play');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-scene-mode', 'focus');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-scene-mode', 'life-map');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-scene-mode', 'home');
    report.screenshots.push(await screenshot(page, '03-replay-return-home'));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/replay?manifestId=seed-memory-bloom`);
    await expectAttr(stage, 'data-scene-mode', 'replay');
    await expectVisible(page.getByTestId('urai-replay-timeline'), 'mobile replay timeline');
    await expectVisible(page.getByTestId('urai-replay-meta-panel'), 'mobile replay meta panel');
    await expectText(stage, 'Pattern Replay');
    const box = await stage.boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) !== 844) {
      throw new Error(`Mobile replay viewport mismatch: ${JSON.stringify(box)}`);
    }
    report.screenshots.push(await screenshot(page, '04-mobile-memory-theater-replay'));

    await browser.close();
    report.console = consoleMessages;
    if (consoleMessages.length) throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    console.log('URAI Replay Tier 5 Memory Theater validation passed.');
  } catch (error) {
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
