import playwright from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  addPortableBrowserLibraries,
  chromiumLaunchOptions,
} from '../scripts/playwright-runtime-helpers.mjs';

const { chromium } = playwright;
const baseUrl = 'http://localhost:3000';
const baseOrigin = new URL(baseUrl).origin;
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
const canonicalRedirectTargets = new Map([
  ['/ascent', '/home?from=ascent'],
  ['/unwind', '/life-map?from=unwind&overview=1'],
]);
const promotedGeneratedAssetPaths = new Set([
  '/assets/urai/generated/models/home-entry-chamber-v1.glb',
  '/assets/urai/generated/models/portal-ring-master-v1.glb',
  '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
]);
const neutralizedProviderVariables = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'FIREBASE_CONFIG',
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

function key(entry) {
  return `${entry.kind}:${entry.status ?? 0}:${entry.method ?? ''}:${entry.url}`;
}

function isBenignLocalAbort(entry) {
  if (entry.failure !== 'net::ERR_ABORTED') return false;
  let parsed;
  try {
    parsed = new URL(entry.url);
  } catch {
    return false;
  }
  if (parsed.origin !== baseOrigin) return false;
  if (parsed.searchParams.has('_rsc')) return true;
  if (parsed.pathname.startsWith('/_next/static/webpack/')) {
    return parsed.pathname.endsWith('.hot-update.js') || parsed.pathname.endsWith('.hot-update.json');
  }
  if (parsed.search === '' && parsed.pathname.startsWith('/_next/static/chunks/') && parsed.pathname.endsWith('.js')) return true;
  if (entry.method === 'GET'
    && entry.resourceType === 'fetch'
    && parsed.search === ''
    && promotedGeneratedAssetPaths.has(parsed.pathname)) return true;
  return entry.method === 'GET'
    && entry.resourceType === 'fetch'
    && parsed.search === ''
    && parsed.pathname.startsWith('/assets/urai/final/manifests/')
    && parsed.pathname.endsWith('-asset-factory-spatial-handoff.json');
}

const diagnosticEnvironment = {
  ...process.env,
  CI: '1',
  NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE: 'false',
};
for (const variable of neutralizedProviderVariables) diagnosticEnvironment[variable] = '';

const server = spawn('pnpm', ['--dir', 'urai-tier1', 'dev', '--port', '3000'], {
  cwd: process.cwd(),
  env: diagnosticEnvironment,
  stdio: 'inherit',
  detached: true,
});

let browser;
let context;
const httpFailures = [];
const failedRequests = [];
const blockedExternalRequests = [];

try {
  await waitForServer();
  browser = await chromium.launch(chromiumLaunchOptions());
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: 'block',
  });

  await context.route('**/*', async (route) => {
    const request = route.request();
    let parsed;
    try {
      parsed = new URL(request.url());
    } catch {
      blockedExternalRequests.push({
        kind: 'blocked-invalid-url',
        status: 0,
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
      await route.abort('blockedbyclient');
      return;
    }

    if (['data:', 'blob:', 'about:'].includes(parsed.protocol) || parsed.origin === baseOrigin) {
      await route.continue();
      return;
    }

    blockedExternalRequests.push({
      kind: 'blocked-external-request',
      status: 0,
      url: parsed.toString(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
    await route.abort('blockedbyclient');
  });

  context.on('response', (response) => {
    if (response.status() < 400) return;
    httpFailures.push({
      kind: 'http-error',
      status: response.status(),
      url: response.url(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
    });
  });
  context.on('requestfailed', (request) => {
    failedRequests.push({
      kind: 'request-failed',
      status: 0,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText ?? 'request failed',
    });
  });

  for (const route of routes) {
    const page = await context.newPage();
    try {
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      if (!response || response.status() !== 200) {
        throw new Error(`Spatial diagnostic route failed: ${route} (${response?.status() ?? 'no response'})`);
      }

      const canonicalTarget = canonicalRedirectTargets.get(route);
      if (canonicalTarget) {
        await page.waitForURL(`${baseUrl}${canonicalTarget}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        if (page.url() !== `${baseUrl}${canonicalTarget}`) {
          throw new Error(`Spatial diagnostic canonical redirect failed: ${route} -> ${page.url()}`);
        }
      }

      await page.waitForTimeout(1_000);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  const blockedKeys = new Set(blockedExternalRequests.map((entry) => `${entry.method}:${entry.url}`));
  const ignored = failedRequests.filter((entry) => isBenignLocalAbort(entry));
  const actionableFailedRequests = failedRequests.filter((entry) => {
    if (isBenignLocalAbort(entry)) return false;
    return !blockedKeys.has(`${entry.method}:${entry.url}`);
  });

  const actionable = [...new Map([
    ...httpFailures,
    ...blockedExternalRequests,
    ...actionableFailedRequests,
  ].map((entry) => [key(entry), entry])).values()];

  const report = {
    schemaVersion: 'urai-spatial-missing-resource-diagnostics-6',
    generatedAt: new Date().toISOString(),
    baseUrl,
    routes,
    canonicalRedirectTargets: Object.fromEntries(canonicalRedirectTargets),
    policy: {
      providerMode: 'disabled-for-fallback-diagnostic',
      neutralizedProviderVariables,
      manifestFirestoreEnabled: false,
      externalRequestsAllowed: false,
      externalRequestsBlockedBeforeSend: true,
      ignoredLocalAbortClasses: [
        'next-rsc-navigation',
        'next-hmr-hot-update',
        'next-dev-route-chunk-navigation',
        'canonical-local-manifest-navigation-cancellation',
        'promoted-generated-asset-navigation-cancellation',
      ],
    },
    actionable,
    ignored,
  };
  writeFileSync(`${artifactDir}/missing-resources.json`, `${JSON.stringify(report, null, 2)}\n`);

  if (actionable.length) {
    console.error('SPATIAL_ACTIONABLE_RESOURCE_FAILURES');
    for (const entry of actionable) {
      console.error(`${entry.kind} ${entry.status} ${entry.method} ${entry.resourceType} ${entry.url}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`PASS no actionable missing or external spatial resources; ignored ${ignored.length} benign local aborts`);
  }
} finally {
  if (context) await context.close().catch(() => undefined);
  if (browser) await browser.close().catch(() => undefined);
  stopServer(server);
}
