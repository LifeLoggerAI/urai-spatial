import { readFileSync } from 'node:fs'
export const conditionalXrRoutes = Object.freeze(['/xr', '/spatial/ar-vr'])
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
export function inspectConditionalXrResponse(response, requestedUrl, authority) {
  try {
    const requested = new URL(requestedUrl)
    const actual = new URL(response.url)
    const normalize = (path) => path.replace(/\/+$/, '') || '/'
    return conditionalXrRoutes.includes(normalize(requested.pathname)) && !actual.username && !actual.password &&
      actual.origin === requested.origin && normalize(actual.pathname) === normalize(requested.pathname) &&
      response.status === authority.expectedStatus
  } catch { return false }
}
export function inspectXrDeployProof(proof, authority) {
  const publicRoutes = proof?.publicRoutes
  const requiredSmokeRoutes = proof?.requiredSmokeRoutes
  const conditional = proof?.conditionalRoutes
  return Array.isArray(publicRoutes) && Array.isArray(requiredSmokeRoutes) && Array.isArray(conditional) &&
    conditionalXrRoutes.every((route) => !publicRoutes.includes(route) && !requiredSmokeRoutes.includes(route) &&
      conditional.some((entry) => entry?.route === route && entry?.enabled === authority.enabled && entry?.expectedStatus === authority.expectedStatus)) &&
    proof?.claimBoundaries?.webxr === authority.claim && proof?.claimBoundaries?.questBrowser === 'unverified-until-device-proof'
}
export async function verifyConditionalXrRoutes(baseUrl, authority, fetchResponse = fetch) {
  const failures = []
  for (const route of conditionalXrRoutes.flatMap((route) => [route, `${route}/`])) {
    const url = new URL(route, baseUrl).href
    try {
      const response = await fetchResponse(url, { redirect: 'follow', headers: { 'user-agent': 'urai-governed-xr-boundary/1.0' } })
      // Consume the response before proceeding to the next finite route.
      await response.text()
      if (!inspectConditionalXrResponse(response, url, authority)) failures.push(`${route} did not match governed XR status/origin/path`)
    } catch (error) { failures.push(`${route} failed: ${error instanceof Error ? error.message : String(error)}`) }
  }
  return failures
}
