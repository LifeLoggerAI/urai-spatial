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
