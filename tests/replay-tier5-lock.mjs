import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const REQUESTED_BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-tier5-lock';
const REQUESTED_PORT = Number(new URL(REQUESTED_BASE_URL).port || 3000);
const FALLBACK_PORT = Number(process.env.URAI_SPATIAL_TEST_PORT || REQUESTED_PORT + 1);

mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseUrlForPort(port) {
  const url = new URL(REQUESTED_BASE_URL);
  url.port = String(port);
  return url.toString().replace(/\/$/, '');
}

async function serverResponds(url) {
  try {
    const response = await fetch(url);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await serverResponds(url)) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startServer() {
  if (USE_EXISTING || (await serverResponds(REQUESTED_BASE_URL))) {
    return { child: null, baseUrl: REQUESTED_BASE_URL.replace(/\/$/, '') };
  }

  const baseUrl = baseUrlForPort(FALLBACK_PORT);
  const child = spawn('pnpm', ['--filter', 'urai-tier1', 'dev', '--port', String(FALLBACK_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`URAI Spatial dev server exited with ${code}`);
  });

  return { child, baseUrl };
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
  const server = await startServer();
  const baseUrl = server.baseUrl;
  const report = { screenshots: [], console: [], audits: [], baseUrl };

  try {
    await waitForServer(baseUrl);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = collectConsole(page);

    await page.goto(`${baseUrl}/life-map`);

    const stage = page.getByTestId('urai-scene-stage');

    await expectAttr(stage, 'data-scene-mode', 'life-map', 5000);
    await expectVisible(page.getByTestId('lifemap-node-seed-memory-bloom'), 'seed memory bloom node');

    await page.getByTestId('lifemap-node-seed-memory-bloom').click();

    await expectAttr(stage, 'data-scene-mode', 'focus');
    await expectVisible(page.getByTestId('urai-focus-action-panel'), 'focus action panel');
    await expectText(page.getByTestId('urai-focus-action-panel'), 'Start Replay');

    report.screenshots.push(await screenshot(page, '01-focus-memory-bloom'));

    await page.getByRole('button', { name: 'Start Replay' }).click();
    await page.waitForURL(/\/replay\?manifestId=seed-memory-bloom/);

    const replay = page.getByTestId('cinematic-replay-client');

    await expectVisible(replay, 'cinematic replay client');
    await expectAttr(replay, 'data-replay-phase', 'replay_playing');
    await expectVisible(page.getByTestId('urai-replay-timeline'), 'replay timeline');
    await expectVisible(page.getByTestId('urai-replay-meta-panel'), 'replay meta panel');
    await expectVisible(page.getByTestId('urai-replay-phase-rings'), 'replay phase rings');

    await expectText(replay, 'Pattern Replay');
    await expectText(replay, 'Source: LifeMap · Seed Memory Bloom');
    await expectText(replay, 'Center Replay');
    await expectText(replay, 'Pause');
    await expectText(replay, 'Esc returns to Focus');
    await expectText(replay, 'Return to Focus');
    await expectText(replay, 'Why this appeared');
    await expectText(replay, 'Private · Only visible to you');
    await expectText(replay, 'Save');
    await expectText(replay, 'Hide');
    await expectText(replay, 'Correct');

    await expectMissingText(replay, 'Unwind');
    await expectMissingText(replay, 'Unwind to Focus');
    await expectMissingText(replay, 'ESC unwinds to focus');
    await expectMissingText(replay, 'READINESS 87%');
    await expectMissingText(replay, 'INTENSITY 88%');
    await expectMissingText(replay, 'BOUNDARY 75%');

    report.screenshots.push(await screenshot(page, '02-memory-theater-replay'));

    await page.getByRole('button', { name: 'Pause replay' }).click();

    await expectAttr(replay, 'data-replay-phase', 'replay_paused');
    await expectText(replay, 'Play');

    await page.keyboard.press('Escape');
    await page.waitForURL(/\/focus\?manifestId=seed-memory-bloom/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/replay?manifestId=seed-memory-bloom`);

    const mobileReplay = page.getByTestId('cinematic-replay-client');

    await expectVisible(mobileReplay, 'mobile cinematic replay client');
    await expectVisible(page.getByTestId('urai-replay-timeline'), 'mobile replay timeline');
    await expectVisible(page.getByTestId('urai-replay-meta-panel'), 'mobile replay meta panel');
    await expectText(mobileReplay, 'Pattern Replay');
    await expectText(mobileReplay, 'Source: LifeMap · Seed Memory Bloom');

    const box = await mobileReplay.boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) !== 844) {
      throw new Error(`Mobile replay viewport mismatch: ${JSON.stringify(box)}`);
    }

    report.screenshots.push(await screenshot(page, '03-mobile-memory-theater-replay'));

    await browser.close();

    report.console = consoleMessages;

    if (consoleMessages.length) {
      throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    }

    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    console.log(`URAI Replay Tier 5 Memory Theater validation passed at ${baseUrl}.`);
  } catch (error) {
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (server.child) server.child.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});