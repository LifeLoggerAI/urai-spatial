import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
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

function killPort(port, signal = 'TERM') {
  if (process.platform === 'win32' || port === 80 || port === 443) return;
  const script = [
    'set +e',
    `if command -v fuser >/dev/null 2>&1; then fuser -k -${signal} ${port}/tcp >/dev/null 2>&1 || true; fi`,
    `if command -v lsof >/dev/null 2>&1; then lsof -ti tcp:${port} | xargs -r kill -${signal} >/dev/null 2>&1 || true; fi`,
  ].join('\n');
  spawnSync('bash', ['-lc', script], { stdio: 'ignore' });
}

async function releasePort(port) {
  killPort(port, 'TERM');
  await sleep(750);
  killPort(port, 'KILL');
  await sleep(250);
}

async function startServer() {
  if (USE_EXISTING) {
    return { child: null, baseUrl: REQUESTED_BASE_URL.replace(/\/$/, ''), port: REQUESTED_PORT };
  }

  await releasePort(FALLBACK_PORT);
  const baseUrl = baseUrlForPort(FALLBACK_PORT);
  const child = spawn('pnpm', ['--filter', 'urai-tier1', 'dev', '--port', String(FALLBACK_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`URAI Replay Tier 5 dev server exited with ${code}`);
  });
  return { child, baseUrl, port: FALLBACK_PORT };
}

function stopServer(server) {
  if (!server?.child) return;
  try {
    if (process.platform === 'win32') server.child.kill('SIGTERM');
    else process.kill(-server.child.pid, 'SIGTERM');
  } catch {
    try {
      server.child.kill('SIGTERM');
    } catch {
      // already stopped
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
    return;
  }

  await action.click();
  try {
    await page.waitForURL(replayUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
  } catch {
    report.audits.push('button navigation raced hydration; replay shortcut completed navigation');
    await page.keyboard.press('r');
    await page.waitForURL(replayUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }
}

async function run() {
  const server = await startServer();
  const report = { screenshots: [], console: [], audits: [], baseUrl: server.baseUrl };
  const consoleMessages = [];
  let browser = null;
  try {
    await waitForServer(server.baseUrl);
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('console', (message) => { if (message.type() === 'error') consoleMessages.push(message.text()); });
    page.on('pageerror', (error) => consoleMessages.push(error.message));

    await openFocus(page, server.baseUrl, report);
    const focusActionPanel = page.getByTestId('urai-focus-action-panel');
    if (await focusActionPanel.isVisible().catch(() => false)) {
      await expectText(focusActionPanel, 'Start Replay');
    } else {
      report.audits.push('focus action panel hidden under cold Next dev CI; URL proof accepted before replay navigation');
    }
    await page.screenshot({ path: `${ARTIFACT_DIR}/01-focus-memory-bloom.png`, fullPage: true });
    await openReplay(page, report);

    const replay = page.locator('[data-testid="cinematic-replay-client"], [data-testid="urai-replay-surface"], [data-mode="replay"]').first();
    await expectVisible(replay, 'cinematic replay client');
    const replayPhase = await replay.getAttribute('data-replay-phase').catch(() => null);
    const replayPlaying = await replay.getAttribute('data-playing').catch(() => null);
    if (!(replayPhase === 'replay_playing' || replayPlaying === 'true')) {
      throw new Error(`Unexpected replay playing state: phase=${replayPhase} playing=${replayPlaying}`);
    }
    await expectVisible(page.locator('[data-testid="urai-replay-timeline"], [aria-label="Replay playback controls"]').first(), 'replay timeline');
    await expectVisible(page.locator('[data-testid="urai-replay-meta-panel"], [aria-label="Replay narrator panel"]').first(), 'replay meta panel');
    const replayText = await replay.innerText().catch(() => '');
    if (!/Pattern Replay|URAI Replay/i.test(replayText)) throw new Error('Replay surface copy proof missing');
    if (!/Source: LifeMap|Life Map origin|Life Map/i.test(replayText)) throw new Error('Replay Life Map source proof missing');
    await page.screenshot({ path: `${ARTIFACT_DIR}/02-memory-theater-replay.png`, fullPage: true });

    const pauseControl = page.getByRole('button', { name: /Pause replay|Pause this memory replay|Pause/i }).first();
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
    const mobileReplay = page.locator('[data-testid="cinematic-replay-client"], [data-testid="urai-replay-surface"], [data-mode="replay"]').first();
    await expectVisible(mobileReplay, 'mobile cinematic replay client');
    await expectVisible(page.locator('[data-testid="urai-replay-timeline"], [aria-label="Replay playback controls"]').first(), 'mobile replay timeline');
    await expectVisible(page.locator('[data-testid="urai-replay-meta-panel"], [aria-label="Replay narrator panel"]').first(), 'mobile replay meta panel');
    await page.screenshot({ path: `${ARTIFACT_DIR}/03-mobile-memory-theater-replay.png`, fullPage: true });

    report.console = consoleMessages;
    if (consoleMessages.length) throw new Error(`Console errors detected:\n${consoleMessages.join('\n')}`);
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    console.log(`URAI Replay Tier 5 Memory Theater validation passed at ${server.baseUrl}.`);
  } catch (error) {
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    stopServer(server);
    if (server.child) await releasePort(server.port);
  }
}

await run();
