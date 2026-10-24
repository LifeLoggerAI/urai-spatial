// Scope: local HTTP readiness only. Private auth and human visual review remain separate.
const SAFE_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const SYNTHETIC_ORIGIN = 'http://127.0.0.1';

export function assessNativeHttpRoute({ path, status, redirect = null, error = null,
  protectedRoute = false, requestedUrl = null, contentType = null } = {}) {
  if (!Number.isInteger(status)) {
    return { allowed: false, reason: String(error || 'ROUTE_NOT_TESTED') };
  }
  // These are page routes. A 204, 206, JSON or text response cannot prove
  // that the original UrAi page actually rendered. Browser acceptance is separate.
  if (status >= 200 && status < 300) {
    if (status !== 200 || !/^text\/html(?:\s*;|\s*$)/i.test(String(contentType || '').trim())) {
      return { allowed: false, reason: 'RENDERED_HTML_200_REQUIRED' };
    }
    return { allowed: true, kind: 'SUCCESS' };
  }
  if (protectedRoute && (status === 401 || status === 403)) {
    return { allowed: true, kind: 'AUTHORIZED_DENIAL' };
  }
  if (status >= 300 && status < 400) {
    if (!SAFE_REDIRECT_STATUSES.has(status) || typeof redirect !== 'string' || !redirect.trim()) {
      return { allowed: false, reason: 'UNVERIFIED_HTTP_REDIRECT' };
    }
    let origin, destination;
    try {
      origin = new URL(requestedUrl || SYNTHETIC_ORIGIN);
      destination = new URL(redirect, origin);
    } catch {
      return { allowed: false, reason: 'UNVERIFIED_HTTP_REDIRECT' };
    }
    // Never treat an off-origin location or downgrade as a healthy app route.
    if (!['http:', 'https:'].includes(origin.protocol) || destination.origin !== origin.origin) {
      return { allowed: false, reason: 'CROSS_ORIGIN_HTTP_REDIRECT' };
    }
    // The /login page is separately required to pass its own public HTTP gate.
    // A private route redirecting there is an authorized signed-out denial,
    // not proof of a signed-in private session.
    if (protectedRoute && destination.pathname === '/login' &&
        !destination.username && !destination.password) {
      return { allowed: true, kind: 'AUTHORIZED_LOGIN_REDIRECT' };
    }
    return { allowed: false, reason: 'UNVERIFIED_HTTP_REDIRECT' };
  }
  return { allowed: false, reason: 'UNEXPECTED_HTTP_STATUS' };
}
