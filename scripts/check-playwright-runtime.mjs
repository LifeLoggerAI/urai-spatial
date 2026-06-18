import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const runtimeLibs = resolve(process.cwd(), '.playwright-runtime-libs');

if (existsSync(runtimeLibs)) {
  process.env.LD_LIBRARY_PATH = `${runtimeLibs}:${process.env.LD_LIBRARY_PATH || ''}`;
}

const timeoutMs = Number(process.env.URAI_PLAYWRIGHT_CHECK_TIMEOUT_MS || 30000);
const autoInstall = process.argv.includes('--auto-install');

function fail(message, error) {
  console.error(`playwright-runtime: FAIL: ${message}`);
  if (error) {
    console.error(error?.stack || String(error));
  }
  process.exit(1);
}

function looksLikeMissingBrowser(error) {
  const text = String(error?.stack || error?.message || error || '');
  return (
    text.includes("Executable doesn't exist") ||
    text.includes('Please run the following command to download new browsers') ||
    text.includes('playwright install')
  );
}

function installChromium() {
  console.log('playwright-runtime: Chromium missing; installing Playwright chromium browser');

  const install = spawnSync('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (install.error) {
    fail('failed to run Playwright chromium installer', install.error);
  }

  if (install.status !== 0) {
    fail(`Playwright chromium installer exited with code ${install.status}`);
  }
}

async function checkRuntime() {
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

    console.log('playwright-runtime: PASS');
  } finally {
    try {
      if (browser) {
        await browser.close();
      }
    } catch {}
  }
}

try {
  await checkRuntime();
} catch (error) {
  if (autoInstall && looksLikeMissingBrowser(error)) {
    installChromium();
    await checkRuntime();
  } else {
    fail('Chromium failed to launch through Playwright', error);
  }
}
