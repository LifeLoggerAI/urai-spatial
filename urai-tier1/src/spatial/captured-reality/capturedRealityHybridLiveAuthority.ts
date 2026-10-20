import type { CapturedRealityPrivateMeshDescriptor } from './capturedRealityHybridDelivery'

/** Captured-world GLB bytes stay visible only while their exact private
 * approval and immutable object version remain active in the live asset
 * snapshot. The server separately rechecks consent/source on each delivery.
 * Fail closed on missing fields and any object, review or registration change.
 */
type PrivateAssetSnapshot = {
  exists(): boolean
  get(field: string): unknown
}
const SHA256 = /^[a-f0-9]{64}$/
export function privateHybridMeshLiveAuthority(
  snapshot: PrivateAssetSnapshot | null,
  uid: string,
  descriptor: CapturedRealityPrivateMeshDescriptor,
): boolean {
  if (!snapshot || !snapshot.exists() || !uid || !SHA256.test(descriptor.meshSha256)
    || !SHA256.test(descriptor.splatSha256) || snapshot.get('ownerId') !== uid
    || snapshot.get('revokedAt') != null || snapshot.get('revocationState') === 'revoked'
    || snapshot.get('state') === 'revoked') return false

  const mode = descriptor.accessMode
  const sourceHash = snapshot.get('sourceManifestSha256')
  const sha = String(snapshot.get('meshSha256') ?? '').toLowerCase()
  const approvedSha = snapshot.get(mode === 'proof' ? 'proofApprovedMeshSha256' : 'reviewApprovedMeshSha256')
  const approvedSource = snapshot.get(mode === 'proof' ? 'proofApprovedMeshSourceManifestSha256' : 'reviewApprovedMeshSourceManifestSha256')
  const generation = snapshot.get(mode === 'proof' ? 'proofApprovedMeshStorageGeneration' : 'reviewApprovedMeshStorageGeneration')
  const object = snapshot.get('meshRuntimeObject')
  const registration = snapshot.get('meshRegistration')
  if (sha !== descriptor.meshSha256 || approvedSha !== sha
    || typeof sourceHash !== 'string' || !SHA256.test(sourceHash) || approvedSource !== sourceHash
    || String(generation ?? '') !== descriptor.meshStorageGeneration
    || object !== `private-captured-reality/${uid}/${descriptor.assetId}/runtime/mesh/${sha}.glb`
    || !registration || JSON.stringify(registration) !== JSON.stringify(descriptor.registration)) return false

  if (mode === 'proof') {
    return (snapshot.get('state') === 'proof-ready' || snapshot.get('state') === 'ready')
      && snapshot.get('proofState') === 'technical-preview'
      && snapshot.get('proofIntegrityVerified') === true
      && snapshot.get('proofPrivacyReviewed') === true
      && snapshot.get('meshProofIntegrityVerified') === true
      && snapshot.get('meshProofPrivacyReviewed') === true
  }
  return snapshot.get('state') === 'ready'
    && snapshot.get('reviewState') === 'accepted'
    && snapshot.get('meshReviewState') === 'accepted'
    && snapshot.get('meshIndependentApproval') === true
    && typeof snapshot.get('meshReviewerUid') === 'string'
    && Boolean(String(snapshot.get('meshReviewerUid')).trim())
    && snapshot.get('meshReviewerUid') !== uid
}
