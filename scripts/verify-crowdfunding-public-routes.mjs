import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(repoRoot, 'docs', 'crowdfunding', 'capture-route-manifest.json');
const outDir = path.join(repoRoot, 'artifacts', 'crowdfunding-route-matrix');
const baseUrl = (process.env.URAI_PUBLIC_BASE_URL || 'https://urai.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.URAI_ROUTE_TIMEOUT_MS || 20000);

function nowIso() {
  return new Date().toISOString();
}

function buildUrl(routePath) {
  return new URL(routePath, `${baseUrl}/`).toString();
}

async function probe(routeId, routePath, kind, disclosure) {
  const url = buildUrl(routePath);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'user-agent': 'URAI-Crowdfunding-Route-Matrix/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const durationMs = Date.now() - startedAt;
    const htmlLike = contentType.includes('text/html') || body.trimStart().startsWith('<!DOCTYPE html') || body.includes('<html');
    const bodyPresent = body.trim().length > 0;
    const statusPass = response.status >= 200 && response.status < 400;
    const pass = statusPass && htmlLike && bodyPresent;

    return {
      routeId,
      kind,
      requestedPath: routePath,
      requestedUrl: url,
      finalUrl: response.url,
      status: response.status,
      redirected: response.redirected,
      contentType,
      bytes: Buffer.byteLength(body),
      durationMs,
      disclosure,
      checks: {
        statusPass,
        htmlLike,
        bodyPresent,
      },
      pass,
      error: null,
    };
  } catch (error) {
    return {
      routeId,
      kind,
      requestedPath: routePath,
      requestedUrl: url,
      finalUrl: null,
      status: null,
      redirected: false,
      contentType: null,
      bytes: 0,
      durationMs: Date.now() - startedAt,
      disclosure,
      checks: {
        statusPass: false,
        htmlLike: false,
        bodyPresent: false,
      },
      pass: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function markdownReport(report) {
  const rows = report.results.map((result) => {
    const status = result.pass ? 'PASS' : 'FAIL';
    const http = result.status ?? 'ERR';
    const redirect = result.finalUrl && result.finalUrl !== result.requestedUrl ? result.finalUrl : '';
    return `| ${status} | ${result.routeId} | ${result.kind} | \`${result.requestedPath}\` | ${http} | ${result.durationMs} | ${redirect} |`;
  });

  return [
    '# URAI Crowdfunding Public Route Matrix',
    '',
    `- Generated: ${report.generatedAt}`,
    `- Base URL: ${report.baseUrl}`,
    `- Manifest release SHA: \`${report.authority.verifiedPublicReleaseSha}\``,
    `- Protected deployment run: \`${report.authority.protectedDeploymentRun}\``,
    `- Overall: **${report.pass ? 'PASS' : 'FAIL'}**`,
    '',
    '| Result | Route | Form | Requested path | HTTP | ms | Final URL when changed |',
    '|---|---|---|---|---:|---:|---|',
    ...rows,
    '',
    'A passing route response does not independently prove that the live host serves the manifest release SHA. Exact release identity still requires the retained protected deployment receipt named in the capture authority.',
    '',
  ].join('\n');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const probes = [];
for (const route of manifest.routes) {
  probes.push(probe(route.id, route.canonicalPath, 'canonical', route.disclosure));
  for (const alternatePath of route.alternatePaths || []) {
    probes.push(probe(route.id, alternatePath, 'alternate', route.disclosure));
  }
}

const results = await Promise.all(probes);
const report = {
  schemaVersion: 1,
  generatedAt: nowIso(),
  baseUrl,
  authority: manifest.authority,
  pass: results.every((result) => result.pass),
  results,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'route-matrix.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'route-matrix.md'), markdownReport(report));

console.log(markdownReport(report));
if (!report.pass) process.exitCode = 1;
