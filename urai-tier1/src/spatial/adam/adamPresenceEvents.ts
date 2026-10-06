// Queue only a local panel-open intent, including clicks before the runtime mounts.
export const ADAM_OPEN_EVENT = 'urai:adam-open'
let pending = false

export function requestAdamOpen() {
  pending = true
  window.dispatchEvent(new Event(ADAM_OPEN_EVENT))
}

export function consumeAdamOpenRequest() {
  const requested = pending
  pending = false
  return requested
}
