// Evidence must belong to the exact configured candidate origin and route.
export function createCandidateRouteAuthority(baseUrl) {
  const base = new URL(baseUrl)
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Candidate origin must be an HTTP(S) URL without credentials')
  }
  const normalize = (pathname) => pathname.replace(/\/+$/, '') || '/'
  const isExactRoute = (value, route) => {
    try {
      const actual = new URL(value)
      const expected = new URL(route, base)
      return !actual.username && !actual.password && expected.origin === base.origin &&
        actual.origin === base.origin && normalize(actual.pathname) === normalize(expected.pathname)
    } catch { return false }
  }
  const assertExactRoute = (value, route) => {
    if (!isExactRoute(value, route)) throw new Error('Candidate origin or route drifted during evidence capture')
  }
  return Object.freeze({ origin: base.origin, isExactRoute, assertExactRoute })
}
