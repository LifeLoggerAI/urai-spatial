// Explicit, in-memory-only browser speech-to-text session gate.
// This grants no acoustic emotion inference, baseline reads or persistence.
export function createSpeechRecognitionSession() {
  let revision = 0
  let active = false
  return Object.freeze({
    grant() { revision += 1; active = true; return revision },
    revoke() { revision += 1; active = false; return revision },
    isCurrent(token) { return active && Number.isSafeInteger(token) && token === revision },
    get active() { return active },
    get revision() { return revision },
  })
}
