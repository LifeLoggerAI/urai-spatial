// Physical star activation decides intent only. Ownership and route authority
// stay with the consent-filtered Life Map nodes and the destination server.
// The same client intent fence is used by physical stars, semantic navigation
// and the authored Focus/Replay threshold buttons. Server grants remain final.
export function lifeMapFocusAllowed(node, sourceMode) {
  if (!node || typeof node.id !== 'string' || !node.id.trim() || node.locked) return false;
  // Do not restore a revoked or hidden star from stale UI metadata.
  if (node.privacyLevel === 'hidden' || node.privacy === 'hidden') return false;
  if (sourceMode === 'explicit-demo') return true;
  return sourceMode === 'private' && node.authorizedMemory === true &&
    typeof node.memoryId === 'string' && node.memoryId.trim().length > 0 &&
    typeof node.replayManifestId === 'string' && node.replayManifestId.trim().length > 0;
}

export function lifeMapPhysicalReplayAllowed(node, sourceMode) {
  return lifeMapFocusAllowed(node, sourceMode) && node.replayAvailable === true;
}

export function lifeMapPhysicalStarAction(clickedId, selectedId, phase, replayAllowed) {
  if (typeof clickedId !== 'string' || clickedId.length === 0) return 'ignore';
  if (clickedId !== selectedId) return 'select';
  if (phase !== 'arrival') return 'ignore';
  return replayAllowed === true ? 'replay' : 'ignore';
}
