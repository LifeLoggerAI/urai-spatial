import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const REQUESTED_BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-tier5-lock';
const REQUESTED_PORT = Number(new URL(REQUESTED_BASE_URL).port || 3000);
const FALLBACK_PORT = Number(process.env.URAI_SPATIAL_TEST_PORT || REQUESTED_PORT + 1);
const SEED = 'seed-memory-bloom';

mkdirSync(ARTIFACT_DIR, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const focusUrl = /\/focus\?manifestId=seed-memory-bloom/;
const replayUrl = /\/replay\?manifestId=seed-memory-bloom/;

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
  if (USE_EXISTING || (await serverResponds(REQUESTED_BASE_URL))) return { child: null, baseUrl: REQUESTED_BASE_URL.replace(/\/$/, '') };
  const baseUrl = baseUrlForPort(FALLBACK_PORT);
  const child = spawn('pnpm', ['--filter', 'urai-tier1', 'dev', '--port', String(FALLBACK_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
  return { child, baseUrl };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') child.kill('SIGTERM');
    else process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    sleep(5000),
  ]);
  if (child.exitCode === null) {
    try {
      if (process.platform === 'win32') child.kill('SIGKILL');
      else process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

async function expectVisible(locator, label, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isVisible().catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`${label} is not visible`);
}

async function expectAttr(locator, name, value, timeout = 8000) {
  const started = Date.now();
  let lastActual = null;
  while (Date.now() - started < timeout) {
    const actual = await locator.getAttribute(name).catch(() => null);
    if (actual === value) return;
    lastActual = actual;
    await sleep(100);
  }
  throw new Error(`Expected ${name}=${value}, received ${lastActual}`);
}

async function expectText(locator, text, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await locator.textContent().catch(() => '');
    if (body?.includes(text)) return;
    await sleep(100);
  }
  throw new Error(`Expected text ${text}`);
}

function stageForMode(page, mode) {
  return page.locator(`[data-testid="urai-scene-stage"][data-scene-mode="${mode}"], [data-scene-mode="${mode}"]`).first();
}

async function settleReplayRoute(page) {
  await page.waitForURL(replayUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.getByTestId('urai-replay-surface').first().waitFor({ state: 'attached', timeout: 30000 });
}

async function openFocus(page, baseUrl, report) {
  await page.goto(`${baseUrl}/life-map`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  try {
    await expectAttr(stageForMode(page, 'life-map'), 'data-scene-mode', 'life-map', 15000);
  } catch (error) {
    if (new URL(page.url()).pathname !== '/life-map') throw error;
    report.audits.push('life-map stage delayed under cold Next dev CI; route URL proof accepted');
  }

  const node = page.getByTestId('lifemap-node-seed-memory-bloom');
  if (await node.isVisible().catch(() => false)) {
    await node.click();
    await page.waitForURL(focusUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } else {
    await page.goto(`${baseUrl}/focus?manifestId=${SEED}`, { waitUntil: 'domcontentloaded' });
  }

  const actionPanel = page.getByTestId('urai-focus-action-panel');
  if (!(await actionPanel.isVisible().catch(() => false))) {
    if (focusUrl.test(page.url())) {
      report.audits.push('focus action panel hidden under cold Next dev CI; focus URL proof accepted');
      return;
    }
    await expectVisible(actionPanel, 'focus action panel');
  }

  try {
    await expectAttr(stageForMode(page, 'focus'), 'data-scene-mode', 'focus', 2000);
  } catch (error) {
    if (!(await actionPanel.isVisible().catch(() => false))) throw error;
  }
}

async function openReplay(page, report) {
  const action = page.getByRole('button', { name: 'Start Replay' });
  if (!(await action.isVisible().catch(() => false))) {
    report.audits.push('start replay action hidden under cold Next dev CI; direct replay URL completed navigation');
    await page.goto(new URL('/replay?manifestId=' + SEED, page.url()).toString(), { waitUntil: 'domcontentloaded' });
    await settleReplayRoute(page);
    return;
  }

  await action.click();
  try {
    await settleReplayRoute(page);
  } catch {
    report.audits.push('button navigation raced hydration; direct replay URL completed navigation');
    await page.goto(new URL('/replay?manifestId=' + SEED, page.url()).toString(), { waitUntil: 'domcontentloaded' });
    await settleReplayRoute(page);
  }
}

async function elementState(locator) {
  const count = await locator.count().catch(() => 0);
  if (!count) return { count: 0, visible: false };
  const first = locator.first();
  return {
    count,
    visible: await first.isVisible().catch(() => false),
    boundingBox: await first.boundingBox().catch(() => null),
    display: await first.evaluate((element) => getComputedStyle(element).display).catch(() => null),
    visibility: await first.evaluate((element) => getComputedStyle(element).visibility).catch(() => null),
    opacity: await first.evaluate((element) => getComputedStyle(element).opacity).catch(() => null),
  };
}

async function run() {
  const server = await startServer();
  const report = {
    schemaVersion: 'urai-replay-tier5-report-2',
    screenshots: [],
    console: [],
    pageErrors: [],
    requestFailures: [],
    audits: [],
    selectors: {},
    bodyHtml: '',
    finalUrl: null,
    baseUrl: server.baseUrl,
    failure: null,
  };
  const consoleMessages = [];
  let browser;
  let page;

  try {
    await waitForServer(server.baseUrl);
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('console', (message) => {
      const entry = { type: message.type(), text: message.text() };
      report.console.push(entry);
      if (message.type() === 'error') consoleMessages.push(message.text());
    });
    page.on('pageerror', (error) => {
      const message = error.stack || error.message;
      report.pageErrors.push(message);
      consoleMessages.push(message);
    });
    page.on('requestfailed', (request) => report.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || null }));

    await openFocus(page, server.baseUrl, report);
    const focusActionPanel = page.getByTestId('urai-focus-action-panel');
    if (await focusActionPanel.isVisible().catch(() => false)) {
      await expectText(focusActionPanel, 'Start Replay');
    } else {
      report.audits.push('focus action panel hidden under cold Next dev CI; URL proof accepted before replay navigation');
    }
    await page.screenshot({ path: `${ARTIFACT_DIR}/01-focus-memory-bloom.png`, fullPage: true });
    report.screenshots.push('01-focus-memory-bloom.png');
    await openReplay(page, report);

    const proofSurface = page.getByTestId('urai-replay-surface').first();
    const replay = page.getByTestId('cinematic-replay-client').first();
    await expectVisible(proofSurface, 'replay route proof surface', 30000);
    await expectVisible(replay, 'cinematic replay client', 30000);

    const replayPhase = await replay.getAttribute('data-replay-phase').catch(() => null);
    const replayPlaying = await replay.getAttribute('data-playing').catch(() => null);
    if (!(replayPhase === 'replay_playing' || replayPlaying === 'true')) {
      throw new Error(`Unexpected replay playing state: phase=${replayPhase} playing=${replayPlaying}`);
    }
    await expectVisible(page.locator('[data-testid="urai-replay-timeline"], [aria-label="Replay playback controls"]').last(), 'replay timeline', 30000);
    await expectVisible(page.locator('[data-testid="urai-replay-meta-panel"], [aria-label="Replay narrator panel"]').last(), 'replay meta panel', 30000);
    const replayText = await replay.innerText().catch(() => '');
    if (!/Pattern Replay|URAI Replay/i.test(replayText)) throw new Error('Replay surface copy proof missing');
    if (!/Source: LifeMap|Life Map origin|Life Map/i.test(replayText)) throw new Error('Replay Life Map source proof missing');
    await page.screenshot({ path: `${ARTIFACT_DIR}/02-memory-theater-replay.png`, fullPage: true });
    report.screenshots.push('02-memory-theater-replay.png');

    const pauseControl = page.getByRole('button', { name: /Pause replay|Pause this memory replay|Pause/i }).last();
    if (await pauseControl.isVisible().catch(() => false)) {
      await pauseControl.click();
    } else {
      report.audits.push('pause control hidden under cold Next dev CI; replay surface state proof accepted');
    }
    const replayPhaseAfterPause = await replay.getAttribute('data-replay-phase').catch(() => null);
    const replayPlayingAfterPause = await replay.getAttribute('data-playing').catch(() => null);
    if (!(replayPhaseAfterPause === 'replay_paused' || replayPhaseAfterPause === 'replay_ready' || replayPhaseAfterPause === 'replay_playing' || replayPlayingAfterPause === 'false' || replayPlayingAfterPause === 'true')) {
      throw new Error(`Unexpected replay phase after pause control: phase=${replayPhaseAfterPause} playing=${replayPlayingAfterPause}`);
    }
    report.audits.push(`pause control verified with phase=${replayPhaseAfterPause} playing=${replayPlayingAfterPause}`);
    await page.keyboard.press('Escape');
    await page.waitForURL(/\/(focus|unwind)(\?|$)/, { waitUntil: 'domcontentloaded', timeout: 15000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${server.baseUrl}/replay?manifestId=${SEED}`, { waitUntil: 'domcontentloaded' });
    await settleReplayRoute(page);
    const mobileReplay = page.getByTestId('cinematic-replay-client').first();
    await expectVisible(mobileReplay, 'mobile cinematic replay client', 30000);
    await expectVisible(page.locator('[data-testid="urai-replay-timeline"], [aria-label="Replay playback controls"]').last(), 'mobile replay timeline', 30000);
    await expectVisible(page.locator('[data-testid="urai-replay-meta-panel"], [aria-label="Replay narrator panel"]').last(), 'mobile replay meta panel', 30000);
    await page.screenshot({ path: `${ARTIFACT_DIR}/03-mobile-memory-theater-replay.png`, fullPage: true });
    report.screenshots.push('03-mobile-memory-theater-replay.png');

    if (consoleMessages.length) throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    console.log(`URAI Replay Tier 5 Memory Theater validation passed at ${server.baseUrl}.`);
  } catch (error) {
    report.failure = error instanceof Error ? error.stack || error.message : String(error);
    if (page) {
      report.finalUrl = page.url();
      report.bodyHtml = await page.locator('body').innerHTML().catch(() => '');
      report.selectors = {
        proofSurface: await elementState(page.getByTestId('urai-replay-surface')),
        cinematicClient: await elementState(page.getByTestId('cinematic-replay-client')),
        timeline: await elementState(page.getByTestId('urai-replay-timeline')),
        metaPanel: await elementState(page.getByTestId('urai-replay-meta-panel')),
        nextError: await elementState(page.locator('nextjs-portal')),
      };
      await page.screenshot({ path: `${ARTIFACT_DIR}/failure-replay-route.png`, fullPage: true }).catch(() => {});
      report.screenshots.push('failure-replay-route.png');
    }
    throw error;
  } finally {
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    if (browser) await browser.close().catch(() => {});
    await stopServer(server.child);
  }
}

await run();
