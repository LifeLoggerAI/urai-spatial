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
const installAttempts = Number(process.env.URAI_PLAYWRIGHT_INSTALL_ATTEMPTS || 3);
const installRetryDelayMs = Number(process.env.URAI_PLAYWRIGHT_INSTALL_RETRY_DELAY_MS || 5000);

function fail(message, error) {
  console.error(`playwright-runtime: FAIL: ${message}`);
  if (error) {
    console.error(error?.stack || String(error));
  }
  process.exit(1);
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
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

  let lastError;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= installAttempts; attempt += 1) {
    console.log(`playwright-runtime: Playwright chromium install attempt ${attempt}/${installAttempts}`);

    const install = spawnSync('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT:
          process.env.PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT || '120000',
      },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    lastError = install.error;
    lastStatus = install.status ?? 0;

    if (!install.error && install.status === 0) {
      return;
    }

    if (attempt < installAttempts) {
      console.warn(
        `playwright-runtime: Playwright chromium install attempt ${attempt} failed; retrying in ${installRetryDelayMs}ms`,
      );
      sleepSync(installRetryDelayMs);
    }
  }

  if (lastError) {
    fail('failed to run Playwright chromium installer', lastError);
  }

  fail(`Playwright chromium installer exited with code ${lastStatus}`);
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
