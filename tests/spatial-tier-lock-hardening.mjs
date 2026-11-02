import { createRequire } from 'node:module';
import { selectSignedOutLifeMapGate } from './spatial-signed-out-lifemap-gate.mjs';
import { disclosedSampleStar, selectedMemoryFocusAction } from './canonical-browser-selection-controls.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { allocateEphemeralPort, waitForOwnedHome, warmOwnedLifeMap } from './spatial-owned-server.mjs';
import { assertVisibleSpatialScene } from './spatial-png-scene-proof.mjs';

// The browser harness lives at the repo root, but Playwright is owned by the
// urai-tier1 workspace. Resolve its public entrypoint from that workspace so
// pnpm's isolated node_modules layout works on both Windows and POSIX.
const workspaceRequire = createRequire(new URL('../urai-tier1/package.json', import.meta.url));
const { chromium } = workspaceRequire('playwright');


let BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-tier-lock-hardening';
const SUITE = (process.argv.find((arg) => arg.startsWith('--suite=')) || '--suite=all').split('=')[1];
const EXPECTED_ASCENT_MS = 1800;
const ASCENT_MAX_MS = 4200;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startServer() {
  if (USE_EXISTING) return null;
  const port = await allocateEphemeralPort();
  BASE_URL = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, [
    'scripts/run-pnpm.mjs', '--filter', 'urai-tier1', 'dev',
    '--hostname', '127.0.0.1', '--port', String(port),
  ], {
    cwd: process.cwd(),
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    shell: false,
    detached: process.platform !== 'win32',
  });
  child.on('error', error => console.error('URAI owned dev server launch failed: ' + error.message));
  child.on('exit', code => {
    if (code && code !== 0) console.error('URAI Spatial dev server exited with ' + code);
  });
  return child;
}

async function stopOwnedServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    // Only the process tree started by this harness, never an existing server.
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 15000 });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  }
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5000)]);
  if (child.exitCode === null) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  }
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

async function screenshot(page, report, name, { requireVisibleSpatialField = false } = {}) {
  const path = `${ARTIFACT_DIR}/${name}.png`;
  const screenshotBytes = await page.screenshot({ path, fullPage: true });
  if (requireVisibleSpatialField) {
    const pixels = assertVisibleSpatialScene(screenshotBytes);
    report.checks.push({ name: 'Captured Life Map has actual visible scene pixels, not UI-only black', status: 'passed',
      brightPixelFraction: pixels.brightFraction });
  }
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
  await page.waitForURL(/[?&]demo=1(?:&|$)/, { timeout: 30000 });
  const scene = page.getByTestId('urai-true-3d-life-map');
  await expectVisible(scene, 'canonical 3D Life Map', 40000);
  await expectAttr(scene, 'data-life-map-source', 'explicit-demo', 30000);
  return scene;
}

async function chooseDisclosedMemory(page) {
  const search = page.getByTestId('life-map-semantic-trigger');
  await expectVisible(search, 'semantic Life Map navigation', 30000);
  await search.click();
  const star = disclosedSampleStar(page);
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
  const action = selectedMemoryFocusAction(page);
  await expectVisible(action, 'real selected Focus action', 30000);
  await action.click();
  await page.waitForURL(/\/focus(?:\?|$)/, { timeout: 40000 });
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
  await page.waitForURL(/\/replay(?:\?|$)/, { timeout: 40000 });
  const replay = page.getByTestId('cinematic-replay-client');
  await expectVisible(replay, 'canonical cinematic Replay', 40000);
  await expectAttr(replay, 'data-memory-status', 'demo', 40000);
  await expectAttr(replay, 'data-manifest-id', DEMO_MANIFEST);
  return replay;
}

