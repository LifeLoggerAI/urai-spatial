/**
 * Private-memory browser rendering must not trust optimistic local writes or
 * Firestore offline/cache snapshots as proof of current consent or existence.
 * The server and Storage/IAM are still the authoritative security boundary.
 */
export type SnapshotTrustMetadata = {
  readonly fromCache: boolean
  readonly hasPendingWrites: boolean
}
export function isServerConfirmedSnapshot(metadata: SnapshotTrustMetadata | null | undefined): boolean {
  return metadata?.fromCache === false && metadata?.hasPendingWrites === false
}
