#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolve4, resolve6, resolveCname } from 'node:dns/promises';

const args = new Set(process.argv.slice(2));
const getArg = (name, fallback) => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

if (args.has('--help') || args.has('-h')) {
  console.log(`URAI AAA launch proof runner\n\nUsage:\n  node scripts/aaa-launch-proof.mjs [--deploy] [--screenshots] [--skip-install] [--skip-test] [--skip-build] [--base=https://urai.app]\n\nWhat it does:\n  - Creates a receipt folder under $HOME/urai-final-receipts\n  - Records git state\n  - Runs install/typecheck/test/build unless skipped\n  - Deploys only when --deploy is passed\n  - Curls the live route matrix\n  - Checks foundation DNS/HTTPS without claiming success unless it resolves\n  - Optionally captures screenshots if Playwright is available\n  - Writes final-report.md\n`);
  process.exit(0);
}

const baseUrl = getArg('--base', process.env.URAI_BASE_URL || 'https://urai.app').replace(/\/$/, '');
const receiptBase = process.env.URAI_RECEIPT_ROOT || join(homedir(), 'urai-final-receipts');
const shouldDeploy = args.has('--deploy');
const shouldScreenshots = args.has('--screenshots');
const skipInstall = args.has('--skip-install');
const skipTest = args.has('--skip-test');
const skipBuild = args.has('--skip-build');
const skipTypecheck = args.has('--skip-typecheck');
const projectId = process.env.FIREBASE_PROJECT_ID || 'urai-4dc1d';

const launchRoutes = [
  '/',
  '/home',
  '/ground',
  '/life-map',
  '/focus',
  '/replay',
  '/mirror',
  '/passport',
  '/status',
  '/privacy-controls',
  '/location-map',
  '/spatial/ar-vr',
  '/demo',
  '/demo/replay-film',
  '/asset-audit',
  '/tier3',
  '/tier4',
  '/tier5',
];

const screenshotRoutes = [
  ['/home', 'home'],
  ['/ground', 'ground'],
  ['/life-map', 'life-map'],
  ['/focus?memoryId=quiet-reset', 'focus-quiet-reset'],
  ['/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', 'replay-recovery-thread'],
  ['/mirror', 'mirror'],
  ['/passport', 'passport'],
  ['/status', 'status'],
  ['/privacy-controls', 'privacy-controls'],
  ['/location-map', 'location-map'],
  ['/spatial/ar-vr', 'spatial-ar-vr'],
  ['/demo/replay-film', 'demo-replay-film'],
];