async function runNavigationStack(page, stage, report) {
  await visitCanonicalRoute(page, '/home');
  await expectVisible(page.getByTestId('urai-persistent-world-shell'), 'canonical Home owner', 30000);
  const entry = page.getByTestId('home-semantic-life-map');
  await expectVisible(entry, 'real accessible Home sky link', 30000);
  await entry.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/life-map(?:\/|\?|$)/, { timeout: 40000 });
  const gate = selectSignedOutLifeMapGate(page);
  await expectVisible(gate, 'signed-out after real ascent', 30000);
  await expectAttr(gate, 'data-private-memory-mounted', 'false');
  await page.getByRole('button', { name: 'Open disclosed sample' }).first().click();
  await expectVisible(page.getByTestId('urai-true-3d-life-map'), 'disclosed sample world', 40000);
  await enterDemoFocus(page);
  await enterDemoReplay(page);
  report.checks.push({ name: 'Real Home to disclosed Life Map, Focus and Replay', status: 'passed' });
  await page.locator('.replayWorld button.unwind').first().click();
  await page.waitForURL(/\/focus(?:\?|$)/, { timeout: 40000 });
  await expectAttr(page.getByTestId('urai-final-focus-chamber'), 'data-manifest-id', DEMO_MANIFEST, 40000);
  await page.locator('.focusControls button.unwind').first().click();
  await page.waitForURL(/\/life-map(?:\/|\?|$)/, { timeout: 40000 });
  const scene = page.getByTestId('urai-true-3d-life-map');
  await expectVisible(scene, 'returned Life Map', 40000);
  await expectAttr(scene, 'data-life-map-source', 'explicit-demo', 30000);
  await page.locator('.life-map-thresholds .overview-return').click();
  await expectAttr(scene, 'data-life-map-mode', 'overview', 30000);
  await page.locator('.life-map-overview-controls .overview-home-return').click();
  await page.waitForURL(/\/home(?:\/|\?|$)/, { timeout: 40000 });
  await screenshot(page, report, 'real-navigation-return-home');
}

// Real Home sky acceptance must exercise the existing painted WebGL sky via
// pointer input. The accessible semantic link is valuable, but it does not
// demonstrate the physical ascent/camera route and cannot replace this proof.
async function provePhysicalHomeSkyAscent(page, report) {
  // A Playwright-side buffer survives the document navigation to Life Map.
  const ascentSamples = [];
  await page.exposeBinding('__uraiCaptureAscentSample', (_source, sample) => {
    if (Number.isFinite(sample?.progress) && Number.isFinite(sample?.height)) {
      ascentSamples.push({ progress: sample.progress, height: sample.height });
    }
  });
  await visitCanonicalRoute(page, '/home');
  const owner = page.getByTestId('home-visible-navigable-sanctuary-world');
  await expectVisible(owner, 'real Home spatial world', 45000);
  await expectAttr(owner, 'data-home-assets-ready', 'true', 60000);
  const canvas = owner.locator('canvas').first();
  await expectVisible(canvas, 'rendered Home sky canvas', 30000);
  const rect = await canvas.boundingBox();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    throw new Error('Home sky has no rendered, interactive canvas bounds');
  }

  // Observe actual camera height and ascent progress without inserting
  // synthetic scene states. This probe is local to the browser test session.
  await page.evaluate(() => {
    const element = document.querySelector('[data-testid="home-visible-navigable-sanctuary-world"]');
    if (!element) throw new Error('Physical Home scene owner was not mounted');
    const sample = () => {
      if (!element.isConnected || element.getAttribute('data-home-scene-phase') !== 'ASCENT') return;
      if (!element.hasAttribute('data-home-ascent-progress') || !element.hasAttribute('data-home-camera-height')) return;
      const progress = Number(element.getAttribute('data-home-ascent-progress'));
      const height = Number(element.getAttribute('data-home-camera-height'));
      if (Number.isFinite(progress) && Number.isFinite(height)) window.__uraiCaptureAscentSample({ progress, height });
    };
    new MutationObserver(sample).observe(element, {
      attributes: true,
      attributeFilter: ['data-home-scene-phase', 'data-home-ascent-progress', 'data-home-camera-height'],
    });
    sample();
  });

  // Candidate points are all genuine upward canvas taps. The production
  // painted-sky raycaster must reject occluded sky/foreground; no synthetic
  // transition event or direct route assignment is permitted here.
  let triggered = false;
  for (const fraction of [0.08, 0.14, 0.22]) {
    // A physical mouse click is the genuine browser pointer path. Unlike a
    // locator click it does not await Next.js navigation before our ascent
    // observer and exact route/camera assertions can finish independently.
    await page.mouse.click(
      rect.x + Math.floor(rect.width * 0.50),
      rect.y + Math.floor(rect.height * fraction),
    );
    // A real sky click can navigate immediately and destroy the old DOM.
    // Accept observation of either the physical ASCENT owner or the actual
    // Life Map route, but still require its exact home-sky camera checkpoint
    // and measured camera movement below before accepting the suite.
    triggered = await Promise.any([
      page.waitForFunction(() => {
        const element = document.querySelector('[data-testid="home-visible-navigable-sanctuary-world"]');
        return element && (
          element.getAttribute('data-home-scene-phase') === 'ASCENT' ||
          element.getAttribute('data-home-portal-sequence')?.startsWith('life-map:')
        );
      }, null, { timeout: 1600 }).then(() => true),
      page.waitForURL(/\/life-map(?:\/|\?|$)/, { timeout: 1600 }).then(() => true),
    ]).catch(() => false);
    if (!triggered && new URL(page.url()).pathname === '/life-map') triggered = true;
    if (triggered) break;
  }
  if (!triggered) throw new Error('Real painted Home sky tap did not trigger physical ascent');

  await page.waitForURL(/\/life-map(?:\/|\?|$)/, { timeout: 16000 });
  const route = new URL(page.url()).searchParams;
  if (route.get('entryPortal') !== 'home-sky' ||
      route.get('cameraCheckpoint') !== 'home-sky-ascent-complete') {
    throw new Error('Physical sky ascent lost its canonical entry and camera checkpoint');
  }
  const meaningful = ascentSamples.filter(sample => sample.progress >= 0 && sample.progress <= 1 && Number.isFinite(sample.height));
  const progressed = meaningful.some(sample => sample.progress > 0.4);
  const cameraHeights = meaningful.map(sample => sample.height);
  const cameraMovement = cameraHeights.length > 1 ? Math.max(...cameraHeights) - Math.min(...cameraHeights) : 0;
  if (!progressed || cameraMovement < 1) {
    throw new Error('Home physical sky route arrived without verified camera/progress motion: ' +
      JSON.stringify({ samples: meaningful.length, progressed, cameraMovement }));
  }
  report.checks.push({
    name: 'Physical painted sky pointer -> moving camera and ascent progress -> Life Map arrival',
    status: 'passed', samples: meaningful.length, cameraMovement,
  });
}

