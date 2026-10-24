// Physical star activation decides intent only. Ownership and route authority
// stay with the consent-filtered Life Map nodes and the destination server.
// The same client intent fence is used by physical stars, semantic navigation
// and the authored Focus/Replay threshold buttons. Server grants remain final.
export function lifeMapFocusAllowed(node, sourceMode) {
  if (!node || typeof node.id !== 'string' || !node.id.trim() || node.locked) return false;
  // Do not restore a revoked or hidden star from stale UI metadata.
  if (lifeMapNodeIsHidden(node)) return false;
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


// Centralized legacy/current privacy filter for every interaction surface.
export function lifeMapNodeIsHidden(node) {
  return Boolean(node && (node.privacyLevel === 'hidden' || node.privacy === 'hidden'));
}

// The 3D star field, route restoration and semantic navigator must agree on
// which node can become a selected memory. Locked stars may still be drawn as
// protected context, but their metadata cannot enter the selected-world view.
export function lifeMapNodeSelectable(node) {
  return Boolean(node && typeof node.id === 'string' && node.id.trim() &&
    !node.locked && !lifeMapNodeIsHidden(node));
}

// Graph links are navigation hints, never permission to disclose hidden nodes.
// This shared filter is also applied to the semantic inspector's related links.
export function lifeMapVisibleRelatedNodes(nodes, selected) {
  if (!selected || typeof selected.id !== 'string' || !selected.id || selected.locked || lifeMapNodeIsHidden(selected)) return [];
  if (!Array.isArray(nodes)) return [];
  return nodes.filter(node => node && node.id !== selected.id && !node.locked && !lifeMapNodeIsHidden(node) &&
    ((Array.isArray(selected.connectedTo) && selected.connectedTo.includes(node.id)) ||
      (Array.isArray(node.connectedTo) && node.connectedTo.includes(selected.id))));
}
