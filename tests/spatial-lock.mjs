import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/spatial-lock';

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

async function screenshot(page, name) {
  const path = `${ARTIFACT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function collectConsole(page) {
  const messages = [];
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') messages.push(`[${type}] ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message}`));
  return messages;
}

async function homeVisualAudit(page) {
  const report = await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="urai-spatial-stage"]');
    const sky = document.querySelector('.home-sky');
    const orb = document.querySelector('[data-testid="urai-orb-button"]');
    const body = document.querySelector('[data-testid="urai-home-body"]');
    const hills = [...document.querySelectorAll('.home-hill')];
    const label = document.querySelector('.enter-label');
    const rect = (node) => {
      const box = node?.getBoundingClientRect();
      return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
    };
    const style = (node) => node ? getComputedStyle(node) : null;
    const orbStyle = style(orb);
    const bodyStyle = style(body);
    const skyStyle = style(sky);
    return {
      stage: rect(stage),
      sky: rect(sky),
      orb: rect(orb),
      body: rect(body),
      label: rect(label),
      hills: hills.map(rect),
      orbBoxShadow: orbStyle?.boxShadow || '',
      orbBackground: orbStyle?.backgroundImage || '',
      bodyBackground: bodyStyle?.backgroundImage || '',
      skyBackground: skyStyle?.backgroundImage || '',
      hillCount: hills.length,
    };
  });

  const failures = [];
  if (!report.stage || report.stage.width < 300 || report.stage.height < 600) failures.push('stage does not fill a usable viewport');
  if (!report.sky || report.sky.width !== report.stage.width || report.sky.height !== report.stage.height) failures.push('home sky does not cover stage');
  if (!report.orb || report.orb.width < 70 || report.orb.height < 70) failures.push('orb is too small or missing');
  if (!report.body || report.body.height < 110 || report.body.width < 70) failures.push('avatar/body silhouette is too small or missing');
  if (report.hillCount < 3) failures.push('ground lacks required layered hills');
  if (!report.hills.every((hill) => hill && hill.width > report.stage.width)) failures.push('ground hills do not overfill viewport width');
  if (!report.orbBoxShadow.includes('rgb') && !report.orbBoxShadow.includes('rgba')) failures.push('orb glow box-shadow missing');
  if (!report.orbBackground.includes('radial-gradient')) failures.push('orb radial-gradient missing');
  if (!report.skyBackground.includes('linear-gradient') || !report.skyBackground.includes('radial-gradient')) failures.push('sky atmospheric gradients missing');
  if (!report.bodyBackground.includes('linear-gradient')) failures.push('avatar/body gradient missing');
  if (failures.length) throw new Error(`Home visual audit failed: ${failures.join('; ')}`);
  return report;
}

async function run() {
  const server = startServer();
  const visualReport = { screenshots: [], homeDesktop: null, homeMobile: null, console: [] };
  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = await collectConsole(page);

    await page.goto(`${BASE_URL}/home`);
    const stage = page.getByTestId('urai-spatial-stage');
    await expectAttr(stage, 'data-mode', 'home');
    await expectVisible(page.getByTestId('urai-home-scene'), 'home scene');
    await expectVisible(page.getByTestId('urai-orb-button'), 'home orb');
    await expectVisible(page.getByTestId('urai-home-body'), 'home body');
    visualReport.homeDesktop = await homeVisualAudit(page);
    visualReport.screenshots.push(await screenshot(page, '01-home-desktop'));

    await page.getByTestId('urai-orb-button').click();
    await expectAttr(stage, 'data-mode', 'ascent');
    await expectVisible(page.getByTestId('urai-ascent-cover'), 'ascent cover');
    visualReport.screenshots.push(await screenshot(page, '02-ascent-desktop'));
    await expectAttr(stage, 'data-mode', 'lifemap', 3000);
    await expectVisible(page.getByTestId('urai-lifemap-scene'), 'lifemap scene');
    visualReport.screenshots.push(await screenshot(page, '03-lifemap-desktop'));

    await page.getByTestId('lifemap-node-pattern-01').click();
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'PATTERN NODE');
    visualReport.screenshots.push(await screenshot(page, '04-focus-desktop'));

    await page.getByRole('button', { name: 'Replay' }).first().click();
    await expectAttr(stage, 'data-mode', 'replay');
    await expectText(page.getByTestId('urai-replay-overlay'), 'REPLAY STREAM');
    visualReport.screenshots.push(await screenshot(page, '05-replay-desktop'));

    await page.getByRole('button', { name: 'Pause' }).click();
    await expectText(page.getByTestId('urai-replay-overlay'), 'Resume');
    await page.getByRole('button', { name: 'Resume' }).click();
    await expectText(page.getByTestId('urai-replay-overlay'), 'Pause');

    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'focus');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'lifemap');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'home');
    visualReport.screenshots.push(await screenshot(page, '06-return-home-desktop'));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/home`);
    await expectAttr(stage, 'data-mode', 'home');
    visualReport.homeMobile = await homeVisualAudit(page);
    visualReport.screenshots.push(await screenshot(page, '07-home-mobile'));

    await page.goto(`${BASE_URL}/life-map?node=recovery`);
    await expectAttr(stage, 'data-mode', 'lifemap');
    const box = await page.getByTestId('urai-lifemap-scene').boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) !== 844) {
      throw new Error(`Mobile LifeMap viewport mismatch: ${JSON.stringify(box)}`);
    }
    visualReport.screenshots.push(await screenshot(page, '08-lifemap-mobile'));

    await page.goto(`${BASE_URL}/focus?node=threshold`);
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'THRESHOLD NODE');

    await page.goto(`${BASE_URL}/replay?node=signal`);
    await expectAttr(stage, 'data-mode', 'replay');
    await expectText(page.getByTestId('urai-replay-overlay'), 'Signal Replay');
    visualReport.screenshots.push(await screenshot(page, '09-replay-mobile'));

    await browser.close();
    visualReport.console = consoleMessages;
    if (consoleMessages.length) {
      throw new Error(`Console warnings/errors detected:\n${consoleMessages.join('\n')}`);
    }
    writeFileSync(`${ARTIFACT_DIR}/visual-audit-report.json`, JSON.stringify(visualReport, null, 2));
    console.log('URAI Spatial E2E and visual lock flow passed.');
  } catch (error) {
    writeFileSync(`${ARTIFACT_DIR}/visual-audit-report.json`, JSON.stringify(visualReport, null, 2));
    throw error;
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
