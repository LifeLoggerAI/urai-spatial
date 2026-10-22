import { shouldHandleRealmEscape } from './realmEscapeEligibility.mjs'

// The neutral Replay horizon is a mounted Replay route too. The global world
// controller intentionally delegates Escape to the Replay owner; without this
// listener, missing or unauthorized memory states had no keyboard return.
// Keep the return event with the canonical world controller, not router.back().
export function bindReplayHorizonEscape(eventTarget, onReturn, canHandle = shouldHandleRealmEscape) {
  const handle = event => {
    if (!canHandle(event)) return
    event.preventDefault()
    event.stopPropagation()
    onReturn()
  }
  eventTarget.addEventListener('keydown', handle, true)
  return () => eventTarget.removeEventListener('keydown', handle, true)
}
