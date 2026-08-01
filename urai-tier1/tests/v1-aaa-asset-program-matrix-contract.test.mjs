import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const matrixPath = new URL('../../brand/v1-aaa-asset-program-matrix.json', import.meta.url)
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'))

const requiredStatuses = new Set([
  'certified-production-ready',
  'usable-requires-polish',
  'missing',
  'duplicate-obsolete',
  'blocked-external',
  'v2plus-prohibited-v1',
])

const requiredSurfaceIds = [
  'brand-master',
  'platform-icons',
  'runtime-image-estate-v1',
  'runtime-image-estate-v2-v5',
  'launch-critical-models',
  'home-sanctuary-and-layering',
  'sky-and-starfield-system',
  'orb-mood-and-aura-system',
  'product-surface-assets',
  'motion-system',
  'sensory-ready-assets',
  'ambient-audio',
  'accessibility-and-haptics',
  'performance-and-delivery',
  'social-and-launch-media',
  'store-listing-foundations',
  'production-custom-domain',
]

test('V1 AAA asset program matrix is current-main, bounded, and complete', () => {
  assert.equal(matrix.repository, 'LifeLoggerAI/urai-spatial')
  assert.equal(matrix.baseCommit, '7da6833613dde2df6c1153b9c14143bb0ba310e2')
  assert.equal(matrix.productionAuthorityIssue, 999)
  assert.equal(matrix.truthBoundaries.productionLiveClaimAllowed, false)
  assert.equal(matrix.truthBoundaries.dnsDependentWorkExcluded, true)
  assert.equal(matrix.truthBoundaries.certifiedV1ImmutableWithoutObjectiveImprovementProof, true)
  assert.equal(matrix.truthBoundaries.paidGenerationRequiresBoundedReceipt, true)
  assert.equal(matrix.truthBoundaries.providerCallsThisLane, 0)
  assert.equal(matrix.truthBoundaries.spendUsdThisLane, '0.00')

  assert.deepEqual(new Set(matrix.statusVocabulary), requiredStatuses)
  assert.ok(Array.isArray(matrix.surfaces))
  assert.ok(matrix.surfaces.length >= requiredSurfaceIds.length)

  const byId = new Map(matrix.surfaces.map((surface) => [surface.id, surface]))
  for (const id of requiredSurfaceIds) {
    assert.ok(byId.has(id), `Missing governed surface: ${id}`)
  }

  for (const surface of matrix.surfaces) {
    assert.ok(requiredStatuses.has(surface.status), `Invalid status for ${surface.id}`)
    assert.ok(Array.isArray(surface.scope) && surface.scope.length > 0, `Missing scope for ${surface.id}`)
    assert.ok(Array.isArray(surface.evidence) && surface.evidence.length > 0, `Missing evidence for ${surface.id}`)
    if (surface.status === 'blocked-external') {
      assert.equal(typeof surface.blocker, 'string', `Missing blocker for ${surface.id}`)
      assert.ok(surface.blocker.length > 0, `Empty blocker for ${surface.id}`)
    }
  }

  assert.equal(byId.get('runtime-image-estate-v1').status, 'certified-production-ready')
  assert.equal(byId.get('launch-critical-models').status, 'certified-production-ready')
  assert.equal(byId.get('sensory-ready-assets').status, 'certified-production-ready')
  assert.equal(byId.get('runtime-image-estate-v2-v5').status, 'v2plus-prohibited-v1')
  assert.equal(byId.get('production-custom-domain').status, 'blocked-external')
  assert.match(byId.get('production-custom-domain').blocker, /DNS/i)

  assert.ok(Array.isArray(matrix.nextExecutableActions))
  assert.ok(matrix.nextExecutableActions.length >= 3)
})
