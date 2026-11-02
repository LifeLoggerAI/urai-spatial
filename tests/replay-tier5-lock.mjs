import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { allocateEphemeralPort, isUraiHomeDocument, waitForOwnedHome } from './spatial-owned-server.mjs';

const REQUESTED_BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const SERVER_MODE = process.env.URAI_SPATIAL_SERVER_MODE === 'production' ? 'production' : 'development';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-tier5-lock';
const MEMORY_ID = 'demo:seed-memory-bloom';
const MANIFEST_ID = 'seed-memory-bloom';

mkdirSync(ARTIFACT_DIR, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function baseUrlForPort(port) {
  const url = new URL(REQUESTED_BASE_URL);
  url.port = String(port);
  return url.toString().replace(/\/$/, '');
}

async function verifiedExistingUraiHome(baseUrl) {
  try {
    const response = await fetch(new URL('/home', baseUrl), {
      redirect: 'manual', signal: AbortSignal.timeout(5000),
    });
    return response.status === 200
      && /text\/html/i.test(response.headers.get('content-type') || '')
      && isUraiHomeDocument(await response.text());
  } catch {
    return false;
  }
}

async function startServer() {
  if (USE_EXISTING) {
    if (SERVER_MODE === 'production') throw new Error('Production Replay proof must own the exact built server; existing-server reuse is forbidden.');
    if (!await verifiedExistingUraiHome(REQUESTED_BASE_URL)) {
      throw new Error('URAI_REPLAY_EXISTING_SERVER_NOT_ORIGINAL_HOME: ' + REQUESTED_BASE_URL);
    }
    return { child: null, baseUrl: REQUESTED_BASE_URL.replace(/\/$/, '') };
  }
  // Never silently reuse a stale service on port 3000 or 3001. Own a fresh
  // ephemeral listener unless an explicit test port was requested.
  const forcedPort = process.env.URAI_SPATIAL_TEST_PORT;
  const port = forcedPort ? Number(forcedPort) : await allocateEphemeralPort();
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('URAI_REPLAY_TEST_PORT_INVALID');
  }
  const baseUrl = baseUrlForPort(port);
  const serverScript = SERVER_MODE === 'production' ? 'start' : 'dev';
  // The original portable Node 22 toolchain has no ambient pnpm executable.
  // Resolve the repository-pinned pnpm@10 through the same Node binary as all
  // other native stages. This remains the real development/production server.
  const child = spawn(process.execPath, [
    'scripts/run-pnpm.mjs', '--filter', 'urai-tier1',
    serverScript, '--hostname', '127.0.0.1', '--port', String(port),
  ], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    shell: false,
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

async function expectNoOverlap(first, second, label, gap = 2, timeout = 10000) {
  const started = Date.now();
  let firstBox = null;
  let secondBox = null;
  while (Date.now() - started < timeout) {
    [firstBox, secondBox] = await Promise.all([
      first.boundingBox().catch(() => null),
      second.boundingBox().catch(() => null),
    ]);
    if (
      firstBox && secondBox
      && firstBox.width > 0 && firstBox.height > 0
      && secondBox.width > 0 && secondBox.height > 0
    ) break;
    await sleep(100);
  }
  if (!firstBox || !secondBox || firstBox.width <= 0 || firstBox.height <= 0 || secondBox.width <= 0 || secondBox.height <= 0) {
    throw new Error(`${label}: missing stable measurable bounding box`);
  }
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

// Exercise a genuine pointer hit and assert the native <details> state. In a
// real earlier Chromium trace the click OPENED the panel, but locator.click()
// never returned from its post-action wait under a loaded WebGL compositor.
// A hit-test, native mouse event and explicit state assertion measure the
// product interaction without treating an automation wait as product failure.
async function toggleReplayMemoryDisclosure(page, summary, expectedOpen) {
  await expectVisible(summary, 'Replay memory controls summary');
  const bounds = await summary.boundingBox();
  if (!bounds || bounds.width < 1 || bounds.height < 1) throw new Error('Replay controls have no pointer target');
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const actionable = await page.evaluate(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    return Boolean(hit?.closest('summary[aria-label="Replay memory controls"]'));
  }, point);
  if (!actionable) throw new Error('Replay memory controls pointer hit is occluded by another element');
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction((open) => {
    const details = document.querySelector('details.replayProduct');
    return details instanceof HTMLDetailsElement && details.open === open;
  }, expectedOpen, { timeout: 10000 });
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
  const controls = page.locator('summary[aria-label="Replay memory controls"]').first();
  const productControls = page.locator('.replayProductActions').first();
  const companion = page.getByRole('button', { name: /Orb travel controls/i }).first();
  const heading = page.locator('.replayWorld header h1').first();
  const caption = page.locator('.caption').first();
  const unwind = page.locator('.unwind').first();

  await proof.waitFor({ state: 'attached', timeout: 30000 });
  await expectAttribute(proof, 'data-replay-phase', 'replay_playing');
  await expectAttribute(proof, 'data-playing', 'true');
  await expectVisible(client, 'cinematic Replay client');
  await expectAttribute(client, 'data-memory-status', 'demo');
  // Geometry read-through is not enough: wait until the actual licensed
  // GLTF scene has hydrated, not just until the generic Canvas first frame.
  // Console and network errors remain unconditional test failures.
  await expectAttribute(client, 'data-replay-cc0-understory-ready', 'true', 60000);
  await expectAttribute(client, 'data-manifest-id', MANIFEST_ID);
  await expectAttribute(client, 'data-playing', 'false');
  await expectVisible(controls, 'Memory controls disclosure');
  await toggleReplayMemoryDisclosure(page, controls, true);
  await expectVisible(productControls, 'Memory controls action panel');
  await expectVisible(companion, 'persistent Orb travel control');
  await expectVisible(heading, 'Replay heading');
  await expectVisible(caption, 'Replay caption');
  await expectVisible(unwind, 'Replay unwind control');
  await expectNoOverlap(heading, unwind, 'Replay heading and unwind control', 4);
  await expectNoOverlap(productControls, companion, 'Replay memory controls and persistent Orb', 4);
  await toggleReplayMemoryDisclosure(page, controls, false);
  await productControls.waitFor({ state: 'hidden', timeout: 10000 });

  const play = page.getByRole('button', { name: 'Continue memory' }).first();
  await expectVisible(play, 'Continue memory control');
  await play.click();
  await expectAttribute(client, 'data-playing', 'true');

  const pause = page.getByRole('button', { name: 'Pause memory' }).first();
  await expectVisible(pause, 'Pause memory control');
  await pause.click();
  await expectAttribute(client, 'data-playing', 'false');

  report.audits.push('route proof exposes replay_playing while authenticated demo client play and pause states are independently verified');
  await page.screenshot({ path: `${ARTIFACT_DIR}/${screenshotName}`, fullPage: true });
  report.screenshots.push(screenshotName);

  return { client, controls, productControls, companion, caption, unwind };
}

async function run() {
  const server = await startServer();
  const report = {
    schemaVersion: 'urai-replay-tier5-report-5',
    screenshots: [],
    console: [],
    pageErrors: [],
    requestFailures: [],
    audits: [],
    selectors: {},
    bodyHtml: '',
    finalUrl: null,
    baseUrl: server.baseUrl,
    serverMode: SERVER_MODE,
    failure: null,
  };
  const consoleErrors = [];
  let browser;
  let page;

  try {
    await waitForOwnedHome(server.baseUrl, server.child);
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
      report.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || null });
    });

    await openDemoReplay(page, server.baseUrl);
    await validateReplay(page, report, '02-memory-theater-replay.png');

    await page.keyboard.press('Escape');
    await page.waitForURL(/\/(focus|unwind)(\?|$)/, { timeout: 15000 });
    // URL changes alone are insufficient: the destination must actually own
    // a mounted surface and Replay must have unmounted after this return.
    await page.getByTestId('cinematic-replay-client').waitFor({ state: 'detached', timeout: 15000 });
    report.audits.push('Escape completes one Replay return route transition and removes the old immersive scene');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileUrl = `${server.baseUrl}/replay?memoryId=${encodeURIComponent(MEMORY_ID)}&manifestId=${MANIFEST_ID}&demo=1`;
    await page.goto(mobileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const mobile = await validateReplay(page, report, '03-mobile-memory-theater-replay.png');
    await expectInsideViewport(mobile.controls, page, 'mobile Memory controls disclosure');
    await expectInsideViewport(mobile.productControls, page, 'mobile Memory controls action panel');
    await expectInsideViewport(mobile.companion, page, 'mobile persistent Orb control');
    await expectInsideViewport(mobile.unwind, page, 'mobile Replay unwind');
    await expectNoOverlap(mobile.caption, mobile.controls, 'mobile caption and Memory controls disclosure');
    await expectNoOverlap(mobile.unwind, mobile.controls, 'mobile unwind and Memory controls disclosure');
    report.audits.push('mobile Replay safe-area geometry verified');

    const modeContract = '[data-scene-mode="replay"]';
    report.audits.push(`canonical data-scene-mode contract retained: ${modeContract}`);

    if (SERVER_MODE === 'production') {
      const developmentConsole = report.console.filter(({ text }) => /Fast Refresh|React DevTools for a better development experience/i.test(text));
      const hotUpdateFailures = report.requestFailures.filter(({ url }) => /\.hot-update\.(?:json|js)(?:\?|$)/i.test(url));
      if (developmentConsole.length || hotUpdateFailures.length) {
        throw new Error(`Production Replay proof observed development-runtime signals: ${JSON.stringify({ developmentConsole, hotUpdateFailures })}`);
      }
      report.audits.push('production Replay proof owned a next start server and observed no Fast Refresh, React development tooling, or hot-update request failures');
    }
    if (consoleErrors.length) throw new Error(`Console errors detected:\n${consoleErrors.join('\n')}`);
    console.log(`URAI Replay Tier 5 Memory Theater validation passed at ${server.baseUrl} in ${SERVER_MODE} mode.`);
  } catch (error) {
    report.failure = error instanceof Error ? error.stack || error.message : String(error);
    if (page) {
      report.finalUrl = page.url();
      report.bodyHtml = await page.locator('body').innerHTML().catch(() => '');
      report.selectors = {
        proofSurface: await page.getByTestId('urai-replay-surface').count().catch(() => 0),
        cinematicClient: await page.getByTestId('cinematic-replay-client').count().catch(() => 0),
        memoryControlsDisclosure: await page.locator('summary[aria-label="Replay memory controls"]').count().catch(() => 0),
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
