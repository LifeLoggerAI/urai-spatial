import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectExactDeploymentSource } from '../scripts/lib/exact-deploy-source-check.mjs';

const SHA = 'a'.repeat(40);
const proof = () => ({
  repository: 'LifeLoggerAI/urai-spatial',
  runtimeRoot: 'urai-tier1',
  deploymentFreshness: { commitSha: SHA, commitShaKnown: true, requiredForReady: true },
  environment: { commitSha: SHA },
});
const accepts = (name, change, expected) => test(name, () => {
  const p = proof();
  change(p);
  assert.equal(inspectExactDeploymentSource(p, SHA).ok, expected);
});
accepts('exact source proof accepted', () => {}, true);
accepts('newer but wrong deployed SHA denied', p => { p.deploymentFreshness.commitSha = 'b'.repeat(40); p.environment.commitSha = 'b'.repeat(40); }, false);
accepts('environment and freshness disagree denied', p => { p.environment.commitSha = 'b'.repeat(40); }, false);
accepts('wrong repository denied', p => { p.repository = 'LifeLoggerAI/urai-staging'; }, false);
accepts('wrong runtime root denied', p => { p.runtimeRoot = 'other'; }, false);
accepts('unknown commit denied', p => { p.deploymentFreshness.commitSha = 'unknown'; }, false);
accepts('not ready commit denied', p => { p.deploymentFreshness.commitShaKnown = false; }, false);
accepts('not required commit denied', p => { p.deploymentFreshness.requiredForReady = false; }, false);
test('expected SHA must be immutable full lowercase hex', () => {
  for (const input of ['', 'unknown', 'A'.repeat(40), 'a'.repeat(39), 'b'.repeat(41), undefined]) {
    assert.equal(inspectExactDeploymentSource(proof(), input).ok, false);
  }
});
test('unreadable and hostile objects fail closed', () => {
  for (const bad of [null, undefined, '', [], {}, { deploymentFreshness: {} }]) {
    assert.equal(inspectExactDeploymentSource(bad, SHA).ok, false);
  }
});
