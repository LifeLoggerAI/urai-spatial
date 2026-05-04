import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'audit', 'final-visual');
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  { path: '/home', name: 'home', must: ['[data-testid="urai-home-scene"]', '[data-testid="urai-orb-button"]'] },
  { path: '/life-map', name: 'life-map', must: ['[data-testid="urai-lifemap-scene"]', '[data-testid="lifemap-starfield"]', '[data-testid^="lifemap-node-"]'] },
  { path: '/focus', name: 'focus', must: ['[data-testid="urai-lifemap-scene"]', '[data-testid="urai-focus-card"]'] },
  { path: '/replay', name: 'replay', must: ['[data-testid="urai-lifemap-scene"]', '[data-testid="urai-replay-overlay"]'] },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32', ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function waitForServer(baseUrl, timeoutMs = 40000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok || response.status < 500) return;
    } catch {}
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (error) {
    throw new Error('Playwright is missing. Run npm install, then npm run audit:final-visual.');
  }

  const port = process.env.PORT || '3100';
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn('npm', ['run', 'dev', '--', '-p', port], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const logFile = path.join(OUT, 'dev-server.log');
  const logStream = fs.createWriteStream(logFile);
  server.stdout.pipe(logStream);
  server.stderr.pipe(logStream);

  try {
    await waitForServer(baseUrl);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const report = [];

    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      for (const selector of route.must) {
        await page.waitForSelector(selector, { timeout: 5000 });
      }

      if (route.name === 'life-map') {
        const nodeCount = await page.locator('[data-testid^="lifemap-node-"]').count();
        const starCount = await page.locator('[data-testid="lifemap-starfield"] i').count();
        const bodyCount = await page.locator('[data-testid="urai-home-body"]').count();
        const orbCount = await page.locator('[data-testid="urai-orb-button"]').count();
        if (nodeCount < 5) throw new Error(`LifeMap node count too low: ${nodeCount}`);
        if (starCount < 180) throw new Error(`LifeMap star count too low: ${starCount}`);
        if (bodyCount !== 0) throw new Error('LifeMap leaked home body into map state');
        if (orbCount !== 0) throw new Error('LifeMap leaked home orb into map state');
      }

      await page.screenshot({ path: path.join(OUT, `${route.name}.png`), fullPage: false });
      report.push({ route: route.path, ok: true });
    }

    await page.goto(`${baseUrl}/life-map`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid^="lifemap-node-"]').first().click();
    await page.waitForURL('**/focus', { timeout: 5000 });
    await page.locator('[data-testid="urai-focus-card"] button', { hasText: 'Replay' }).click();
    await page.waitForURL('**/replay', { timeout: 5000 });
    await page.locator('[data-testid="urai-replay-overlay"] button', { hasText: 'Unwind' }).click();
    await page.waitForURL('**/life-map', { timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, 'flow-after-unwind.png'), fullPage: false });
    report.push({ route: 'life-map -> focus -> replay -> life-map', ok: true });

    await browser.close();
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ok: true, report }, null, 2));
    console.log(`[visual-audit] PASS. Screenshots and report written to ${OUT}`);
  } finally {
    server.kill('SIGTERM');
    await wait(400);
    if (!server.killed) server.kill('SIGKILL');
  }
}

main().catch((error) => {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ok: false, error: String(error.stack || error) }, null, 2));
  console.error(error);
  process.exit(1);
});
