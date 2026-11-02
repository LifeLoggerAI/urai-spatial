/** Reopening a private film after lost connectivity must acquire fresh Firebase
 * sessions and server consent. It must never revive a previous Blob URL. */
export function createPrivateMovieReconnectPolicy(
  reacquireAuthority: () => void,
  isOnline: () => boolean,
) {
  let interrupted = !isOnline()
  let disposed = false
  return {
    observeOffline() { if (!disposed) interrupted = true },
    observeOnline() {
      if (disposed || !interrupted || !isOnline()) return
      interrupted = false
      reacquireAuthority()
    },
    dispose() { disposed = true; interrupted = false },
  }
}
