// Active UrAi Ground workforce source/provenance gate.
// The output is NOT a rendered-art, human-approval, or release certificate.
const HELPER_DESTINATIONS = Object.freeze({
  receptionist: 'reception',
  privacySteward: 'privacy',
  scheduleSteward: 'logistics',
  wellnessGuide: 'wellness',
  archivist: 'archive',
})
const SPECIALIST_IDS = Object.freeze([
  'relationshipLiaison', 'operator', 'builder', 'protector', 'mirror', 'guide',
])
const EXPECTED_ROLES = Object.freeze([...Object.keys(HELPER_DESTINATIONS), ...SPECIALIST_IDS])
const WORKFORCE_ROW = /\{ id: '([A-Za-z]+)', label: '([^']+)', destinationId: '([^']+)', asset: avatarAssets\.([A-Za-z]+), offset: \[([^\]]+)\], category: '(helper|specialist)' \}/g
const PATH = /^assets\/urai\/avatars\/[a-z0-9-]+\.webp$/
const HASH = /^[a-f0-9]{64}$/
const sourceString = value => typeof value === 'string' ? value : ''

export function inspectGroundActiveWorkforce({ route, world, workforce, destinations, registry, manifest }) {
  const failures = []
  const requireEvidence = (condition, reason) => { if (!condition) failures.push(reason) }
  route = sourceString(route)
  world = sourceString(world)
  workforce = sourceString(workforce)
  destinations = sourceString(destinations)
  registry = sourceString(registry)

  requireEvidence(/import GroundSpatialWorldClean from ['"]@\/app\/GroundSpatialWorldClean['"]/.test(route) &&
    /<GroundSpatialWorldClean\s*\/>/.test(route), 'ACTIVE_GROUND_ROUTE_NOT_MOUNTED')
  requireEvidence(/const GROUND_MODEL\s*=\s*["']\/assets\/urai\/generated\/models\/ground-world-terrain-v1\.glb["']/.test(world) &&
    /useGLTF\(GROUND_MODEL\)/.test(world), 'ACTIVE_GROUND_GLB_NOT_CONSUMED')
  requireEvidence(/<primitive object=\{world\}\s*\/>[\s\S]*<GroundWorkforcePresences world=\{world\}\s*\/>/.test(world),
    'ACTIVE_GROUND_WORKFORCE_NOT_MOUNTED')
  requireEvidence(/data-ground-workforce-art=["']provider-reference-pending-acceptance["']/.test(world),
    'GROUND_ART_ACCEPTANCE_NOT_EXPLICITLY_PENDING')
  requireEvidence(/aria-label=["']Ground workforce presences["']/.test(world), 'GROUND_ACCESSIBLE_DIRECTORY_ABSENT')
  requireEvidence(/actionAuthority: ['"]none['"]/.test(workforce) &&
    /status: ['"]reference-only['"]/.test(workforce) &&
    /visualStatus: ['"]provider-reference-pending-acceptance['"]/.test(workforce),
    'WORKFORCE_REFERENCE_AUTHORITY_CHANGED')
  requireEvidence(workforce.includes('world.getObjectByName(') &&
    workforce.includes('ground-destination-' + '$' + '{member.destinationId}') &&
    /if \(!anchor\) return null/.test(workforce), 'WORKFORCE_ANCHOR_AUTHORITY_CHANGED')
  requireEvidence(/<GroundPortraitLoadBoundary key=\{member\.id\} roleId=\{member\.id\}>/.test(workforce) &&
    /<Suspense fallback=\{null\}>/.test(workforce) &&
    /getDerivedStateFromError/.test(workforce), 'WORKFORCE_PORTRAIT_FAILURE_BOUNDARY_REMOVED')

  const roles = [...workforce.matchAll(WORKFORCE_ROW)].map(m => ({
    id: m[1], label: m[2], destinationId: m[3], assetId: m[4], offset: m[5], category: m[6],
  }))
  if (roles.length !== EXPECTED_ROLES.length) failures.push('WORKFORCE_COUNT_INVALID:' + roles.length)
  const roleNames = new Set(roles.map(x => x.id))
  if (roleNames.size !== roles.length || EXPECTED_ROLES.some(id => !roleNames.has(id)))
    failures.push('WORKFORCE_ROLE_SET_INVALID')
  const destinationsPresent = new Set([...destinations.matchAll(/^\s*id: "([A-Za-z][A-Za-z0-9]*)",?\s*$/gm)]
    .map(m => m[1]))
  const manifestAssets = Array.isArray(manifest?.assets) ? manifest.assets : []
  const recordPaths = new Set()
  const matchedPaths = []
  for (const role of roles) {
    const category = SPECIALIST_IDS.includes(role.id) ? 'specialist' : 'helper'
    const destination = category === 'specialist' ? 'council' : HELPER_DESTINATIONS[role.id]
    if (role.category !== category || role.destinationId !== destination || role.id !== role.assetId)
      failures.push('WORKFORCE_ROLE_BINDING_INVALID:' + role.id)
    if (!destinationsPresent.has(role.destinationId))
      failures.push('WORKFORCE_DESTINATION_MISSING:' + role.id)
    if (!/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(role.offset))
      failures.push('WORKFORCE_OFFSET_INVALID:' + role.id)
    const mapping = registry.match(new RegExp('^\\s{2}' + role.id +
      ': image\\(webp\\("/avatars/([a-z0-9-]+\\.webp)"\\)', 'm'))
    if (!mapping) {
      failures.push('WORKFORCE_PROVIDER_REGISTRY_MISSING:' + role.id)
      continue
    }
    const canonicalPath = 'assets/urai/avatars/' + mapping[1]
    matchedPaths.push(canonicalPath)
    if (!PATH.test(canonicalPath)) failures.push('WORKFORCE_ASSET_PATH_INVALID:' + role.id)
    if (recordPaths.has(canonicalPath)) failures.push('WORKFORCE_ASSET_NOT_UNIQUE:' + role.id)
    recordPaths.add(canonicalPath)
    const records = manifestAssets.filter(a => a?.canonicalPath === canonicalPath)
    if (records.length !== 1) {
      failures.push('WORKFORCE_PROVIDER_MANIFEST_MISSING_OR_DUPLICATE:' + role.id)
      continue
    }
    const record = records[0]
    if (record.status !== 'ready' || record.renderer !== 'provider' || record.alpha !== true ||
      !HASH.test(record.sha256 ?? '') || !Number.isSafeInteger(record.bytes) ||
      record.bytes <= 4096 || !record.sourcePath || !record.promptVersion)
      failures.push('WORKFORCE_PROVIDER_RECEIPT_INVALID:' + role.id)
  }
  return {
    ok: failures.length === 0,
    scope: 'source-binding-and-provider-records-only; rendered GLB/avatar art and reviewer acceptance NOT certified',
    roleCount: roles.length,
    roles: roles.map(x => x.id),
    assetPaths: matchedPaths,
    failures,
  }
}
