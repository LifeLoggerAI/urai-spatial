/**
 * R579: independent Chromium hydration assertions for anonymous/public privacy UI.
 * REVIEW ONLY. Requires a complete URAI_FIREBASE_STATIC_EXPORT=true build at
 * urai-tier1/out and an installed Playwright Chromium-compatible system browser.
 * No live Firebase account, secrets, backend writes, or production release action.
 *
 * Run from repository root:
 *   URAI_CHROMIUM_EXECUTABLE=/usr/bin/chromium-browser node scripts/review-only/r579-passport-consent-browser.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outRoot = path.join(repositoryRoot, 'urai-tier1', 'out');
const require = createRequire(path.join(repositoryRoot, 'urai-tier1', 'package.json'));
const { chromium } = require('playwright');

assert.ok(fs.existsSync(outRoot), 'Original Next static export is required before browser verification');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const resolved = path.resolve(outRoot, '.' + pathname);
    if (!resolved.startsWith(outRoot + path.sep) && resolved !== outRoot) { res.writeHead(403); res.end(); return; }
    let file = resolved;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    else if (!fs.existsSync(file)) {
      const candidate = file.replace(/\/+$/, '') + '.html';
      if (fs.existsSync(candidate)) file = candidate;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400); res.end('Bad request'); }
});

const listen = () => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const closeServer = () => new Promise((resolve) => server.close(resolve));
const cleanText = (text) => (text || '').replace(/\s+/g, ' ').trim();
let browser;
let count = 0;
const report = (label, detail) => { count++; console.log('R579_CASE_' + count + '=PASS ' + label + ' ' + detail); };
const forbiddenPublic = ['Ownership: verified', 'Memory granted', 'Enforcement: fully-enforced', '2 connected targets', 'sample-owner'];
const waitForSelector = async (page, selector) => { await page.locator(selector).waitFor({ state: 'visible', timeout: 20000 }); };
const pressPreviouslyUnselectedTab = async (page, selector) => {
  const buttons = page.locator(selector);
  const total = await buttons.count();
  assert.ok(total >= 2, 'At least two navigable domains/zones expected');
  let idx = -1;
  for (let i = 0; i < total; i++) if ((await buttons.nth(i).getAttribute('aria-pressed')) === 'false') { idx = i; break; }
  assert.notEqual(idx, -1, 'Need an initially unselected control to prove React hydration');
  await buttons.nth(idx).click({ timeout: 10000 });
  await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel)[n]?.getAttribute('aria-pressed') === 'true', [selector, idx], { timeout: 15000 });
};
const assertPrivateActionsLocked = async (page, label, selectors) => {
  for (const selector of selectors) {
    const button = page.locator(selector);
    assert.equal(await button.count(), 1, label + ': expected single private-action button');
    assert.equal(await button.isDisabled(), true, label + ': private action must be disabled');
  }
};

try {
  await listen();
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    executablePath: process.env.URAI_CHROMIUM_EXECUTABLE || '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader'],
  });
  const context = await browser.newContext({ baseURL: base, serviceWorkers: 'block', javaScriptEnabled: true, ignoreHTTPSErrors: false });
  // Never send test-browser requests to real Firebase, Google, or other outside providers.
  await context.route('**/*', (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith(base + '/')) return route.continue();
    return route.abort();
  });
  for (const [route, attribute, nav, actions] of [
    ['passport', 'data-passport-source', 'nav.passportZones button', ['button:has-text("Unlock and request export")', 'button:has-text("Unlock and create deletion request")']],
    ['privacy-controls', 'data-privacy-source', 'nav.consentRealmNav button', ['button:has-text("Request export")', 'button:has-text("Create deletion request")']],
  ]) {
    const page = await context.newPage();
    const response = await page.goto('/' + route + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response?.status(), 200, route + ': local static response');
    await waitForSelector(page, 'main[' + attribute + ']');
    await pressPreviouslyUnselectedTab(page, nav);
    report(route + '_REAL_HYDRATION', 'aria-pressed handler changed after Chromium click');

    const initialState = await page.locator('main[' + attribute + ']').getAttribute(attribute);
    assert.ok(['loading', 'signed-out', 'unavailable', 'unverified', 'offline'].includes(initialState), route + ': anonymous view must not become owner-private or demo');
    const visible = cleanText(await page.locator('main[' + attribute + ']').innerText());
    assert.equal(forbiddenPublic.filter((needle) => visible.includes(needle)).length, 0, route + ': positive owner claim leaked');
    assert.ok(!visible.includes('DEMONSTRATION'), route + ': explicit demo was not requested');
    await assertPrivateActionsLocked(page, route, actions);
    report(route + '_ANONYMOUS_NEUTRAL', 'state=' + initialState + ' all owner actions locked');

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForFunction((attr) => document.querySelector('main[' + attr + ']')?.getAttribute(attr) === 'offline', attribute, { timeout: 8000 });
    const offline = cleanText(await page.locator('main[' + attribute + ']').innerText());
    assert.equal(forbiddenPublic.filter((needle) => offline.includes(needle)).length, 0);
    await assertPrivateActionsLocked(page, route + ' offline', actions);
    report(route + '_OFFLINE_FAIL_CLOSED', 'offline, owner grants absent, controls locked');
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(350);
    const onlineState = await page.locator('main[' + attribute + ']').getAttribute(attribute);
    assert.ok(!['private', 'demo'].includes(onlineState), route + ': reconnect cannot establish trusted ownership from connectivity alone');
    report(route + '_RECONNECT_NOT_TRUSTED', 'state=' + onlineState);
    await page.close();
  }

  for (const [route, attribute, disclosure, actions] of [
    ['passport', 'data-passport-source', 'DEMONSTRATION — sample data only', ['button:has-text("Unlock and request export")']],
    ['privacy-controls', 'data-privacy-source', 'DEMONSTRATION — no personal data', ['button:has-text("Request export")']],
  ]) {
    const page = await context.newPage();
    const response = await page.goto('/' + route + '/?demo=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response?.status(), 200);
    await page.waitForFunction(([attr]) => document.querySelector('main[' + attr + ']')?.getAttribute(attr) === 'demo', [attribute], { timeout: 15000 });
    assert.ok(cleanText(await page.locator('main[' + attribute + ']').innerText()).includes(disclosure), route + ': sample disclosure visible');
    await assertPrivateActionsLocked(page, route + ' demo', actions);
    report(route + '_EXPLICIT_DEMO_DISCLOSED', 'visible demo disclosure, private actions still disabled');
    await page.close();
  }
  await context.close();
  console.log('R579_BROWSER_CHECKS=' + count + '/' + count + '_PASS');
  console.log('R579_PRODUCTION_AUTHORIZED=false');
  console.log('R579_VERDICT=REVIEW_ONLY');
} catch (error) {
  console.error('R579_BROWSER_FAILURE=' + String(error?.message || error).slice(0, 1600));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  await closeServer().catch(() => {});
}