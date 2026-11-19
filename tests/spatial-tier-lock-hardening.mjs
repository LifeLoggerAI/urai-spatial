import playwright from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const { chromium } = playwright;

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

async function assertNoBlankLoadingFlash(page) {
  const body = await page.locator('body').textContent();
  if (!body || body.includes('Loading URAI Spatial...')) {
    throw new Error('Loading state still visible after route settled');
  }
}

async function assertPersistentWorldRoute(page, mode) {
  const contracts = {
    home: [
      ['[data-testid="urai-persistent-world-shell"]', 'persistent Home world'],
      ['[data-testid="urai-home-accessible-fallback"]', 'accessible Home fallback'],
    ],
    'life-map': [
      ['[data-testid="urai-true-3d-life-map"]', '3D Life Map world'],
      ['[data-testid="urai-life-map-authored-fallback"]', 'authored Life Map fallback'],
      ['[data-testid="urai-life-map-signed-out-threshold"]', 'signed-out Life Map threshold'],
    ],
    focus: [
      ['[data-testid="urai-final-focus-chamber"]', 'Focus chamber'],
      ['main', 'Focus accessible state'],
    ],
    replay: [
      ['[data-testid="cinematic-replay-client"]', 'Replay client'],
      ['[role="region"][aria-label="Replay memory horizon"]', 'Replay accessible state'],
      ['main', 'Replay accessible state'],
    ],
    mirror: [
      ['[data-testid="urai-mirror-route"]', 'Mirror route'],
      ['main', 'Mirror accessible state'],
    ],
  };
  const candidates = contracts[mode];
  if (!candidates) throw new Error(`No persistent-world contract for ${mode}`);
  let matched = null;
  for (const [selector, label] of candidates) {
    const locator = page.locator(selector).first();
    if (await locator.count() && await locator.isVisible().catch(() => false)) {
      matched = { locator, label };
      break;
    }
  }
  if (!matched) throw new Error(`No user-visible persistent-world contract matched for ${mode}`);
  await assertNoBlankLoadingFlash(page);
  const manifest = page.locator('[href*="urai-final-assets.json"], [src*="urai-final-assets.json"]').first();
  if (!(await manifest.count())) {
    throw new Error(`Governed asset manifest was not present for ${mode}`);
  }
  if (mode === 'life-map') {
    const world = page.getByTestId('urai-true-3d-life-map');
    if (await world.count()) {
      const ready = await world.getAttribute('data-life-map-render-ready').catch(() => null);
      const webgl = await world.getAttribute('data-webgl-state').catch(() => null);
      if (ready !== 'true' && webgl !== 'unavailable') {
        throw new Error(`Life Map world was not render-ready: ready=${ready} webgl=${webgl}`);
      }
    }
  }
  return matched.label;
}

async function gotoMode(page, stage, mode, path = `/${mode}`) {
  await page.goto(`${BASE_URL}${path}`);
  if (await stage.count()) {
    await expectAttr(stage, 'data-scene-mode', mode);
  } else {
    await assertPersistentWorldRoute(page, mode);
  }
  await assertNoBlankLoadingFlash(page);
}

async function chooseFirstMemory(page, stage) {
  await gotoMode(page, stage, 'life-map', '/life-map');
  const star = page.getByTestId('lifemap-node-seed-memory-bloom');
  await expectVisible(star, 'demo memory star');
  await star.click();
  await expectAttr(stage, 'data-scene-mode', 'focus');
  await expectText(page.getByTestId('urai-focus-action-panel'), 'Memory Bloom');
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

async function runDataStates(page, stage, report) {
  await gotoMode(page, stage, 'focus', '/focus?manifestId=missing-audit-manifest');
  await expectVisible(page.getByTestId('urai-focus-empty-panel').or(page.getByTestId('urai-focus-action-panel')), 'focus fallback or action panel');
  await expectText(page.locator('body'), 'memory star');

  await gotoMode(page, stage, 'replay', '/replay?manifestId=missing-audit-manifest');
  await expectVisible(page.getByTestId('urai-focus-empty-panel').or(page.getByTestId('urai-focus-action-panel')), 'replay fallback or action panel');

  await gotoMode(page, stage, 'mirror', '/mirror');
  await expectText(page.locator('body'), 'Reflection begins with a stable field');
  await page.keyboard.press('Escape');
  await expectAttr(stage, 'data-scene-mode', 'home');
  await screenshot(page, report, 'data-states-mirror-return');
}

async function runVisual(page, stage, report) {
  // The persistent-world runtime no longer exposes the retired urai-scene-stage
  // marker. Validate the actual user-visible shell, governed manifest, rendered
  // world/fallback, and route-specific semantics instead.
  const routes = [
    ['home', '/home?demo=1', 'visual-home-desktop'],
    ['life-map', '/life-map?demo=1&overview=1', 'visual-lifemap-desktop'],
    ['focus', '/focus?manifestId=seed-memory-bloom&demo=1', 'visual-focus-desktop'],
    ['replay', '/replay?manifestId=seed-memory-bloom&demo=1', 'visual-replay-desktop'],
    ['mirror', '/mirror?demo=1', 'visual-mirror-desktop'],
  ];

  for (const [mode, path, name] of routes) {
    await gotoMode(page, stage, mode, path);
    await screenshot(page, report, name);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoMode(page, stage, 'life-map', '/life-map?demo=1&overview=1');
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
