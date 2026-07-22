import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'docs', 'crowdfunding', 'capture-route-manifest.json');
const receiptPath = path.join(repoRoot, 'docs', 'crowdfunding', 'capture-receipt-template.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('crowdfunding capture authority is fail-closed and tied to an exact release', () => {
  assert.ok(fs.existsSync(manifestPath), 'capture manifest must exist');
  assert.ok(fs.existsSync(receiptPath), 'capture receipt template must exist');
  const manifest = readJson(manifestPath);
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.authority.verifiedPublicReleaseSha, /^[0-9a-f]{40}$/);
  assert.match(manifest.authority.rollbackSha, /^[0-9a-f]{40}$/);
  assert.equal(manifest.rules.allowDraftPullRequestFootageAsLive, false);
  assert.equal(manifest.rules.allowLocalhostFootageAsLive, false);
  assert.equal(manifest.rules.requireExactReleaseReceipt, true);
  assert.equal(manifest.rules.requireSampleDataDisclosure, true);
  assert.ok(Array.isArray(manifest.routes) && manifest.routes.length >= 7);
  const routeIds = new Set(manifest.routes.map((route) => route.id));
  for (const requiredId of ['home', 'ground', 'life-map-demo', 'focus-demo', 'replay-demo', 'privacy', 'status']) {
    assert.ok(routeIds.has(requiredId), `missing required capture route: ${requiredId}`);
  }
  for (const route of manifest.routes) {
    assert.ok(route.canonicalPath.startsWith('/'), `${route.id} must use an absolute path`);
    assert.ok(['public', 'explicit-sample'].includes(route.dataMode));
    if (route.dataMode === 'explicit-sample') {
      assert.equal(route.disclosure, 'SAMPLE DATA', `${route.id} must disclose sample data`);
    }
  }
  const excluded = new Map(manifest.excludedDraftAuthorities.map((item) => [item.pullRequest, item.reason]));
  for (const pr of [855, 857, 860, 861]) {
    assert.ok(excluded.has(pr), `draft or unmerged PR ${pr} must be explicitly excluded`);
  }
});

test('receipt template requires release, privacy, security and approval evidence', () => {
  const receipt = fs.readFileSync(receiptPath, 'utf8');
  for (const phrase of ['Release identity verified before capture', 'Private data visible', 'Internal secrets or dashboards visible', 'Claims classification', 'Accessibility', 'Approved for edit', 'Fail-closed rule']) {
    assert.ok(receipt.includes(phrase), `receipt template missing: ${phrase}`);
  }
});
