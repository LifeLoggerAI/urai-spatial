import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimeLibs = resolve(process.cwd(), '.playwright-runtime-libs');

if (existsSync(runtimeLibs)) {
  process.env.LD_LIBRARY_PATH = `${runtimeLibs}:${process.env.LD_LIBRARY_PATH || ''}`;
}

const timeoutMs = Number(process.env.URAI_PLAYWRIGHT_CHECK_TIMEOUT_MS || 30000);

function fail(message, error) {
  console.error(`playwright-runtime: FAIL: ${message}`);
  if (error) {
    console.error(error?.stack || String(error));
  }
  process.exit(1);
}

const timer = setTimeout(() => {
  fail(`timed out after ${timeoutMs}ms`);
}, timeoutMs);

timer.unref?.();

let browser;

try {
  browser = await chromium.launch({
    headless: true,
    timeout: timeoutMs,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-features=UseDBus',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();

  await page.goto('data:text/html,<main id="ok">URAI Playwright runtime OK</main>', {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });

  const text = await page.locator('#ok').textContent({ timeout: timeoutMs });

  if (text !== 'URAI Playwright runtime OK') {
    fail(`unexpected page text: ${text}`);
  }

  await page.close();
  await browser.close();
  browser = undefined;

  clearTimeout(timer);
  console.log('playwright-runtime: PASS');
} catch (error) {
  try {
    if (browser) {
      await browser.close();
    }
  } catch {}

  clearTimeout(timer);
  fail('Chromium failed to launch through Playwright', error);
}
