import playwright from '../urai-tier1/node_modules/playwright/index.js';
const { chromium } = playwright;
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const BASE_URL = process.env.URAI_SPATIAL_BASE_URL || 'http://127.0.0.1:3000';
const USE_EXISTING = process.env.URAI_SPATIAL_USE_EXISTING_SERVER === 'true';
const ARTIFACT_DIR = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-tier5-lock';

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

async function screenshot(page, name) {
  const path = `${ARTIFACT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

function collectConsole(page) {
  const messages = [];
  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') messages.push(`[${type}] ${message.text()}`);
  });
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message}`));
  return messages;
}

async function replayVisualAudit(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector('[data-testid="urai-replay-overlay"]');
    const card = document.querySelector('.replay-card');
    const waveformBars = document.querySelectorAll('.waveform i').length;
    const phasePills = [...document.querySelectorAll('.phase-row span')].map((item) => item.textContent?.trim());
    const progress = document.querySelector('.progress-shell i');
    const tether = document.querySelector('.node-tether');
    const activeEdges = document.querySelectorAll('.active-edge').length;
    const selectedNodes = document.querySelectorAll('.node.selected').length;
    const role = overlay?.getAttribute('role');
    const ariaLabel = overlay?.getAttribute('aria-label');
    const progressWidth = progress ? getComputedStyle(progress).width : '';
    const overlayBox = overlay?.getBoundingClientRect();
    const cardBox = card?.getBoundingClientRect();

    return {
      role,
      ariaLabel,
      waveformBars,
      phasePills,
      progressWidth,
      hasTether: Boolean(tether),
      activeEdges,
      selectedNodes,
      overlayBox: overlayBox ? { width: overlayBox.width, height: overlayBox.height } : null,
      cardBox: cardBox ? { width: cardBox.width, height: cardBox.height } : null,
    };
  });
}

async function run() {
  const server = startServer();
  const report = { screenshots: [], console: [], audits: [] };

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleMessages = collectConsole(page);
    const stage = page.getByTestId('urai-spatial-stage');

    await page.goto(`${BASE_URL}/life-map`);
    await expectAttr(stage, 'data-mode', 'lifemap', 4000);
    await page.getByTestId('lifemap-node-pattern-01').click();
    await expectAttr(stage, 'data-mode', 'focus');
    await expectText(page.getByTestId('urai-focus-card'), 'PATTERN NODE');
    await expectText(page.getByTestId('urai-focus-card'), 'Replay');
    report.screenshots.push(await screenshot(page, '01-focus-pattern'));

    await page.getByTestId('urai-focus-card').getByRole('button', { name: 'Replay' }).click();
    await expectAttr(stage, 'data-mode', 'replay');
    const overlay = page.getByTestId('urai-replay-overlay');
    await expectText(overlay, 'REPLAY STREAM');
    await expectText(overlay, 'MEMORY');
    await expectText(overlay, 'EMOTION');
    await expectText(overlay, 'PATTERN / INSIGHT');
    await expectText(overlay, 'RETURN');
    await expectText(overlay, 'Pause');
    await expectText(overlay, 'Collapse Replay');
    report.screenshots.push(await screenshot(page, '02-replay-memory'));

    const initialAudit = await replayVisualAudit(page);
    report.audits.push({ name: 'desktop-initial-replay', ...initialAudit });
    if (initialAudit.role !== 'dialog') throw new Error('Replay overlay is not a dialog');
    if (!initialAudit.ariaLabel?.includes('replay chamber')) throw new Error(`Replay overlay aria-label missing chamber context: ${initialAudit.ariaLabel}`);
    if (initialAudit.waveformBars < 20) throw new Error(`Replay waveform bars missing: ${initialAudit.waveformBars}`);
    if (!initialAudit.hasTether) throw new Error('Replay node tether missing');
    if (initialAudit.activeEdges < 1) throw new Error('Replay active route highlight missing');
    if (initialAudit.selectedNodes < 1) throw new Error('Replay selected node bloom missing');

    await page.getByRole('button', { name: 'Pause' }).click();
    await expectText(overlay, 'Resume');
    await page.getByRole('button', { name: 'Resume' }).click();
    await expectText(overlay, 'Pause');

    await expectText(overlay, 'RETURN', 15000);
    await page.waitForTimeout(6500);
    await expectText(overlay, 'RETURN held', 1000);
    report.screenshots.push(await screenshot(page, '03-replay-return-held'));

    await page.getByRole('button', { name: 'Collapse Replay' }).click();
    await expectAttr(stage, 'data-mode', 'focus');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'lifemap');
    await page.keyboard.press('Escape');
    await expectAttr(stage, 'data-mode', 'home');
    report.screenshots.push(await screenshot(page, '04-unwound-home'));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/replay?node=signal`);
    await expectAttr(stage, 'data-mode', 'replay');
    await expectText(page.getByTestId('urai-replay-overlay'), 'Signal Replay');
    const mobileAudit = await replayVisualAudit(page);
    report.audits.push({ name: 'mobile-direct-replay', ...mobileAudit });
    if (!mobileAudit.overlayBox || Math.round(mobileAudit.overlayBox.width) !== 390 || Math.round(mobileAudit.overlayBox.height) !== 844) {
      throw new Error(`Mobile replay overlay viewport mismatch: ${JSON.stringify(mobileAudit.overlayBox)}`);
    }
    if (!mobileAudit.cardBox || mobileAudit.cardBox.width > 390) {
      throw new Error(`Mobile replay card overflows viewport: ${JSON.stringify(mobileAudit.cardBox)}`);
    }
    report.screenshots.push(await screenshot(page, '05-mobile-direct-replay'));

    await browser.close();
    report.console = consoleMessages;
    if (consoleMessages.length) throw new Error(`Console warnings/errors detected:\n${consoleMessages.join('\n')}`);
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    console.log('URAI Replay Tier 5 chamber validation passed.');
  } catch (error) {
    writeFileSync(`${ARTIFACT_DIR}/replay-tier5-report.json`, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