async function runCameraTransitions(page, stage, report) {
  await provePhysicalHomeSkyAscent(page, report);
  const scene = await openDisclosedLifeMap(page);
  await chooseDisclosedMemory(page);
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="urai-true-3d-life-map"]');
    return el && ['lifeMapCameraX','lifeMapCameraY','lifeMapCameraZ','lifeMapFov'].every(key => Number.isFinite(Number(el.dataset[key])) && Boolean(el.dataset[key]));
  }, null, { timeout: 40000 });
  const focusAction = page.locator('.life-map-thresholds .focus-threshold');
  await expectVisible(focusAction, 'real camera-arrival Focus threshold', 30000);
  await focusAction.click();
  await page.waitForURL(/\/focus(?:\?|$)/, { timeout: 40000 });
  const focus = page.getByTestId('urai-final-focus-chamber');
  await expectAttr(focus, 'data-manifest-id', DEMO_MANIFEST, 40000);
  await expectVisible(page.locator('.focusControls button').filter({ hasText: /recenter/i }).first(), 'real Focus recenter control', 30000);
  await page.locator('.focusControls button').filter({ hasText: /recenter/i }).first().click();
  await screenshot(page, report, 'real-focus-recenter');
}

async function runRaceConditions(page, stage, report) {
  await visitCanonicalRoute(page, '/focus?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread');
  const chamber = page.getByTestId('urai-final-focus-chamber');
  await expectAttr(chamber, 'data-memory-status', 'demo', 40000);
  const action = page.locator('.focusControls button.primary').first();
  await expectVisible(action, 'real Focus enter Replay', 30000);
  await Promise.allSettled([action.click({timeout:12000}),action.click({timeout:12000})]);
  await page.waitForURL(/\/replay(?:\?|$)/, { timeout: 40000 });
  await expectAttr(page.getByTestId('cinematic-replay-client'), 'data-manifest-id', DEMO_MANIFEST, 40000);
  await page.locator('.replayWorld button.unwind').first().click();
  await page.waitForURL(/\/focus(?:\?|$)/, { timeout: 40000 });
  await expectAttr(page.getByTestId('urai-final-focus-chamber'), 'data-manifest-id', DEMO_MANIFEST, 40000);
  await screenshot(page, report, 'real-rapid-travel-return');
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
  await visitCanonicalRoute(page, '/home');
  await expectVisible(page.getByTestId('urai-persistent-world-shell'), 'current Home', 30000);
  await expectAttr(page.getByTestId('home-visible-navigable-sanctuary-world'), 'data-home-assets-ready', 'true', 60000);
  await screenshot(page, report, 'real-home-desktop');
  const lifeMapWorld = await openDisclosedLifeMap(page);
  await expectAttr(lifeMapWorld, 'data-life-map-render-ready', 'true', 90000);
  await screenshot(page, report, 'real-lifemap-desktop', { requireVisibleSpatialField: true });
  await enterDemoFocus(page);
  await expectAttr(page.getByTestId('urai-final-focus-chamber'), 'data-focus-input-ready', 'true', 60000);
  await screenshot(page, report, 'real-focus-desktop');
  await enterDemoReplay(page);
  const replay = page.getByTestId('cinematic-replay-client');
  await expectAttr(replay, 'data-replay-media-ready', 'true', 60000);
  await expectAttr(replay, 'data-replay-cc0-understory-ready', 'true', 60000);
  await screenshot(page, report, 'real-replay-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await visitCanonicalRoute(page, '/life-map?demo=1&overview=1');
  const mobileLifeMap = page.getByTestId('urai-true-3d-life-map');
  await expectAttr(mobileLifeMap, 'data-life-map-source', 'explicit-demo', 40000);
  await expectAttr(mobileLifeMap, 'data-life-map-render-ready', 'true', 90000);
  await screenshot(page, report, 'real-life-map-mobile', { requireVisibleSpatialField: true });
  await visitCanonicalRoute(page, '/mirror');
  await expectVisible(page.getByTestId('mirror-bare-entry'), 'real Mirror disclosure', 30000);
  await screenshot(page, report, 'real-mirror-mobile');
  // Real touch events in a touch-enabled browser context, not desktop clicks
  // relabeled as mobile/device acceptance. Hardware review remains separate.
  const mobileContext = await page.context().browser().newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    reducedMotion: 'reduce',
  });
  try {
    const mobile = await mobileContext.newPage();
    collectConsole(mobile, report);
    await visitCanonicalRoute(mobile, '/home');
    await expectAttr(mobile.getByTestId('home-visible-navigable-sanctuary-world'), 'data-home-assets-ready', 'true', 60000);
    await screenshot(mobile, report, 'real-home-touch-portrait-reduced-motion');
    await mobile.getByTestId('home-semantic-life-map').tap({ timeout: 15000 });
    await mobile.waitForURL(/\/life-map(?:\/|\?|$)/, { timeout: 40000 });
    const mobileGate = selectSignedOutLifeMapGate(mobile);
    await expectVisible(mobileGate, 'touch navigation retains signed-out boundary', 30000);
    await expectAttr(mobileGate, 'data-private-memory-mounted', 'false');
    await mobile.setViewportSize({ width: 844, height: 390 });
    await visitCanonicalRoute(mobile, '/home');
    await expectAttr(mobile.getByTestId('home-visible-navigable-sanctuary-world'), 'data-home-assets-ready', 'true', 60000);
    await screenshot(mobile, report, 'real-home-touch-landscape-reduced-motion');
    report.checks.push({ name: 'Touch portrait/landscape and reduced-motion browser interaction; not physical-device acceptance', status: 'passed' });
  } finally { await mobileContext.close(); }
  report.checks.push({name:'Rendered screenshots recorded; independent artistic acceptance remains separate',status:'captured-not-accepted'});
}

