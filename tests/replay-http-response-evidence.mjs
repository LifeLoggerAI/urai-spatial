// Synthetic-safe browser request diagnosis. Do not retain signed query values.
export function redactReplayHttpUrl(value) {
  if (typeof value !== 'string' || !value) return null
  try {
    const url = new URL(value)
    const keys = [...url.searchParams.keys()]
    const redacted = keys.length
      ? '?' + keys.map((key) => encodeURIComponent(key) + '=[redacted]').join('&')
      : ''
    return url.origin + url.pathname + redacted
  } catch {
    return '<invalid-url>'
  }
}

// HTTP 4xx/5xx requests are not 'requestfailed' events in Playwright.
export function describeReplayHttpError(response) {
  const status = response.status()
  if (status < 400) return null
  const request = response.request()
  let frameUrl = null, referer = null, redirectedFrom = null, redirectedTo = null
  try { frameUrl = request.frame().url() } catch { /* Navigation request may have no frame. */ }
  try { referer = request.headers().referer ?? null } catch { /* Header data unavailable. */ }
  try { redirectedFrom = request.redirectedFrom()?.url() ?? null } catch { /* No redirect. */ }
  try { redirectedTo = request.redirectedTo()?.url() ?? null } catch { /* No redirect. */ }
  return {
    status,
    url: redactReplayHttpUrl(response.url()),
    resourceType: request.resourceType(),
    method: request.method(),
    pageUrl: redactReplayHttpUrl(frameUrl),
    referrer: redactReplayHttpUrl(referer),
    redirectedFrom: redactReplayHttpUrl(redirectedFrom),
    redirectedTo: redactReplayHttpUrl(redirectedTo),
  }
}
