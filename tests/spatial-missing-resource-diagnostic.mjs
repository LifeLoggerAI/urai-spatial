import playwright from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  addPortableBrowserLibraries,
  chromiumLaunchOptions,
} from '../scripts/playwright-runtime-helpers.mjs';

const { chromium } = playwright;
const baseUrl = 'http://localhost:3000';
const artifactDir = 'artifacts/spatial-404-diagnostics';
const routes = [
  '/home',
  '/ascent',
  '/life-map',
  '/focus?manifestId=seed-memory-bloom',
  '/replay?manifestId=seed-memory-bloom',
  '/unwind',
  '/mirror',
  '/passport',
  '/status',
  '/spatial/ar-vr',
];

mkdirSync(artifactDir, { recursive: true });
addPortableBrowserLibraries();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/home`);
      if (response.ok) return;
    } catch {
      // Continue until the local development server is ready.
    }
    await sleep(1000);
  }
  throw new Error('Spatial diagnostic server did not become ready.');
}

function stopServer(server) {
  if (!server) return;
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
  spawnSync('bash', ['-lc', 'fuser -k 3000/tcp >/dev/null 2>&1 || true']);
}

const server = spawn('pnpm', ['--dir', 'urai-tier1', 'dev', '--port', '3000'], {
  cwd: process.cwd(),
  env: { ...process.env, CI: '1' },
  stdio: 'inherit',
  detached: true,
});

let browser;
const missing = [];

try {
  await waitForServer();
  browser = await chromium.launch(chromiumLaunchOptions());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    missing.push({
      status: response.status(),
      url: response.url(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
    });
  });
  page.on('requestfailed', (request) => {
    missing.push({
      status: 0,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText ?? 'request failed',
    });
  });

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  }

  const unique = [...new Map(missing.map((entry) => [`${entry.status}:${entry.method}:${entry.url}`, entry])).values()];
  writeFileSync(`${artifactDir}/missing-resources.json`, JSON.stringify({ routes, missing: unique }, null, 2));
  if (unique.length) {
    console.log('SPATIAL_MISSING_RESOURCES');
    for (const entry of unique) console.log(`${entry.status} ${entry.method} ${entry.resourceType} ${entry.url}`);
  } else {
    console.log('PASS no missing spatial resources detected');
  }
} finally {
  if (browser) await browser.close().catch(() => undefined);
  stopServer(server);
}
