// Client presentation policy only. Jobs checks independently verified live
// claims, protected operator profile, and current two-project binding.
// Never treat Jobs-project role claims as Spatial identity authority.
export function isChalkSpatialOperatorClaim(claims) {
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return false;
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  return claims.role === 'admin' || claims.role === 'operator' ||
    claims.uraiSpatialAdmin === true || roles.includes('admin') || roles.includes('operator');
}
