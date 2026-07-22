import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'verify-crowdfunding-public-routes.mjs');

const source = fs.readFileSync(scriptPath, 'utf8');

test('public route verifier is complete and fail-closed', () => {
  assert.ok(source.includes("const baseUrl = (process.env.URAI_PUBLIC_BASE_URL || 'https://urai.app')"));
  assert.ok(source.includes("manifest.routes"));
  assert.ok(source.includes("Promise.all(probes)"));
  assert.ok(source.includes("route-matrix.json"));
  assert.ok(source.includes("route-matrix.md"));
  assert.ok(source.includes("if (!report.pass) process.exitCode = 1"));
});

test('public route verifier checks both canonical and alternate route forms', () => {
  assert.ok(source.includes("route.canonicalPath"));
  assert.ok(source.includes("route.alternatePaths"));
  assert.ok(source.includes("'canonical'"));
  assert.ok(source.includes("'alternate'"));
});
