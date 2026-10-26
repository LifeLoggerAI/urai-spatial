/** The Life Map must never expose owner data before a verified auth callback.
 * An unavailable auth provider is a signed-out threshold, not a perpetual
 * loading screen. A late verified callback may still restore private access.
 */
export type LifeMapAuthListener = (
  onIdentity: (userId: string | null) => void,
  onError: () => void,
) => () => void;

export function subscribeLifeMapAuth({
  listen, onResolved, timeoutMs = 12_000,
  schedule = setTimeout, cancel = clearTimeout,
}: {
  listen: LifeMapAuthListener;
  onResolved: (userId: string | null) => void;
  timeoutMs?: number;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}): () => void {
  let active = true;
  let initialIdentityReceived = false;
  let unsubscribe: () => void = () => {};
  const deny = () => {
    if (!active) return;
    initialIdentityReceived = true;
    onResolved(null);
  };
  // The deadline only governs the initial state. Later authenticated state
  // changes must still update the owner; no private state is inferred.
  const timeout = schedule(() => {
    if (!initialIdentityReceived) deny();
  }, timeoutMs);
  const resolve = (userId: string | null) => {
    if (!active) return;
    initialIdentityReceived = true;
    cancel(timeout);
    onResolved(userId);
  };
  // Listener errors are terminal. A late callback from that failed listener
  // must never revive private access; a new subscription is required.
  const fail = () => {
    if (!active) return;
    cancel(timeout);
    deny();
    active = false;
  };
  try {
    unsubscribe = listen(resolve, fail);
  } catch {
    fail();
  }
  return () => {
    active = false;
    cancel(timeout);
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}
