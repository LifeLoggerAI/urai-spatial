import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const contract = fs.readFileSync(new URL('../src/lib/tier4-production-contract.ts', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('../src/app/tier4/page.tsx', import.meta.url), 'utf8');
const route = fs.readFileSync(new URL('../src/app/api/system/tier4/route.ts', import.meta.url), 'utf8');

test('Tier4 contract exposes safe production-gated capability matrix', () => {
  for (const id of [
    'tier4-command-center',
    'tier4-system-contract',
    'tier4-commerce-entitlement',
    'tier4-xr-provider-boundary',
  ]) {
    assert.match(contract, new RegExp(id), `missing capability ${id}`);
  }

  assert.match(contract, /status: "production-gated"/);
  assert.match(contract, /liveDeploymentClaimed: false/);
  assert.match(contract, /browserProofClaimed: false/);
  assert.match(contract, /lowerTierProtection: \["tier1", "tier2", "tier3"\]/);
});

test('Tier4 route and page are wired without private data assumptions', () => {
  assert.match(route, /getTier4SystemContract/);
  assert.match(route, /NextResponse\.json/);
  assert.match(page, /Tier 4 production gate/);
  assert.match(page, /data-tier4-capability/);
  assert.match(page, /Live deployment claimed/);
  assert.doesNotMatch(page, /process\.env/);
  assert.doesNotMatch(page, /serviceAccount|private_key|secret/i);
});

test('Tier4 copy keeps provider and deployment claims gated', () => {
  assert.match(contract, /Unavailable providers must degrade/);
  assert.match(contract, /Live deployment requires Firebase credentials/);
  assert.match(contract, /Browser E2E is only claimed when Playwright runs successfully/);
  assert.doesNotMatch(contract, /live AR|live WebXR|live XR|production XR/i);
  assert.doesNotMatch(page, /live AR|live WebXR|live XR|production XR/i);
});
