// Legacy and current event privacy are both inputs, but neither is a grant.
// A hidden alias always wins; only an explicit current shareable value may
// yield shareable. Unknown/absent values remain private, never public.
export function normalizeLifeMapEventPrivacy(data) {
  if (!data || typeof data !== 'object') return 'private';
  if (data.privacyLevel === 'hidden' || data.privacy === 'hidden') return 'hidden';
  return data.privacyLevel === 'shareable' ? 'shareable' : 'private';
}

// Firestore's owner path is authoritative. An older document may omit userId,
// but an explicit foreign/invalid userId is conflicting evidence and must not
// enter another owner's Life Map events, eras, search, or graph relationships.
export function lifeMapOwnerDocumentAllowed(data, expectedOwner) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      typeof expectedOwner !== 'string' || !expectedOwner.trim() ||
      expectedOwner === 'demo-user') return false;
  if (!Object.hasOwn(data, 'userId')) return true;
  return typeof data.userId === 'string' && data.userId === expectedOwner;
}

// Project an entire Firestore snapshot before updating React state. If a
// document or mapper throws, no partial private constellation is admitted.
export function projectLifeMapOwnerSnapshot(docs, expectedOwner, projector) {
  if (!Array.isArray(docs) || typeof projector !== 'function' ||
      !lifeMapOwnerDocumentAllowed({}, expectedOwner)) {
    return { ok: false, items: [] };
  }
  const items = [];
  try {
    for (const item of docs) {
      if (!item || typeof item.id !== 'string' || !item.id || typeof item.data !== 'function') {
        return { ok: false, items: [] };
      }
      const data = item.data();
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { ok: false, items: [] };
      }
      if (!lifeMapOwnerDocumentAllowed(data, expectedOwner)) continue;
      const projected = projector(item.id, data);
      if (!projected || typeof projected !== 'object' || Array.isArray(projected) ||
          projected.id !== item.id) {
        return { ok: false, items: [] };
      }
      items.push(projected);
    }
    return { ok: true, items };
  } catch {
    return { ok: false, items: [] };
  }
}

// Firestore initially emits cache-only or locally pending snapshots before the
// backend has confirmed both fresh data and completed writes. Neither is safe
// authorization to reveal a private memory or consent-protected constellation.
export function lifeMapServerConfirmed(metadata) {
  try {
    return Boolean(metadata && typeof metadata === 'object' &&
      metadata.fromCache === false && metadata.hasPendingWrites === false);
  } catch {
    return false;
  }
}
