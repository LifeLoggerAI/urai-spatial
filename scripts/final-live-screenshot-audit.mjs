import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.URAI_AUDIT_BASE_URL || 'https://urai.app';
const outDir = process.env.URAI_AUDIT_OUT_DIR || 'live-final-audit';
const shotDir = path.join(outDir, 'screenshots');
const textOnly = process.argv.includes('--text-only') || process.env.URAI_AUDIT_TEXT_ONLY === 'true';

const routes = [
  ['root', '/'],
  ['home', '/home'],
  ['spatial', '/spatial'],
  ['life-map', '/life-map'],
  ['focus', '/focus?memoryId=quiet-reset'],
  ['replay', '/replay?manifestId=replay-recovery-thread'],
  ['mirror', '/mirror'],
  ['passport', '/passport'],
  ['status', '/status'],
  ['privacy-controls', '/privacy-controls'],
];

const expectedCopy = new Map([
  ['/', /URAI|Step inside yourself|Life Map|Own your life/i],
  ['/home', /URAI|Step inside yourself|Life Map|Own your life/i],
  ['/spatial', /URAI|Spatial|Life Map|Focus|Replay|Step inside yourself/i],
  ['/life-map', /Life Map|Memory Galaxy|constellation|star|Focus/i],
  ['/focus?memoryId=quiet-reset', /Focus|memory chamber|Life Map|Replay/i],
  ['/replay?manifestId=replay-recovery-thread', /Replay|cinematic|thread|Life Map/i],
  ['/mirror', /Mirror|pattern|reflection|Life Map/i],
  ['/passport', /Passport|Own your life|Identity|Provenance|Control/i],
  ['/status', /URAI Status|World online|Routes alive|Smoke|Export/i],
  ['/privacy-controls', /Privacy|Passport Controls|Identity|Memory access|Provenance/i],
]);

const oldDemoCopy = /Private Field|tap the sky|quiet blue weather|Opening URAI Spatial/i;

const checks = [
  {
    name: 'home-to-life-map',
    start: '/home',
    expectedPath: '/life-map',
    selectors: [
      'a[data-urai-audit-action="home-life-map"]',
      'a[data-urai-audit-action="home-world-portal"]',
      'a[href="/life-map"]',
      'button:has-text("Open My World")',
      'button:has-text("Life Map")',
    ],
  },
  {
    name: 'life-map-to-focus',
    start: '/life-map',
    expectedPath: '/focus',
    selectors: [
      'a[href*="/focus"]',
      'button:has-text("Open selected memory")',
      'button:has-text("Focus")',
      'button:has-text("Open")',
    ],
  },
  {
    name: 'focus-to-replay',
    start: '/focus?memoryId=quiet-reset',
    expectedPath: '/replay',
    selectors: [
      'a[href*="/replay"]',
      'button:has-text("Start Replay")',
      'button:has-text("Replay")',
    ],
  },
  {
    name: 'passport-to-status',
    start: '/passport',
    expectedPath: '/status',
    selectors: [
      'a[href="/status"]',
      'a:has-text("Status")',
      'button:has-text("Status")',
    ],
  },
];

