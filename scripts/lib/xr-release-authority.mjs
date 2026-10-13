import { readFileSync } from 'node:fs'
export const conditionalXrRoutes = Object.freeze(['/xr', '/spatial/ar-vr'])
/** Desktop preview is not a live immersive headset session.
 * /xr remains a disabled 404 until release authority is explicitly enabled.
 * /spatial/ar-vr is a marked non-immersive preview even while disabled.
 */
export function expectedConditionalXrStatus(route, authority) {
  const normalized = route.replace(/\/+$/, '') || '/'
  if (!conditionalXrRoutes.includes(normalized)) throw new Error('UNKNOWN_XR_ROUTE')
  return normalized === '/spatial/ar-vr' ? 200 : authority.expectedStatus
}

export function readXrReleaseAuthority(source, expectation) {
  const matches = [...source.matchAll(/^\s*liveArWebXrEnabled\s*:\s*(true|false),?\s*$/gm)]
  if (matches.length !== 1) throw new Error('XR launch authority must contain one literal source boundary')
  const enabled = matches[0][1] === 'true'
  if (expectation !== undefined && (!['true', 'false'].includes(expectation) || (expectation === 'true') !== enabled)) {
    throw new Error('XR expectation cannot override the governed source boundary')
  }
  return Object.freeze({ enabled, expectedStatus: enabled ? 200 : 404,
    claim: enabled ? 'source-enabled-pending-device-and-release-proof' : 'governed-post-launch-gated' })
}
export function currentXrReleaseAuthority() {
  return readXrReleaseAuthority(readFileSync(new URL('../../urai-tier1/src/lib/spatial-launch-boundaries.ts', import.meta.url), 'utf8'), process.env.URAI_EXPECT_XR_ENABLED)
}
export function inspectConditionalXrResponse(response, requestedUrl, authority, body = '') {
  try {
    const requested = new URL(requestedUrl)
    const actual = new URL(response.url)
    const normalize = (path) => path.replace(/\/+$/, '') || '/'
    const route = normalize(requested.pathname)
    if (!conditionalXrRoutes.includes(route) || actual.username || actual.password
      || actual.origin !== requested.origin || normalize(actual.pathname) !== route
      || response.status !== expectedConditionalXrStatus(route, authority)) return false
    if (route === '/spatial/ar-vr' && !authority.enabled) {
      // A directory listing or generic 200 must never pass as UrAi XR proof.
      return /data-xr-release-state=["']technical-preview["']/.test(body)
        && /data-xr-immersive-authority=["']disabled["']/.test(body)
        && /URAI AR \/ VR \/ XR entry chamber/.test(body)
        && /Live WebXR headset sessions remain disabled/.test(body)
    }
    return true
  } catch { return false }
}
export function inspectXrDeployProof(proof, authority) {
  const publicRoutes = proof?.publicRoutes
  const requiredSmokeRoutes = proof?.requiredSmokeRoutes
  const conditional = proof?.conditionalRoutes
  return Array.isArray(publicRoutes) && Array.isArray(requiredSmokeRoutes) && Array.isArray(conditional) &&
    conditionalXrRoutes.every((route) => !publicRoutes.includes(route) && !requiredSmokeRoutes.includes(route) &&
      conditional.some((entry) => entry?.route === route && entry?.enabled === authority.enabled && entry?.expectedStatus === expectedConditionalXrStatus(route, authority) && entry?.previewOnly === (route === '/spatial/ar-vr' && !authority.enabled))) &&
    proof?.claimBoundaries?.webxr === authority.claim && proof?.claimBoundaries?.questBrowser === 'unverified-until-device-proof'
}
export async function verifyConditionalXrRoutes(baseUrl, authority, fetchResponse = fetch) {
  const failures = []
  for (const route of conditionalXrRoutes.flatMap((route) => [route, `${route}/`])) {
    const url = new URL(route, baseUrl).href
    try {
      const response = await fetchResponse(url, { redirect: 'follow', headers: { 'user-agent': 'urai-governed-xr-boundary/1.0' } })
      // Consume the response before proceeding to the next finite route.
      const body = await response.text()
      if (!inspectConditionalXrResponse(response, url, authority, body)) failures.push(`${route} did not match governed XR status/origin/path`)
    } catch (error) { failures.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`) }
  }
  return failures
}
