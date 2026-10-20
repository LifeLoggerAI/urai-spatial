import { createRequire } from 'node:module';
import { selectSignedOutLifeMapGate } from './spatial-signed-out-lifemap-gate.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

// The browser harness lives at the repo root, but Playwright is owned by the
// urai-tier1 workspace. Resolve its public entrypoint from that workspace so
// pnpm's isolated node_modules layout works on both Windows and POSIX.
const workspaceRequire = createRequire(new URL('../urai-tier1/package.json', import.meta.url));
const { chromium } = workspaceRequire('playwright');


const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-tier-lock-hardening';
const SUITE = (process.argv.find((arg) => arg.startsWith('--suite=')) || '--suite=all').split('=')[1];
const EXPECTED_ASCENT_MS = 1800;
const ASCENT_MAX_MS = 4200;

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
  const child = spawn(process.execPath, ['scripts/run-pnpm.mjs', '--filter', 'urai-tier1', 'dev', '--port', '3000'], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    shell: false,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`URAI Spatial dev server exited with ${code}`);
  });
  return child;
}

function collectConsole(page, report) {
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error') report.console.push(`[${type}] ${message.text()}`);
  });
  page.on('pageerror', (error) => report.console.push(`[pageerror] ${error.message}`));
}

async function expectAttr(locator, name, value, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const actual = await locator.getAttribute(name).catch(() => null);
    if (actual === value) return;
    await sleep(100);
  }
  const actual = await locator.getAttribute(name).catch(() => null);
  throw new Error(`Expected ${name}=${value}, received ${actual}`);
}

async function expectVisible(locator, label, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await locator.isVisible().catch(() => false)) return;
    await sleep(100);
  }
  throw new Error(`${label} is not visible`);
}

async function expectText(locator, text, timeout = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const body = await locator.textContent().catch(() => '');
    if (body?.includes(text)) return;
    await sleep(100);
  }
  const body = await locator.textContent().catch(() => '');
  throw new Error(`Expected text ${text}, received ${body}`);
}

