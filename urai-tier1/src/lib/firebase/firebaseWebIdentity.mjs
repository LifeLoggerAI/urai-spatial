// Runtime-only, offline shape check. This does not prove Firebase ownership,
// provider connectivity, deployed Rules, or permission to release.
const TARGET_PROJECTS = new Set(['urai-4dc1d', 'urai-staging'])
const hasPlaceholder = (value) =>
  !value || /^(?:(?:demo|test|dev|fake|sample|local|ci)(?:[-_].*)?|placeholder|your[-_].*|replace[-_].*|changeme|undefined|null|<.*>)$/i.test(value) ||
  /(?:^|[-_])(?:demo|example|placeholder)(?:$|[-_])/i.test(value)

// The runtime must not interpret any nonempty public ENV values as approval.
// Custom Auth domains / Storage buckets require separate, source-reviewed
// provider proof. Accept only the known default naming forms for now.
export function hasCanonicalFirebaseWebIdentityShape(options) {
  if (!options || typeof options !== 'object') return false
  const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } = options
  const required = [apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId]
  if (required.some((item) => typeof item !== 'string' || item !== item.trim() || !item)) return false
  if (!TARGET_PROJECTS.has(projectId) || hasPlaceholder(apiKey)) return false
  if (authDomain !== projectId + '.firebaseapp.com') return false
  if (storageBucket !== projectId + '.firebasestorage.app' && storageBucket !== projectId + '.appspot.com') return false
  const appIdParts = /^1:(\d+):web:[A-Za-z0-9-]+$/.exec(appId)
  return /^\d+$/.test(messagingSenderId) && Boolean(appIdParts && appIdParts[1] === messagingSenderId)
}

// Firebase can have an existing DEFAULT app from another initializer. Reusing
// that app is not proof it belongs to the selected URAI Firebase project.
export function matchesConfiguredFirebaseAppIdentity(activeOptions, expectedOptions) {
  if (!activeOptions || !expectedOptions) return false
  return ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
    .every((key) => Boolean(expectedOptions[key]) && activeOptions[key] === expectedOptions[key])
}