function absolute(route) {
  return new URL(route, baseUrl).toString();
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function writeAudit({ routeResults, interactionResults = [] }) {
  const failedRoutes = routeResults.filter((result) => result.status !== 200 || result.error || !result.expectedCopyPresent || result.oldDemoCopyPresent);
  const failedInteractions = interactionResults.filter((result) => !result.ok);
  const summary = {
    baseUrl,
    mode: textOnly ? 'text-only' : 'browser-screenshot',
    createdAt: new Date().toISOString(),
    routesAudited: routeResults.length,
    screenshots: routeResults.map((result) => result.screenshot).filter(Boolean),
    failedRoutes: failedRoutes.map(({ route, status, expectedCopyPresent, oldDemoCopyPresent, error }) => ({ route, status, expectedCopyPresent, oldDemoCopyPresent, error })),
    failedInteractions: failedInteractions.map(({ name, expectedPath, currentUrl, error }) => ({ name, expectedPath, currentUrl, error })),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'audit.json'), JSON.stringify({ summary, routes: routeResults, interactions: interactionResults }, null, 2));
  await fs.writeFile(path.join(outDir, 'audit-summary.md'), [
    '# URAI final live screenshot audit',
    '',
    `Base URL: ${baseUrl}`,
    `Mode: ${summary.mode}`,
    `Created: ${summary.createdAt}`,
    '',
    `- Routes audited: ${summary.routesAudited}`,
    `- Screenshots captured: ${summary.screenshots.length}`,
    `- Failed routes: ${summary.failedRoutes.length}`,
    `- Failed interactions: ${summary.failedInteractions.length}`,
    '',
    '## Failed routes',
    '',
    ...(summary.failedRoutes.length ? summary.failedRoutes.map((item) => `- ${item.route}: status=${item.status}, expectedCopy=${item.expectedCopyPresent}, oldDemo=${item.oldDemoCopyPresent}, error=${item.error || 'none'}`) : ['- none']),
    '',
    '## Interactions',
    '',
    ...(interactionResults.length ? interactionResults.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}: ${item.currentUrl || item.error || 'no result'}`) : ['- skipped in text-only mode']),
    '',
  ].join('\n'));

  if (failedRoutes.length || failedInteractions.length) {
    console.error('URAI_FINAL_LIVE_AUDIT_FAILED');
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }

  console.log('URAI_FINAL_LIVE_AUDIT_PASSED');
  console.log(JSON.stringify(summary, null, 2));
}

async function runTextAudit() {
  await fs.mkdir(outDir, { recursive: true });
  const routeResults = [];

  for (const [name, route] of routes) {
    const url = absolute(route);
    let status = 0;
    let text = '';
    let error = '';

    try {
      const response = await fetch(url, { redirect: 'follow' });
      status = response.status;
      const html = await response.text();
      text = stripHtml(html);
      await fs.writeFile(path.join(outDir, `text-${name}.txt`), text);
    } catch (caught) {
      error = String(caught?.message || caught);
    }

    const expected = expectedCopy.get(route);
    const result = {
      name,
      route,
      url,
      status,
      title: '',
      screenshot: '',
      expectedCopyPresent: expected ? expected.test(text) : true,
      oldDemoCopyPresent: oldDemoCopy.test(text),
      error,
      textSample: text.replace(/\s+/g, ' ').trim().slice(0, 1200),
    };

    routeResults.push(result);
    console.log(`TEXT ROUTE ${name}: status=${status} expected=${result.expectedCopyPresent} oldDemo=${result.oldDemoCopyPresent}`);
  }

  await writeAudit({ routeResults });
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const matches = page.locator(selector);
    const count = await matches.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const locator = matches.nth(index);
      if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
        return { selector, locator };
      }
    }
  }
  return null;
}

async function runBrowserAudit() {
  await fs.mkdir(shotDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
  } catch (caught) {
    console.error('URAI_BROWSER_LAUNCH_FAILED');
    console.error(String(caught?.message || caught));
    console.error('Run: npx playwright install chromium');
    process.exit(2);
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const routeResults = [];

  for (const [name, route] of routes) {
    const url = absolute(route);
    const screenshot = path.join(shotDir, `${name}.png`);
    let status = 0;
    let title = '';
    let text = '';
    let error = '';

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      status = response?.status() ?? 0;
      await page.waitForTimeout(1800);
      title = await page.title();
      text = await page.locator('body').innerText({ timeout: 8000 });
      await page.screenshot({ path: screenshot, fullPage: true });
    } catch (caught) {
      error = String(caught?.message || caught);
    }

    const expected = expectedCopy.get(route);
    const result = {
      name,
      route,
      url,
      status,
      title,
      screenshot,
      expectedCopyPresent: expected ? expected.test(text) : true,
      oldDemoCopyPresent: oldDemoCopy.test(text),
      error,
      textSample: text.replace(/\s+/g, ' ').trim().slice(0, 1200),
    };

    routeResults.push(result);
    console.log(`ROUTE ${name}: status=${status} expected=${result.expectedCopyPresent} oldDemo=${result.oldDemoCopyPresent} shot=${screenshot}`);
  }

  const interactionResults = [];
  for (const check of checks) {
    const screenshot = path.join(shotDir, `interaction-${check.name}.png`);
    let selector = '';
    let currentUrl = '';
    let ok = false;
    let error = '';

    try {
      await page.goto(absolute(check.start), { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1600);
      const found = await firstVisible(page, check.selectors);
      if (!found) {
        error = `No visible selector found: ${check.selectors.join(' | ')}`;
      } else {
        selector = found.selector;
        await found.locator.scrollIntoViewIfNeeded().catch(() => {});
        await found.locator.click({ timeout: 12000 });
        await page.waitForTimeout(1400);
        currentUrl = page.url();
        ok = currentUrl.includes(check.expectedPath);
        await page.screenshot({ path: screenshot, fullPage: true });
      }
    } catch (caught) {
      error = String(caught?.message || caught);
    }

    interactionResults.push({ ...check, selector, currentUrl, ok, error, screenshot });
    console.log(`INTERACTION ${check.name}: ok=${ok} selector=${selector || 'none'} current=${currentUrl || 'none'}`);
  }

  await browser.close();
  await writeAudit({ routeResults, interactionResults });
}

if (textOnly) {
  await runTextAudit();
} else {
  await runBrowserAudit();
}
