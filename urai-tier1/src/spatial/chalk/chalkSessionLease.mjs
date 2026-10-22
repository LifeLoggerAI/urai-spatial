// An engineering observation is bound to one Auth lifetime and one navigation.
// A return to the same route after navigating away must not revive the request.
export function isChalkSessionLeaseCurrent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
  const { requestedUid, currentUid, requestedAuthEpoch, currentAuthEpoch,
    requestedRoute, currentRoute, requestedRouteEpoch, currentRouteEpoch } = input;
  return typeof requestedUid === 'string' && requestedUid.length > 0 &&
    currentUid === requestedUid &&
    Number.isSafeInteger(requestedAuthEpoch) && requestedAuthEpoch >= 0 &&
    currentAuthEpoch === requestedAuthEpoch &&
    typeof requestedRoute === 'string' && requestedRoute.length > 0 &&
    currentRoute === requestedRoute &&
    Number.isSafeInteger(requestedRouteEpoch) && requestedRouteEpoch >= 0 &&
    currentRouteEpoch === requestedRouteEpoch;
}
