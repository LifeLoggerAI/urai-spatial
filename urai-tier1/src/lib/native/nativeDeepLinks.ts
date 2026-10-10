import links from './paths.json' with { type: 'json' }

const paths = new Set(links.paths)

// A native navigation link never carries OAuth tokens, codes, account data or
// return URLs. Provider callbacks are handled by their native SDK separately.
export function nativeNavigationPath(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string' || rawUrl.length > 2048 || /[\s\\?#]/.test(rawUrl)) return null
  try {
    const url = new URL(rawUrl)
    if (url.origin !== links.origin || url.username || url.password || url.search || url.hash) return null
    return paths.has(url.pathname) ? url.pathname : null
  } catch {
    return null
  }
}

type NativeLinkApi = {
  addListener: (event: 'appUrlOpen', listener: (event: { url: string }) => void) => Promise<{ remove: () => Promise<void> }>
  getLaunchUrl: () => Promise<{ url: string } | undefined>
}

export async function observeNativeNavigation(
  app: NativeLinkApi,
  navigate: (path: string) => void,
  isActive: () => boolean,
): Promise<() => Promise<void>> {
  let listening = true
  const receive = (event: { url: string }) => {
    if (!listening || !isActive()) return
    const target = nativeNavigationPath(event.url)
    if (target) navigate(target)
  }
  // Attach first, so a warm event cannot be lost while the launch URL resolves.
  const listener = await app.addListener('appUrlOpen', receive)
  void app.getLaunchUrl().then(launch => {
    if (launch) receive(launch)
  }).catch(() => {
    // A missing cold-launch URL does not disable subsequent warm links.
  })
  return async () => { listening = false; await listener.remove() }
}
