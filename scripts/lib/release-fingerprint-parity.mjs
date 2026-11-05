/**
 * Strict read-only cross-check of the public release fingerprint and the
 * server deployment proof. This never grants deployment or user authorization.
 */
export function inspectReleaseFingerprintParity(fingerprint, proof, expectedSha, expectedAuthoritySha = expectedSha) {
  const failed = reason => Object.freeze({ ok: false, reason });
  if (typeof expectedSha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedSha)) {
    return failed('invalid_expected_sha');
  }
  if (typeof expectedAuthoritySha !== 'string' || !/^[0-9a-f]{40}$/.test(expectedAuthoritySha)) {
    return failed('invalid_expected_authority_sha');
  }
  try {
    if (!fingerprint || typeof fingerprint !== 'object' || Array.isArray(fingerprint) ||
        !proof || typeof proof !== 'object' || Array.isArray(proof)) {
      return failed('unreadable_release_evidence');
    }
    if (fingerprint.schemaVersion !== 'urai-release-fingerprint-1' ||
        fingerprint.releaseSha !== expectedSha ||
        fingerprint.authoritySha !== expectedAuthoritySha) {
      return failed('fingerprint_version_mismatch');
    }
    if (fingerprint.liveUrl !== 'https://urai.app' ||
        fingerprint.firebaseProject !== 'urai-4dc1d' ||
        fingerprint.deploymentScope !== 'functions-and-hosting') {
      return failed('fingerprint_scope_mismatch');
    }
    if (!/^[a-f0-9]{40}$/.test(fingerprint.rollbackSha) ||
        fingerprint.rollbackSha === expectedSha ||
        !/^[a-f0-9]{40}$/.test(fingerprint.functionsTreeSha) ||
        !/^[a-f0-9]{64}$/.test(fingerprint.firebaseStaticConfigSha256)) {
      return failed('fingerprint_integrity_missing');
    }
    if (!['pending-post-deploy-smoke', 'verified-post-deploy-smoke'].includes(fingerprint.certification)) {
      return failed('fingerprint_certification_invalid');
    }
    if (proof.repository !== 'LifeLoggerAI/urai-spatial' ||
        proof.runtimeRoot !== 'urai-tier1' ||
        proof.deploymentFreshness?.commitSha !== expectedSha ||
        proof.environment?.commitSha !== expectedSha ||
        proof.environment?.firebaseProject !== fingerprint.firebaseProject) {
      return failed('server_proof_disagrees');
    }
    return Object.freeze({ ok: true, reason: 'fingerprint_and_proof_match_reviewed_sha' });
  } catch {
    return failed('unreadable_release_evidence');
  }
}
