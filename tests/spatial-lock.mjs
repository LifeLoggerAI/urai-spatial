import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import process from 'node:process';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';

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
  const child = spawn('pnpm', ['--filter', 'urai-tier1', 'dev', '--', '--port', '3000'], {
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

async function run() {
  const server = startServer();
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`${BASE_URL}/home`);
    const stage = page.getByTestId('urai-spatial-stage');
    await expectAttr(stage, 'data-mode', 'home');
    await expectVisible(page.getByTestId('urai-home-scene'), 'home scene');
    await expectVisible(page.getByTestId('urai-orb-button'), 'home orb');
    await expectVisible(page.getByTestId('urai-home-body'), 'home body');

    await page.getByTestId('urai-orb-button').click();
    await expectAttr(stage, 'data-mode', 'ascent');
    await expectVisible(page.getByTestId('urai-ascent-cover'), 'ascent cover');
    await expectAttr(stage, 'data-mode', 'lifemap', 3000);
    await expectVisible(page.getByTestId('urai-lifemap-scene'), 'lifemap scene');

    await page.getByTestId('lifemap-node-pattern-01').click();
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'PATTERN NODE');

    await page.getByRole('button', { name: 'Replay' }).first().click();
    await expectAttr(stage, 'data-mode', 'replay');
    await expectText(page.getByTestId('urai-replay-overlay'), 'REPLAY STREAM');

    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'focus');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'lifemap');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'home');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/life-map?node=recovery`);
    await expectAttr(stage, 'data-mode', 'lifemap');
    const box = await page.getByTestId('urai-lifemap-scene').boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) !== 844) {
      throw new Error(`Mobile LifeMap viewport mismatch: ${JSON.stringify(box)}`);
    }

    await page.goto(`${BASE_URL}/focus?node=threshold`);
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'THRESHOLD NODE');

    await page.goto(`${BASE_URL}/replay?node=signal`);
    await expectAttr(stage, 'data-mode', 'replay');
    await expectText(page.getByTestId('urai-replay-overlay'), 'Signal Replay');

    await browser.close();
    console.log('URAI Spatial E2E lock flow passed.');
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
