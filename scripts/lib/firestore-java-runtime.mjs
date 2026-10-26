export function parseJavaMajorVersion(output) {
  const banner = String(output ?? '')
  const match = banner.match(/\b(?:openjdk|java)\s+(?:version\s+)?["']?(\d+)(?:\.(\d+))?/i)
  if (!match) return null
  const major = Number(match[1] === '1' ? match[2] : match[1])
  return Number.isSafeInteger(major) && major > 0 ? major : null
}
export function assessFirestoreJava({ status, errorCode, stdout, stderr, explicit = false, strict = false }) {
  if (errorCode === 'ENOENT' && !explicit) {
    return strict
      ? { kind: 'blocked', reason: 'FIRESTORE_EMULATOR_REQUIRED_JAVA_UNAVAILABLE' }
      : { kind: 'missing', reason: 'JAVA_UNAVAILABLE_STATIC_ONLY' }
  }
  if (errorCode || status !== 0)
    return { kind: 'blocked', reason: 'FIRESTORE_TEST_JAVA_SPAWN_FAILED:' + (errorCode || String(status)) }
  const major = parseJavaMajorVersion(String(stderr ?? '') + '\n' + String(stdout ?? ''))
  if (major === null) return { kind: 'blocked', reason: 'FIRESTORE_TEST_JAVA_VERSION_UNVERIFIABLE' }
  if (major < 21) return { kind: 'blocked', reason: 'FIRESTORE_EMULATOR_REQUIRES_JAVA_21_FOUND_' + major }
  return { kind: 'ok', major }
}