async function screenshot(page, report, name) {
  const path = `${ARTIFACT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}

const DEMO_STAR = 'quiet-reset';
const DEMO_MANIFEST = 'replay-recovery-thread';

async function visitCanonicalRoute(page, path) {
  const response = await page.goto(new URL(path, BASE_URL).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || response.status() >= 400) throw new Error('Canonical route unavailable: ' + path + ' (' + (response?.status() ?? 'no response') + ')');
}

function selectedDemoIdentity(page) {
  const query = new URL(page.url()).searchParams;
  if (query.get('demo') !== '1' || query.get('manifestId') !== DEMO_MANIFEST) {
    throw new Error('Demo identity must remain explicitly disclosed and manifest-bound: ' + page.url());
  }
  if (query.has('privateNote') || query.has('movieId')) throw new Error('Unapproved private query state leaked into demo');
}

async function openDisclosedLifeMap(page) {
  await visitCanonicalRoute(page, '/life-map');
  const gate = selectSignedOutLifeMapGate(page);
  await expectVisible(gate, 'real signed-out Life Map boundary', 30000);
  await expectAttr(gate, 'data-private-memory-mounted', 'false');
  const disclosure = page.getByRole('button', { name: 'Open disclosed sample' }).first();
  await expectVisible(disclosure, 'real explicit sample disclosure', 30000);
  await disclosure.click();
  await page.waitForURL(/(?:\\?|&)demo=1(?:&|$)/, { timeout: 30000 });
  const scene = page.getByTestId('urai-true-3d-life-map');
  await expectVisible(scene, 'canonical 3D Life Map', 40000);
  await expectAttr(scene, 'data-life-map-source', 'explicit-demo', 30000);
  return scene;
}

async function chooseDisclosedMemory(page) {
  const search = page.getByTestId('life-map-semantic-trigger');
  await expectVisible(search, 'semantic Life Map navigation', 30000);
  await search.click();
  const star = page.locator('[data-life-map-node-id="' + DEMO_STAR + '"]');
  await expectVisible(star, 'disclosed canonical demo star', 30000);
  await star.click();
  const scene = page.getByTestId('urai-true-3d-life-map');
  await expectAttr(scene, 'data-life-map-mode', 'selected', 40000);
  await expectAttr(scene, 'data-life-map-phase', 'arrival', 40000);
  selectedDemoIdentity(page);
  return scene;
}

async function enterDemoFocus(page) {
  await chooseDisclosedMemory(page);
  const action = page.locator('.life-map-semantic-inspector .semantic-thresholds button').first();
  await expectVisible(action, 'real selected Focus action', 30000);
  await action.click();
  await page.waitForURL(/\\/focus(?:\\?|$)/, { timeout: 40000 });
  const focus = page.getByTestId('urai-final-focus-chamber');
  await expectVisible(focus, 'canonical stellar Focus', 40000);
  await expectAttr(focus, 'data-memory-status', 'demo', 40000);
  await expectAttr(focus, 'data-manifest-id', DEMO_MANIFEST);
  return focus;
}

async function enterDemoReplay(page) {
  const action = page.locator('.focusControls button.primary').first();
  await expectVisible(action, 'real Focus to Replay control', 30000);
  await action.click();
  await page.waitForURL(/\\/replay(?:\\?|$)/, { timeout: 40000 });
  const replay = page.getByTestId('cinematic-replay-client');
  await expectVisible(replay, 'canonical cinematic Replay', 40000);
  await expectAttr(replay, 'data-memory-status', 'demo', 40000);
  await expectAttr(replay, 'data-manifest-id', DEMO_MANIFEST);
  return replay;
}

async function runNavigationStack(page, stage, report) {
  await gotoMode(page, stage, 'home', '/home');
  await expectVisible(page.getByTestId('urai-sky-click-target'), 'home sky click target');
  await page.getByTestId('urai-sky-click-target').click({ position: { x: 700, y: 500 } });
  await expectAttr(stage, 'data-scene-mode', 'ascent');
  await expectVisible(page.getByTestId('urai-ascent-scene'), 'ascent scene');
  await expectAttr(stage, 'data-scene-mode', 'life-map', ASCENT_MAX_MS);
  await expectVisible(page.getByTestId('lifemap-node-seed-memory-bloom'), 'memory node after ascent');

  await page.getByTestId('lifemap-node-seed-memory-bloom').click();
  await expectAttr(stage, 'data-scene-mode', 'focus');
  await expectText(page.getByTestId('urai-focus-action-panel'), 'Memory Bloom');
  await page.getByRole('button', { name: 'Start Replay' }).click();
  await expectAttr(stage, 'data-scene-mode', 'replay');
  await expectText(page.getByTestId('urai-focus-action-panel'), 'Replay Stream');

  await page.keyboard.press('Escape');
  await expectAttr(stage, 'data-scene-mode', 'focus');
  await page.keyboard.press('Escape');
  await expectAttr(stage, 'data-scene-mode', 'life-map');
  await page.keyboard.press('Escape');
  await expectAttr(stage, 'data-scene-mode', 'home');

  await page.goBack();
  await expectAttr(stage, 'data-scene-mode', 'life-map');
  await page.goForward();
  await expectAttr(stage, 'data-scene-mode', 'home');
  await screenshot(page, report, 'navigation-stack-final-home');
}

async function runCameraTransitions(page, stage, report) {
  await gotoMode(page, stage, 'home', '/home');
  const started = Date.now();
  await page.getByRole('button', { name: 'Begin Ascent' }).click();
  await expectAttr(stage, 'data-scene-mode', 'ascent');
  await expectVisible(page.getByTestId('urai-ascent-scene'), 'ascent active scene');
  await expectAttr(stage, 'data-scene-mode', 'life-map', ASCENT_MAX_MS);
  const elapsed = Date.now() - started;
  if (elapsed < EXPECTED_ASCENT_MS - 500 || elapsed > ASCENT_MAX_MS) {
    throw new Error(`Ascent timing outside lock window: ${elapsed}ms`);
  }

  await chooseFirstMemory(page, stage);
  await expectVisible(page.getByTestId('urai-focus-scene'), 'focus visual layer');
  await page.getByTestId('urai-camera-reset').click();
  await expectAttr(stage, 'data-scene-mode', 'focus');
  await screenshot(page, report, 'camera-focus-after-reset');
}

async function runRaceConditions(page, stage, report) {
  await gotoMode(page, stage, 'home', '/home');
  await Promise.allSettled([
    page.getByRole('button', { name: 'Begin Ascent' }).click(),
    page.getByRole('button', { name: 'Begin Ascent' }).click(),
    page.keyboard.press('Escape'),
  ]);
  await expectAttr(stage, 'data-scene-mode', 'ascent');
  await page.keyboard.press('Escape');
  await expectAttr(stage, 'data-scene-mode', 'home');

  await chooseFirstMemory(page, stage);
  await page.getByRole('button', { name: 'Start Replay' }).click();
  await expectAttr(stage, 'data-scene-mode', 'replay');
  await Promise.allSettled([
    page.keyboard.press('Escape'),
    page.keyboard.press('Escape'),
    page.keyboard.press('Escape'),
  ]);
  await expectAttr(stage, 'data-scene-mode', 'home');
  await screenshot(page, report, 'race-conditions-home');
}

async function runDataStates(page, _legacyStage, report) {
  // Signed-out owner data must remain absent until an explicit demo is opened.
  await page.goto(BASE_URL + '/life-map', { waitUntil: 'domcontentloaded' });
  const gate = selectSignedOutLifeMapGate(page);
  await expectVisible(gate, 'signed-out Life Map WebGL or fallback', 30000);
  await expectAttr(gate, 'data-private-memory-mounted', 'false');
  await screenshot(page, report, 'signed-out-life-map');

  // Unknown private identities must show neutral, non-personal surfaces.
  await page.goto(BASE_URL + '/focus?memoryId=unrecognized-private&manifestId=not-authorized', { waitUntil: 'domcontentloaded' });
  const focus = page.getByTestId('urai-final-focus-chamber');
  await expectVisible(focus, 'real Focus neutral chamber', 30000);
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="urai-final-focus-chamber"]');
    return el && el.getAttribute('data-memory-status') !== 'loading';
  }, null, { timeout: 30000 });
  if (await focus.getAttribute('data-memory-id')) throw new Error('Focus exposed an unauthorized memory');

  await page.goto(BASE_URL + '/replay?memoryId=unrecognized-private&manifestId=not-authorized', { waitUntil: 'domcontentloaded' });
  await expectVisible(page.locator('[data-testid="cinematic-replay-client"][data-replay-neutral="memory-horizon"]'), 'Replay neutral denied-memory surface', 30000);
  if (await page.locator('.replayWorld').count()) throw new Error('Replay exposed an unauthorized memory');

  await page.goto(BASE_URL + '/mirror', { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByTestId('mirror-bare-entry'), 'actual Mirror entry disclosure', 30000);
  await expectText(page.locator('body'), 'Mirror will not invent');
  await screenshot(page, report, 'mirror-bare-entry');
}

async function runVisual(page, stage, report) {
  const routes = [
    ['home', '/home', 'visual-home-desktop'],
    ['ascent', '/ascent', 'visual-ascent-desktop'],
    ['life-map', '/life-map', 'visual-lifemap-desktop'],
    ['focus', '/focus?manifestId=seed-memory-bloom', 'visual-focus-desktop'],
    ['replay', '/replay?manifestId=seed-memory-bloom', 'visual-replay-desktop'],
    ['mirror', '/mirror', 'visual-mirror-desktop'],
  ];

  for (const [mode, path, name] of routes) {
    await gotoMode(page, stage, mode, path);
    await screenshot(page, report, name);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoMode(page, stage, 'life-map', '/life-map');
  await screenshot(page, report, 'visual-lifemap-mobile');
}

async function run() {
  const server = startServer();
  const report = { suite: SUITE, screenshots: [], console: [], checks: [] };
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    collectConsole(page, report);
    const stage = page.getByTestId('urai-scene-stage');

    const suites = {
      navigation: runNavigationStack,
      camera: runCameraTransitions,
      race: runRaceConditions,
      data: runDataStates,
      visual: runVisual,
    };

    const selected = SUITE === 'all' ? Object.entries(suites) : Object.entries(suites).filter(([name]) => name === SUITE);
    if (!selected.length) throw new Error(`Unknown suite: ${SUITE}`);

    for (const [name, fn] of selected) {
      await fn(page, stage, report);
      report.checks.push({ name, status: 'passed' });
    }

    await browser.close();
    if (report.console.length) {
      throw new Error(`Console errors detected:\n${report.console.join('\n')}`);
    }
    writeFileSync(`${ARTIFACT_DIR}/spatial-tier-lock-hardening-report.json`, JSON.stringify(report, null, 2));
    console.log(`URAI Spatial tier lock hardening suite passed: ${SUITE}`);
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    writeFileSync(`${ARTIFACT_DIR}/spatial-tier-lock-hardening-report.json`, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
