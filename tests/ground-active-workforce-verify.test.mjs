import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { inspectGroundActiveWorkforce } from '../scripts/lib/ground-active-workforce-verify.mjs'
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const source = () => ({
  route: read('urai-tier1/src/app/ground/page.tsx'),
  world: read('urai-tier1/src/app/GroundSpatialWorldClean.tsx'),
  workforce: read('urai-tier1/src/app/GroundWorkforcePresences.tsx'),
  destinations: read('urai-tier1/src/app/ground/GroundWorldModel.ts'),
  registry: read('urai-tier1/src/spatial/assets/uraiAssets.ts'),
  manifest: JSON.parse(read('urai-tier1/public/assets/urai/final/manifests/asset-factory-spatial-handoff.json')),
})
function denied(change, expected) {
  const inputs=source();change(inputs)
  const r=inspectGroundActiveWorkforce(inputs)
  assert.equal(r.ok,false,JSON.stringify(r))
  assert.ok(r.failures.some(code=>code.includes(expected)),JSON.stringify(r.failures))
}
test('exact-source eleven Ground references pass source gate, not art acceptance',()=>{
  const r=inspectGroundActiveWorkforce(source())
  assert.equal(r.ok,true,JSON.stringify(r.failures))
  assert.equal(r.roleCount,11)
  assert.equal(new Set(r.assetPaths).size,11)
  assert.match(r.scope,/NOT certified/)
})
test('missing role is not hidden by other present artwork',()=>denied(
  s=>s.workforce=s.workforce.replace(/^\s*\{ id: 'archivist'.*$/m,''),
  'WORKFORCE_COUNT_INVALID'))
test('swapped specialist identity artwork denied',()=>denied(
  s=>s.workforce=s.workforce.replace('asset: avatarAssets.builder','asset: avatarAssets.operator'),
  'WORKFORCE_ROLE_BINDING_INVALID:builder'))
test('missing destination denied',()=>denied(
  s=>s.destinations=s.destinations.replace('id: "archive",',''),
  'WORKFORCE_DESTINATION_MISSING:archivist'))
test('duplicate portrait asset cannot count as eleven',()=>denied(
  s=>s.registry=s.registry.replace('/avatars/builder.webp','/avatars/operator.webp'),
  'WORKFORCE_ASSET_NOT_UNIQUE:builder'))
test('missing provider record denied',()=>denied(
  s=>s.manifest.assets=s.manifest.assets.filter(a=>!a.canonicalPath.endsWith('/protector.webp')),
  'WORKFORCE_PROVIDER_MANIFEST_MISSING_OR_DUPLICATE:protector'))
test('forged provider hash denied',()=>denied(
  s=>s.manifest.assets.find(a=>a.canonicalPath.endsWith('/receptionist.webp')).sha256='invalid',
  'WORKFORCE_PROVIDER_RECEIPT_INVALID:receptionist'))
test('advisory authority cannot become execute',()=>denied(
  s=>s.workforce=s.workforce.replace("actionAuthority: 'none'","actionAuthority: 'execute'"),
  'WORKFORCE_REFERENCE_AUTHORITY_CHANGED'))
test('final artwork cannot be claimed without human approval',()=>denied(
  s=>s.world=s.world.replace('provider-reference-pending-acceptance','certified-final'),
  'GROUND_ART_ACCEPTANCE_NOT_EXPLICITLY_PENDING'))
test('loss of portrait error boundary denied',()=>denied(
  s=>s.workforce=s.workforce.replace('getDerivedStateFromError','unhandledError'),
  'WORKFORCE_PORTRAIT_FAILURE_BOUNDARY_REMOVED'))
test('disabled accessible workforce navigation denied',()=>denied(
  s=>s.world=s.world.replace('aria-label="Ground workforce presences"',''),
  'GROUND_ACCESSIBLE_DIRECTORY_ABSENT'))
test('unmounted Ground renderer denied',()=>denied(
  s=>s.route=s.route.replace('<GroundSpatialWorldClean />','<div/>'),
  'ACTIVE_GROUND_ROUTE_NOT_MOUNTED'))
