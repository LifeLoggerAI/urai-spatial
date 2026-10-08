type LocationListener = () => void

const listeners = new Set<LocationListener>()
let detachHistory: (() => void) | undefined

export function browserLocationSnapshot(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function serverLocationSnapshot(): string {
  return ''
}

// popstate covers Back/Forward, but pushState/replaceState (including Next's
// client-router commits) do not emit it. Observe committed location changes so
// a mounted private consumer cannot keep the previous query identity.
export function subscribeBrowserLocation(listener: LocationListener): () => void {
  if (typeof window === 'undefined') return () => {}
  listeners.add(listener)
  if (!detachHistory) {
    const history = window.history
    const previousPush = history.pushState
    const previousReplace = history.replaceState
    let active = true
    const notify = () => {
      if (active) for (const subscriber of [...listeners]) subscriber()
    }
    const notifyAfterCommit = () => {
      // Next commits history from useInsertionEffect. Keep snapshots synchronous,
      // but notify React observers only after the framework commit has returned.
      void Promise.resolve().then(notify)
    }
    const pushState: History['pushState'] = function (this: History, ...args) {
      const result = Reflect.apply(previousPush, this, args)
      notifyAfterCommit()
      return result
    }
    const replaceState: History['replaceState'] = function (this: History, ...args) {
      const result = Reflect.apply(previousReplace, this, args)
      notifyAfterCommit()
      return result
    }
    history.pushState = pushState
    history.replaceState = replaceState
    window.addEventListener('popstate', notify)
    window.addEventListener('hashchange', notify)
    detachHistory = () => {
      active = false
      window.removeEventListener('popstate', notify)
      window.removeEventListener('hashchange', notify)
      // A later framework wrapper may still delegate to our now-inert wrapper.
      // Preserve that framework's ownership instead of overwriting its patch.
      if (history.pushState === pushState) history.pushState = previousPush
      if (history.replaceState === replaceState) history.replaceState = previousReplace
    }
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      detachHistory?.()
      detachHistory = undefined
    }
  }
}
