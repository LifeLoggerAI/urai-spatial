// Legacy and current event privacy are both inputs, but neither is a grant.
// A hidden alias always wins; only an explicit current shareable value may
// yield shareable. Unknown/absent values remain private, never public.
export function normalizeLifeMapEventPrivacy(data) {
  if (!data || typeof data !== 'object') return 'private';
  if (data.privacyLevel === 'hidden' || data.privacy === 'hidden') return 'hidden';
  return data.privacyLevel === 'shareable' ? 'shareable' : 'private';
}