function sh(command, opts = {}) {
  const result = spawnSync(command, {
    shell: true,
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
    maxBuffer: 1024 * 1024 * 24,
    ...opts,
  });

  return {
    command,
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function safeName(name) {
  return name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

const gitHead = sh('git rev-parse HEAD').stdout.trim() || 'unknown';
const shortHead = gitHead === 'unknown' ? 'unknown' : gitHead.slice(0, 8);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const receiptDir = join(receiptBase, `aaa-launch-proof-${shortHead}-${stamp}`);
const logDir = join(receiptDir, 'logs');
const screenshotDir = join(receiptDir, 'screenshots');
mkdirSync(logDir, { recursive: true });
mkdirSync(screenshotDir, { recursive: true });

const steps = [];

function writeJson(name, value) {
  writeFileSync(join(receiptDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function logStep(name, command, options = {}) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const result = sh(command, options);
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - started;
  const log = [
    `STEP=${name}`,
    `STARTED_AT=${startedAt}`,
    `ENDED_AT=${endedAt}`,
    `DURATION_MS=${durationMs}`,
    `COMMAND=${command}`,
    `EXIT=${result.status}`,
    '',
    '===== STDOUT =====',
    result.stdout,
    '',
    '===== STDERR =====',
    result.stderr,
    '',
    result.error ? `ERROR=${result.error}` : '',
  ].join('\n');
  writeFileSync(join(logDir, `${safeName(name)}.log`), log);
  steps.push({ name, command, status: result.status, startedAt, endedAt, durationMs });
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${name} (${result.status})`);
  return result;
}

function readAssetReceipt() {
  const path = join(process.cwd(), 'docs', 'final-asset-receipt.md');
  if (!existsSync(path)) return { present: false };
  const text = readFileSync(path, 'utf8');
  const lineValue = (label) => {
    const line = text.split('\n').find((entry) => entry.toLowerCase().startsWith(label.toLowerCase()));
    return line ? line.split(':').slice(1).join(':').trim() : '';
  };
  return {
    present: true,
    result: lineValue('Result'),
    totalAssets: lineValue('Total asset files found'),
    coreRequired: lineValue('Core launch assets checked'),
    coreMissing: lineValue('Core launch assets missing'),
    expansionTargets: lineValue('Expansion / AAA next-stage targets checked'),
    expansionMissing: lineValue('Expansion / AAA next-stage targets missing'),
  };
}

async function smokeRoutes() {
  const rows = [];
  for (const route of launchRoutes) {
    const url = `${baseUrl}${route}`;
    const started = Date.now();
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const text = await res.text().catch(() => '');
      rows.push({
        route,
        url,
        status: res.status,
        ok: res.ok,
        finalUrl: res.url,
        ms: Date.now() - started,
        title: (text.match(/<title>(.*?)<\/title>/i)?.[1] || '').trim(),
        bytes: text.length,
        hasUrai: /urai/i.test(text),
      });
      console.log(`${res.status} ${route}`);
    } catch (error) {
      rows.push({ route, url, status: 0, ok: false, finalUrl: '', ms: Date.now() - started, error: String(error?.message || error) });
      console.log(`ERR ${route}`);
    }
  }
  writeJson('route-matrix.json', rows);
  writeFileSync(
    join(receiptDir, 'route-matrix.md'),
    ['# URAI live route matrix', '', `Base: ${baseUrl}`, '', '| Route | HTTP | OK | Final URL | ms | Title |', '| --- | ---: | --- | --- | ---: | --- |', ...rows.map((row) => `| ${row.route} | ${row.status} | ${row.ok ? 'yes' : 'no'} | ${row.finalUrl || ''} | ${row.ms} | ${String(row.title || '').replace(/\|/g, '/') } |`), ''].join('\n'),
  );
  return rows;
}

async function checkDns() {
  const apex = 'uraifoundation.org';
  const www = 'www.uraifoundation.org';
  const expectedGithubPagesIpv4 = new Set(['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153']);
  const result = { apex, www, expectedGithubPagesIpv4: [...expectedGithubPagesIpv4], checks: {} };

  async function maybe(label, fn) {
    try {
      result.checks[label] = { ok: true, value: await fn() };
    } catch (error) {
      result.checks[label] = { ok: false, error: String(error?.message || error) };
    }
  }

  await maybe('apexA', () => resolve4(apex));
  await maybe('apexAAAA', () => resolve6(apex));
  await maybe('wwwCNAME', () => resolveCname(www));
  await maybe('wwwA', () => resolve4(www));
  await maybe('httpsApex', async () => {
    const res = await fetch(`https://${apex}/`, { method: 'HEAD', redirect: 'follow' });
    return { status: res.status, ok: res.ok, url: res.url, server: res.headers.get('server') || '' };
  });
  await maybe('httpsSitemap', async () => {
    const res = await fetch(`https://${apex}/sitemap.xml`, { method: 'HEAD', redirect: 'follow' });
    return { status: res.status, ok: res.ok, url: res.url, server: res.headers.get('server') || '' };
  });

  const apexA = result.checks.apexA?.value || [];
  result.githubPagesApex = apexA.length > 0 && apexA.every((ip) => expectedGithubPagesIpv4.has(ip));
  result.httpsWorks = Boolean(result.checks.httpsApex?.value?.ok && result.checks.httpsSitemap?.value?.ok);
  result.complete = Boolean(result.githubPagesApex && result.httpsWorks);
  writeJson('foundation-dns.json', result);
  return result;
}

async function captureScreenshots() {
  const result = { requested: shouldScreenshots, captured: [], skipped: [] };
  if (!shouldScreenshots) {
    result.skipped.push('Run with --screenshots to attempt Playwright screenshot capture.');
    writeJson('screenshots.json', result);
    return result;
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (error) {
    result.skipped.push(`Playwright import failed: ${String(error?.message || error)}`);
    writeJson('screenshots.json', result);
    return result;
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const [route, name] of screenshotRoutes) {
      for (const [label, viewport] of [
        ['desktop', { width: 1440, height: 1100 }],
        ['mobile', { width: 390, height: 844 }],
      ]) {
        const page = await browser.newPage({ viewport });
        const path = join(screenshotDir, `${name}-${label}.png`);
        try {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
          await page.screenshot({ path, fullPage: true });
          result.captured.push({ route, label, path });
          console.log(`SHOT ${route} ${label}`);
        } catch (error) {
          result.skipped.push(`${route} ${label}: ${String(error?.message || error)}`);
        } finally {
          await page.close().catch(() => {});
        }
      }
    }
  } catch (error) {
    result.skipped.push(`Browser launch failed: ${String(error?.message || error)}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  writeJson('screenshots.json', result);
  return result;
}

function writeReport({ routeRows, dnsResult, screenshotsResult, assetReceipt }) {
  const failedSteps = steps.filter((step) => step.status !== 0);
  const failedRoutes = routeRows.filter((row) => !row.ok);
  const status = failedSteps.length === 0 && failedRoutes.length === 0 ? 'GREEN' : 'YELLOW_OR_RED_REVIEW_REQUIRED';
  const gitStatus = sh('git status --short').stdout.trim();
  const branch = sh('git branch --show-current').stdout.trim();

  const report = [
    '# URAI AAA launch proof receipt',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Repo: ${process.cwd()}`,
    `Branch: ${branch || 'unknown'}`,
    `Commit: ${gitHead}`,
    `Base URL: ${baseUrl}`,
    `Receipt: ${receiptDir}`,
    `Overall receipt status: ${status}`,
    '',
    '## Git state',
    '',
    gitStatus ? 'Working tree has local changes:' : 'Working tree clean at receipt start/end check:',
    '',
    '```text',
    gitStatus || 'clean',
    '```',
    '',
    '## Command steps',
    '',
    '| Step | Exit | Duration ms |',
    '| --- | ---: | ---: |',
    ...steps.map((step) => `| ${step.name} | ${step.status} | ${step.durationMs} |`),
    '',
    '## Asset receipt',
    '',
    assetReceipt.present
      ? `Result=${assetReceipt.result}; TOTAL_ASSETS=${assetReceipt.totalAssets}; CORE_MISSING=${assetReceipt.coreMissing}; EXPANSION_MISSING=${assetReceipt.expansionMissing}`
      : 'docs/final-asset-receipt.md not found in this checkout.',
    '',
    '## Route matrix summary',
    '',
    `Routes checked: ${routeRows.length}`,
    `Routes OK: ${routeRows.filter((row) => row.ok).length}`,
    `Routes failed: ${failedRoutes.length}`,
    '',
    failedRoutes.length ? failedRoutes.map((row) => `- ${row.route}: ${row.status || row.error}`).join('\n') : 'All checked routes returned successful HTTP status.',
    '',
    '## Screenshots',
    '',
    `Requested: ${screenshotsResult.requested ? 'yes' : 'no'}`,
    `Captured: ${screenshotsResult.captured.length}`,
    screenshotsResult.skipped.length ? `Skipped/notes:\n${screenshotsResult.skipped.map((item) => `- ${item}`).join('\n')}` : 'No screenshot notes.',
    '',
    '## Quest / WebXR proof state',
    '',
    'XR preview may be live if `/spatial/ar-vr` is green. Physical Quest 2 proof is NOT complete from this script. Record actual Quest Browser proof separately.',
    '',
    '## Foundation DNS state',
    '',
    `Complete: ${dnsResult.complete ? 'yes' : 'no'}`,
    `GitHub Pages apex A records: ${dnsResult.githubPagesApex ? 'yes' : 'no'}`,
    `HTTPS works: ${dnsResult.httpsWorks ? 'yes' : 'no'}`,
    '',
    '## Remaining honest gates',
    '',
    '- Capture/review desktop and mobile screenshots if not already captured.',
    '- Do not claim Quest 2 proof until actual Quest Browser testing is recorded.',
    '- Do not claim `uraifoundation.org` DNS complete unless this receipt says DNS/HTTPS complete and manual browser verification agrees.',
    '- Do not claim bespoke final art while core art remains placeholder-final.',
    '- Do not claim production backend/provider automation until real auth/data/actions are wired and tested.',
    '',
  ].join('\n');

  writeFileSync(join(receiptDir, 'final-report.md'), report);
  writeJson('summary.json', { status, gitHead, branch, receiptDir, steps, assetReceipt, routeRows, dnsResult, screenshotsResult });
}

console.log(`Receipt: ${receiptDir}`);

writeJson('repo-state.json', {
  generatedAt: new Date().toISOString(),
  cwd: process.cwd(),
  gitHead,
  branch: sh('git branch --show-current').stdout.trim(),
  statusShort: sh('git status --short').stdout.trim(),
  baseUrl,
  shouldDeploy,
  shouldScreenshots,
});

logStep('git-status', 'git status --short && git rev-parse HEAD && git branch --show-current');

if (!skipInstall) logStep('pnpm-install', 'pnpm install --frozen-lockfile');
else steps.push({ name: 'pnpm-install', command: 'skipped by --skip-install', status: 0, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 0 });

if (!skipTypecheck) logStep('pnpm-typecheck', 'pnpm typecheck');
else steps.push({ name: 'pnpm-typecheck', command: 'skipped by --skip-typecheck', status: 0, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 0 });

if (!skipTest) logStep('pnpm-test-if-present', 'pnpm run --if-present test');
else steps.push({ name: 'pnpm-test-if-present', command: 'skipped by --skip-test', status: 0, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 0 });

if (!skipBuild) logStep('pnpm-build-static', 'pnpm build:static');
else steps.push({ name: 'pnpm-build-static', command: 'skipped by --skip-build', status: 0, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 0 });

if (shouldDeploy) {
  logStep('firebase-deploy-static', `firebase deploy --config firebase.static.json --only hosting --project ${projectId}`);
} else {
  steps.push({ name: 'firebase-deploy-static', command: 'skipped; pass --deploy to run', status: 0, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 0 });
  writeFileSync(join(logDir, 'firebase-deploy-static.log'), 'Skipped. Pass --deploy to run Firebase hosting deploy.\n');
}

const assetReceipt = readAssetReceipt();
writeJson('asset-receipt-summary.json', assetReceipt);
const routeRows = await smokeRoutes();
const dnsResult = await checkDns();
const screenshotsResult = await captureScreenshots();
writeReport({ routeRows, dnsResult, screenshotsResult, assetReceipt });

console.log('\nFINAL RECEIPT WRITTEN');
console.log(join(receiptDir, 'final-report.md'));
console.log('Quest proof remains manual until tested on actual Quest Browser.');
