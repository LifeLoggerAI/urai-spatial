// Physical star activation decides intent only. Ownership and route authority
// stay with the consent-filtered Life Map nodes and the destination server.
export function lifeMapPhysicalReplayAllowed(node, sourceMode) {
  if (!node || typeof node.id !== 'string' || !node.id || node.locked || node.replayAvailable !== true) return false;
  if (sourceMode === 'explicit-demo') return true;
  return sourceMode === 'private' && node.authorizedMemory === true &&
    typeof node.memoryId === 'string' && node.memoryId.trim().length > 0 &&
    typeof node.replayManifestId === 'string' && node.replayManifestId.trim().length > 0;
}

export function lifeMapPhysicalStarAction(clickedId, selectedId, phase, replayAllowed) {
  if (typeof clickedId !== 'string' || clickedId.length === 0) return 'ignore';
  if (clickedId !== selectedId) return 'select';
  if (phase !== 'arrival') return 'ignore';
  return replayAllowed === true ? 'replay' : 'ignore';
}
