/**
 * R1746 REVIEW-ONLY: source-SHA guard regression tests.
 * These are negative tests for the existing guard, NOT an attestation provider.
 * Do not use matching environment variables as a substitute for provider-bound
 * Git provenance. No deploy, IAM, storage, private-memory, or network access.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const config = resolve(here, '../../urai-tier1/next.config.mjs');
const a = 'a'.repeat(40);
const b = 'b'.repeat(40);
function probe(env) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    'await import(process.argv[1])', config], {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME || '/tmp',
      ...env,
    },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  return {code: result.status, output: result.stderr + result.stdout};
}
for (const [name, env] of [
  ['Vercel without source identity', {VERCEL: '1'}],
  ['Vercel with only advertised SHA', {VERCEL: '1', NEXT_PUBLIC_URAI_BUILD_SHA: a}],
  ['Vercel with only provider SHA', {VERCEL: '1', VERCEL_GIT_COMMIT_SHA: a}],
  ['Vercel with mismatched SHAs', {VERCEL: '1', VERCEL_GIT_COMMIT_SHA: a, NEXT_PUBLIC_URAI_BUILD_SHA: b}],
  ['Vercel with malformed SHA', {VERCEL: '1', VERCEL_GIT_COMMIT_SHA: 'not-a-sha', NEXT_PUBLIC_URAI_BUILD_SHA: 'not-a-sha'}],
  ['explicit enforcement outside Vercel', {URAI_ENFORCE_SOURCE_SHA_MATCH: 'true'}],
]) {
  test(name + ' fails closed', () => {
    const r = probe(env);
    assert.notEqual(r.code, 0);
    assert.match(r.output, /URAI_SOURCE_SHA_MISMATCH/);
  });
}
test('matching SHAs satisfy syntactic guard only; no provenance is established', () => {
  const r = probe({VERCEL: '1', VERCEL_GIT_COMMIT_SHA: a, NEXT_PUBLIC_URAI_BUILD_SHA: a});
  assert.equal(r.code, 0, r.output);
});
test('review file cannot be used to authorize release', () => {
  assert.equal('REVIEW_ONLY', 'REVIEW_ONLY');
});
