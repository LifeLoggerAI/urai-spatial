import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReleaseFingerprintParity } from '../scripts/lib/release-fingerprint-parity.mjs';

const SHA = 'a'.repeat(40);
const base = () => ({
  fingerprint: {
    schemaVersion: 'urai-release-fingerprint-1',
    releaseSha: SHA,
    authoritySha: SHA,
    rollbackSha: 'b'.repeat(40),
    firebaseProject: 'urai-4dc1d',
    liveUrl: 'https://urai.app',
    deploymentScope: 'functions-and-hosting',
    functionsTreeSha: 'c'.repeat(40),
    firebaseStaticConfigSha256: 'd'.repeat(64),
    certification: 'pending-post-deploy-smoke',
  },
  proof: {
    repository: 'LifeLoggerAI/urai-spatial',
    runtimeRoot: 'urai-tier1',
    deploymentFreshness: { commitSha: SHA },
    environment: { commitSha: SHA, firebaseProject: 'urai-4dc1d' },
  },
});
function check(name, mutate, ok) {
  test(name, () => {
    const data = base();
    mutate(data);
    assert.equal(inspectReleaseFingerprintParity(data.fingerprint, data.proof, SHA).ok, ok);
  });
}
check('matching source, fingerprints, project, rollback, and config accepted', () => {}, true);
check('old predecessor release SHA denied', d => { d.fingerprint.releaseSha = 'e'.repeat(40); }, false);
check('authority SHA disagrees denied', d => { d.fingerprint.authoritySha = 'e'.repeat(40); }, false);
test('separately pinned governance main SHA is accepted only when exact', () => {
  const data = base();
  data.fingerprint.authoritySha = 'e'.repeat(40);
  assert.equal(inspectReleaseFingerprintParity(data.fingerprint, data.proof, SHA, 'e'.repeat(40)).ok, true);
  assert.equal(inspectReleaseFingerprintParity(data.fingerprint, data.proof, SHA).ok, false);
});
test('invalid separately pinned authority SHA is denied', () => {
  const data = base();
  assert.equal(inspectReleaseFingerprintParity(data.fingerprint, data.proof, SHA, 'unknown').ok, false);
});
check('server deploy proof SHA differs denied', d => { d.proof.deploymentFreshness.commitSha = 'e'.repeat(40); }, false);
check('server environment SHA differs denied', d => { d.proof.environment.commitSha = 'e'.repeat(40); }, false);
check('different Firebase project denied', d => { d.proof.environment.firebaseProject = 'other'; }, false);
check('hosting-only predecessor denied', d => { d.fingerprint.deploymentScope = 'hosting-only'; }, false);
check('missing rollback denied', d => { d.fingerprint.rollbackSha = ''; }, false);
check('self-rollback denied', d => { d.fingerprint.rollbackSha = SHA; }, false);
check('missing functions tree denied', d => { d.fingerprint.functionsTreeSha = ''; }, false);
check('missing static digest denied', d => { d.fingerprint.firebaseStaticConfigSha256 = ''; }, false);
check('unknown certification denied', d => { d.fingerprint.certification = 'approved'; }, false);
check('missing claim surface denied', d => { d.proof.repository = 'unknown'; }, false);
check('fake live URL denied', d => { d.fingerprint.liveUrl = 'https://other.example'; }, false);
test('malformed input and throwing getter fail closed', () => {
  for (const [fingerprint, proof, sha] of [
    [null, base().proof, SHA], [base().fingerprint, [], SHA],
    [{...base().fingerprint, releaseSha: SHA}, base().proof, 'invalid'],
    [Object.defineProperty({}, 'schemaVersion', { get() { throw new Error('trapped'); } }), base().proof, SHA],
  ]) assert.equal(inspectReleaseFingerprintParity(fingerprint, proof, sha).ok, false);
});
