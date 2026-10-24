// The authored destination and explicit semantic action own the software WebGL
// handoff. Localized button text, icons and accessible labels are never routes.
// Server-side memory grants remain final; this grants no private data access.
const MEMORY_TOKEN = /^[A-Za-z0-9._:-]{1,120}$/

export function lifeMapSoftwareRouteDestination(action, href, origin) {
  if (action !== 'focus' && action !== 'replay') return null
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//') ||
      typeof origin !== 'string' || !origin) return null
  try {
    const base = new URL(origin)
    if ((base.protocol !== 'http:' && base.protocol !== 'https:') ||
        base.origin !== origin) return null
    const destination = new URL(href, base)
    if (destination.origin !== base.origin || destination.pathname !== '/' + action ||
        destination.hash) return null
    const memoryId = destination.searchParams.get('memoryId')
    const manifestId = destination.searchParams.get('manifestId')
    if (!MEMORY_TOKEN.test(memoryId ?? '') || !MEMORY_TOKEN.test(manifestId ?? '')) return null
    return destination
  } catch {
    return null
  }
}
