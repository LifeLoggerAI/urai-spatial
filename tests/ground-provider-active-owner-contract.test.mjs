import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const verifier = read('scripts/verify-provider-asset-handoff.mjs')
const route = read('urai-tier1/src/app/ground/page.tsx')
const world = read('urai-tier1/src/app/GroundSpatialWorldClean.tsx')
const workforce = read('urai-tier1/src/app/GroundWorkforcePresences.tsx')
const extract = () => {
  const start = verifier.indexOf("    routes: ['/ground'],")
  const end = verifier.indexOf("  { routes: ['/life-map']", start)
  assert.ok(start >= 0 && end > start, 'Ground contract must be bounded')
  return verifier.slice(start, end)
}
test('active Ground route mounts GLB scene and workforce', () => {
  assert.match(route, /<GroundSpatialWorldClean \/>/)
  assert.match(world, /useGLTF\(GROUND_MODEL\)/)
  assert.match(world, /<primitive object=\{world\} \/>[\s\S]*<GroundWorkforcePresences world=\{world\} \/>/)
})
test('provider verifier inspects the active Ground sources', () => {
  const contract = extract()
  for (const file of ['urai-tier1/src/app/ground/page.tsx',
    'urai-tier1/src/app/GroundSpatialWorldClean.tsx',
    'urai-tier1/src/app/GroundWorkforcePresences.tsx'])
    assert.ok(contract.includes("'" + file + "'"), file)
  assert.doesNotMatch(contract, /GroundContinuityArchitecture\.tsx|EmbodiedGroundScene\.tsx/)
  assert.match(contract, /requiredByFile:/)
})
test('provider verifier binds each visible Ground ownership marker to source', () => {
  const contract = extract()
  for (const marker of ['<GroundSpatialWorldClean />','<GroundWorkforcePresences world={world} />',
    '<primitive object={world} />','useGLTF(GROUND_MODEL)',
    'data-ground-runtime-owner="final-glb-infrastructure-world"',
    'data-ground-workforce-art="provider-reference-pending-acceptance"'])
    assert.ok(contract.includes(marker), marker)
})
test('Ground remains pending independent art approval and advisory-only', () => {
  const contract = extract()
  assert.match(contract, /provider-reference-pending-acceptance/)
  assert.match(world, /data-ground-workforce-art="provider-reference-pending-acceptance"/)
  assert.match(workforce, /visualStatus: 'provider-reference-pending-acceptance'/)
  assert.match(workforce, /actionAuthority: 'none'/)
})
test('retired owner cannot grant active-route verification', () => {
  const contract = extract()
  assert.doesNotMatch(contract, /'GroundContinuityArchitecture'|'EmbodiedGroundScene'/)
  assert.doesNotMatch(route.replace('<GroundSpatialWorldClean />', '<div>Retired Ground</div>'),
    /<GroundSpatialWorldClean \/>/)
})
