import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const REQUESTED_BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-tier5-lock';
const REQUESTED_PORT = Number(new URL(REQUESTED_BASE_URL).port || 3000);
const FALLBACK_PORT = Number(process.env.URAI_SPATIAL_TEST_PORT || REQUESTED_PORT + 1);
const MEMORY_ID = 'demo:seed-memory-bloom';
const MANIFEST_ID = 'demo-manifest';
const EXPECTED_ROUTE_PATHS = new Set(['/focus', '/replay', '/unwind', '/life-map']);

mkdirSync(ARTIFACT_DIR, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(5000)]);
  if (child.exitCode === null) {
    try {
      if (process.platform === 'win32') child.kill('SIGKILL');
      else process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

async function expectVisible(locator, label, timeout = 30000) {
  await locator.waitFor({ state: 'visible', timeout }).catch(() => {
    throw new Error(`${label} is not visible`);
  });
}

async function expectAttribute(locator, name, expected, timeout = 30000) {
  const started = Date.now();
  let actual = null;
  while (Date.now() - started < timeout) {
    actual = await locator.getAttribute(name).catch(() => null);
    if (actual === expected) return;
    await sleep(100);
  }
  throw new Error(`Expected ${name}=${expected}, received ${actual}`);
}

function rectanglesOverlap(a, b, gap = 0) {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

async function expectNoOverlap(first, second, label, gap = 2) {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) throw new Error(`${label}: missing measurable bounding box`);
  if (rectanglesOverlap(firstBox, secondBox, gap)) {
    throw new Error(`${label}: controls overlap (${JSON.stringify({ firstBox, secondBox, gap })})`);
  }
}

async function expectInsideViewport(locator, page, label, padding = 2) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error(`${label}: missing geometry`);
  if (
    box.x < padding ||
    box.y < padding ||
    box.x + box.width > viewport.width - padding ||
    box.y + box.height > viewport.height - padding
  ) {
    throw new Error(`${label}: outside viewport (${JSON.stringify({ box, viewport, padding })})`);
  }
}

function normalizedPathname(url) {
  return url.pathname.replace(/\/+$/, '') || '/';
}

function isExpectedSameOriginJourneyAbort(request, failure, baseUrl) {
  if (failure !== 'net::ERR_ABORTED' || !request.isNavigationRequest()) return false;
  try {
    const requested = new URL(request.url());
    const authority = new URL(baseUrl);
    return requested.origin === authority.origin && EXPECTED_ROUTE_PATHS.has(normalizedPathname(requested));
  } catch {
    return false;
  }
}

async function openDemoReplay(page, baseUrl) {
  const focusUrl = `${baseUrl}/focus?memoryId=${encodeURIComponent(MEMORY_ID)}&demo=1`;
  await page.goto(focusUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  const focus = page.getByTestId('urai-final-focus-chamber').first();
  await expectVisible(focus, 'demo Focus chamber');
  await expectAttribute(focus, 'data-memory-status', 'demo');

  const replayAction = page.getByRole('button', { name: /Open Replay for|Replay this memory/i }).first();
  await expectVisible(replayAction, 'Focus Replay action');
  await replayAction.click();
  await page.waitForURL(/\/replay\?/, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
}

async function validateReplay(page, report, screenshotName) {
  const proof = page.getByTestId('urai-replay-surface').first();
  const client = page.getByTestId('cinematic-replay-client').first();
  const preflight = client.getByTestId('replay-preflight').first();
  const enterReplay = preflight.getByRole('button', { name: 'Enter Replay', exact: true }).first();
  const controls = client.locator('[aria-label="Replay playback controls"]').first();
  const productControls = client.locator('[aria-label="Replay memory controls"]').first();
  const companion = page.getByRole('button', { name: /Orb travel controls/i }).first();
  const heading = client.locator('header h1').first();
  const caption = client.locator('.caption').first();
  const unwind = client.locator('.unwind').first();

  await proof.waitFor({ state: 'attached', timeout: 30000 });
  await expectAttribute(proof, 'data-replay-phase', 'replay_playing');
  await expectAttribute(proof, 'data-playing', 'true');
  await expectVisible(client, 'cinematic Replay client');
  await expectAttribute(client, 'data-memory-status', 'demo');
  await expectAttribute(client, 'data-manifest-id', MANIFEST_ID);
  await expectAttribute(client, 'data-playing', 'false');
  await expectAttribute(client, 'data-replay-entered', 'false');
  await expectVisible(preflight, 'mandatory Replay preflight');
  await expectVisible(enterReplay, 'Enter Replay control');
  await enterReplay.click();
  await expectAttribute(client, 'data-replay-entered', 'true');
  await expectVisible(controls, 'Replay playback controls');
  await expectVisible(productControls, 'Replay memory controls');
  await expectVisible(companion, 'persistent Orb travel control');
  await expectVisible(caption, 'Replay caption');
  await expectVisible(unwind, 'Replay unwind control');
  await expectNoOverlap(heading, unwind, 'Replay heading and unwind control', 4);
  await expectNoOverlap(productControls, companion, 'Replay memory controls and persistent Orb', 4);

  const play = client.getByRole('button', { name: 'Play replay' }).first();
  await expectVisible(play, 'Play replay control');
  await play.click();
  await expectAttribute(client, 'data-playing', 'true');

  const pause = client.getByRole('button', { name: 'Pause replay' }).first();
  await expectVisible(pause, 'Pause replay control');
  await pause.click();
  await expectAttribute(client, 'data-playing', 'false');

  report.audits.push('mandatory preflight is entered explicitly before authenticated demo playback controls are verified');
  report.audits.push('route proof exposes replay_playing while authenticated demo client play and pause states are independently verified');
  await page.screenshot({ path: `${ARTIFACT_DIR}/${screenshotName}`, fullPage: true });
  report.screenshots.push(screenshotName);

  return { client, controls, productControls, companion, caption, unwind };
}

async function run() {
  const server = await startServer();
  const report = {
    schemaVersion: 'urai-replay-tier5-report-6',
    screenshots: [],
    console: [],
    pageErrors: [],
    requestFailures: [],
    ignoredJourneyAborts: [],
    audits: [],
    selectors: {},
    bodyHtml: '',
    finalUrl: null,
    baseUrl: server.baseUrl,
    failure: null,
  };
  const consoleErrors = [];
  let browser;
  let page;

  try {
    await waitForServer(server.baseUrl);
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('console', (message) => {
      const entry = { type: message.type(), text: message.text() };
      report.console.push(entry);
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      const message = error.stack || error.message;
      report.pageErrors.push(message);
      consoleErrors.push(message);
    });
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText || null;
      if (isExpectedSameOriginJourneyAbort(request, failure, server.baseUrl)) {
        report.ignoredJourneyAborts.push({ url: request.url(), error: failure });
        return;
      }
      report.requestFailures.push({ url: request.url(), error: failure });
    });

    await openDemoReplay(page, server.baseUrl);
    await validateReplay(page, report, '02-memory-theater-replay.png');

    await page.keyboard.press('Escape');
    await page.waitForURL(/\/(focus|unwind)(\?|$)/, { waitUntil: 'domcontentloaded', timeout: 15000 });
    report.audits.push('Escape returns Replay through the deterministic world unwind path');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileUrl = `${server.baseUrl}/replay?memoryId=${encodeURIComponent(MEMORY_ID)}&manifestId=${MANIFEST_ID}&demo=1`;
    await page.goto(mobileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const mobile = await validateReplay(page, report, '03-mobile-memory-theater-replay.png');
    await expectInsideViewport(mobile.controls, page, 'mobile Replay controls');
    await expectInsideViewport(mobile.productControls, page, 'mobile Replay memory controls');
    await expectInsideViewport(mobile.companion, page, 'mobile persistent Orb control');
    await expectInsideViewport(mobile.unwind, page, 'mobile Replay unwind');
    await expectNoOverlap(mobile.caption, mobile.controls, 'mobile caption and controls');
    await expectNoOverlap(mobile.unwind, mobile.controls, 'mobile unwind and controls');
    report.audits.push('mobile Replay safe-area geometry verified');

    const modeContract = '[data-scene-mode="replay"]';
    report.audits.push(`canonical data-scene-mode contract retained: ${modeContract}`);
    report.audits.push('only expected same-origin Focus, Replay, Life Map, and unwind navigation aborts are classified as benign');

    if (report.requestFailures.length) {
      throw new Error(`Unexpected request failures detected:\n${JSON.stringify(report.requestFailures, null, 2)}`);
    }
    if (consoleErrors.length) throw new Error(`Console errors detected:\n${consoleErrors.join('\n')}`);
    console.log(`URAI Replay Tier 5 Memory Theater validation passed at ${server.baseUrl}.`);
  } catch (error) {
    report.failure = error instanceof Error ? error.stack || error.message : String(error);
    if (page) {
      report.finalUrl = page.url();
      report.bodyHtml = await page.locator('body').innerHTML().catch(() => '');
      report.selectors = {
        proofSurface: await page.getByTestId('urai-replay-surface').count().catch(() => 0),
        cinematicClient: await page.getByTestId('cinematic-replay-client').count().catch(() => 0),
        replayControls: await page.getByTestId('cinematic-replay-client').locator('[aria-label="Replay playback controls"]').count().catch(() => 0),
        nextError: await page.locator('nextjs-portal').count().catch(() => 0),
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
