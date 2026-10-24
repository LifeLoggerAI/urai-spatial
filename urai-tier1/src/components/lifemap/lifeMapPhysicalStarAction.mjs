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

// Graph links are navigation hints, never permission to disclose hidden nodes.
// This shared filter is also applied to the semantic inspector's related links.
export function lifeMapVisibleRelatedNodes(nodes, selected) {
  if (!selected || typeof selected.id !== 'string' || !selected.id || lifeMapNodeIsHidden(selected)) return [];
  if (!Array.isArray(nodes)) return [];
  return nodes.filter(node => node && node.id !== selected.id && !lifeMapNodeIsHidden(node) &&
    ((Array.isArray(selected.connectedTo) && selected.connectedTo.includes(node.id)) ||
      (Array.isArray(node.connectedTo) && node.connectedTo.includes(selected.id))));
}

// Treat either current or legacy hidden metadata as a veto. Legacy values may
// appear while older Firestore event documents are migrated.
export function lifeMapEventPrivacyLevel(raw) {
  if (lifeMapNodeIsHidden(raw)) return 'hidden';
  return raw && raw.privacyLevel === 'shareable' ? 'shareable' : 'private';
}

// Hiding an event must exclude it from search, keyboard selection and world
// rendering, not merely disable the Replay button after disclosure.
export function lifeMapFilterVisibleNodes(nodes) {
  return Array.isArray(nodes) ? nodes.filter(node => node && !lifeMapNodeIsHidden(node)) : [];
}

// An event-hidden memory must not reappear through the canonical-memory fallback.
// Preserve the veto from owner-scoped raw event nodes before visible-node filtering
// discards the hidden event. This is not authorization to read canonical memories.
export function lifeMapHiddenEventMemoryIds(nodes) {
  const hidden = new Set();
  if (!Array.isArray(nodes)) return hidden;
  for (const node of nodes) {
    if (!node || node.type !== 'memory' || !lifeMapNodeIsHidden(node)) continue;
    if (typeof node.memoryId !== 'string') continue;
    const id = node.memoryId.trim();
    if (id) hidden.add(id);
  }
  return hidden;
}

// A date-ordered query cannot prove that every event exists: Firestore omits
// documents missing the ordering field. Only an *unordered*, server-confirmed,
// below-limit owner query can prove complete event coverage for a fallback star.
export function lifeMapEventCoverageComplete(docCount, fromCache, limitCount = 240) {
  return Number.isSafeInteger(docCount) && docCount >= 0 &&
    Number.isSafeInteger(limitCount) && limitCount > 0 &&
    docCount < limitCount && fromCache === false;
}