function persistBrowserReport(report) {
  const bytes = JSON.stringify(report, null, 2);
  // Preserve legacy artifact consumers, but never lose an earlier failing
  // camera/navigation suite when the native runner continues to race/data.
  writeFileSync(`${ARTIFACT_DIR}/spatial-tier-lock-hardening-report.json`, bytes);
  const suiteName = /^(all|navigation|camera|race|data|visual)$/.test(SUITE) ? SUITE : 'invalid';
  writeFileSync(`${ARTIFACT_DIR}/spatial-tier-lock-hardening-report-${suiteName}.json`, bytes);
}

async function run() {
  let server = null;
  const report = { suite: SUITE, screenshots: [], console: [], checks: [] };
  try {
    server = await startServer();
    await waitForOwnedHome(BASE_URL, server);
    // Root-maintained --suite=all runs a cold development compiler. First
    // compile original /life-map independently without counting it as browser
    // journey success; retain the original per-interaction browser timeouts.
    if (SUITE === 'all' && !USE_EXISTING) {
      await warmOwnedLifeMap(BASE_URL, server);
      report.checks.push({ name: 'Owned dev Life Map compile complete before real journey; not release acceptance', status: 'passed' });
    }
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    collectConsole(page, report);
    const stage = null; // Retained callback signature; real suites assert actual realm owners.

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
    persistBrowserReport(report);
    console.log(`URAI Spatial tier lock hardening suite passed: ${SUITE}`);
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    persistBrowserReport(report);
    throw error;
  } finally {
    await stopOwnedServer(server);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
