/** Read-only exact-deployment proof for the governed live Spatial smoke.
 * A known commit is NOT equivalent to the commit currently under review.
 * This function never authorizes publishing, consent, XR, or cloud changes.
 */
export function inspectExactDeploymentSource(proof, expectedSourceSha) {
  if (typeof expectedSourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(expectedSourceSha)) {
    return Object.freeze({ ok: false, reason: 'expected_sha_missing_or_invalid' });
  }
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    return Object.freeze({ ok: false, reason: 'deploy_proof_unreadable' });
  }
  if (proof.repository !== 'LifeLoggerAI/urai-spatial' || proof.runtimeRoot !== 'urai-tier1') {
    return Object.freeze({ ok: false, reason: 'wrong_repository_or_runtime' });
  }
  const declared = proof.deploymentFreshness?.commitSha;
  const environment = proof.environment?.commitSha;
  if (declared !== expectedSourceSha || environment !== expectedSourceSha ||
      proof.deploymentFreshness?.commitShaKnown !== true ||
      proof.deploymentFreshness?.requiredForReady !== true) {
    return Object.freeze({ ok: false, reason: 'deployed_sha_mismatch' });
  }
  return Object.freeze({ ok: true, reason: 'exact_source_sha_verified' });
}
