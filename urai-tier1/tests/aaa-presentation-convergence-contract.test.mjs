import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const authorityPath = path.join(repositoryRoot, 'operations/presentation/aaa-presentation-convergence.json')
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'))

const requiredWorkstreams = [
  'spatial-visual-convergence',
  'motion-convergence',
  'audio-haptics',
  'final-exact-release-capture',
  'brand-platform-outputs',
  'before-rest-world-film',
  'waiting-room-launch-media',
  'private-memory-film',
  'finite-time',
  'physical-xr-certification',
  'performance-delivery',
  'public-defensibility',
]

const allowedStatuses = new Set([
  'accepted',
  'active',
  'blocked-human',
  'blocked-external',
  'separate-physical-gate',
  'intentionally-fallback',
])

const workflowReferencePattern = /^github-actions:[1-9]\d*$/
const artifactReferencePattern = /^artifact:[A-Za-z0-9][A-Za-z0-9._-]{2,}$/
const digestReferencePattern = /^sha256:[a-f0-9]{64}$/

test('AAA presentation convergence authority is complete and fail closed', () => {
  assert.equal(authority.repository, 'LifeLoggerAI/urai-spatial')
  assert.equal(authority.authorityIssue, 'LifeLoggerAI/urai-spatial#1030')

  assert.equal(authority.acceptedEstate.runtimeImages.ready, 213)
  assert.equal(authority.acceptedEstate.runtimeImages.missing, 0)
  assert.equal(authority.acceptedEstate.launchCriticalModels.promoted, 7)
  assert.equal(authority.acceptedEstate.launchCriticalModels.pending, 0)
  assert.equal(authority.acceptedEstate.sharedSensoryAssets.ready, 3)
  assert.equal(authority.acceptedEstate.sharedSensoryAssets.candidate, 2)

  const boundaries = authority.truthBoundaries
  assert.equal(boundaries.productionLiveClaimAllowed, false)
  assert.equal(boundaries.automaticPaidGenerationAllowed, false)
  assert.equal(boundaries.automaticRetryOrRemixAllowed, false)
  assert.equal(boundaries.acceptedAssetRegenerationAllowed, false)
  assert.equal(boundaries.privateIdentityMediaAllowedInPublicRepo, false)
  assert.equal(boundaries.generatedUiMayBeRepresentedAsProduct, false)
  assert.equal(boundaries.finalPublicMediaRequiresExactReleaseSha, true)
  assert.equal(boundaries.providerCallsThisChange, 0)
  assert.equal(boundaries.spendUsdThisChange, '0.00')

  const workstreamIds = authority.workstreams.map((stream) => stream.id)
  assert.equal(new Set(workstreamIds).size, workstreamIds.length, 'duplicate workstream ids')
  assert.deepEqual([...workstreamIds].sort(), [...requiredWorkstreams].sort(), 'workstream set must match the bounded authority exactly')

  const byId = new Map(authority.workstreams.map((stream) => [stream.id, stream]))
  for (const stream of authority.workstreams) {
    assert.ok(allowedStatuses.has(stream.status), `invalid status: ${stream.id}`)
    assert.ok(Array.isArray(stream.outputs) && stream.outputs.length > 0, `missing outputs: ${stream.id}`)
    if (stream.status.startsWith('blocked-')) {
      assert.equal(typeof stream.blocker, 'string', `missing blocker: ${stream.id}`)
      assert.ok(stream.blocker.trim().length > 20, `weak blocker: ${stream.id}`)
    }
    if (stream.status === 'accepted') {
      assert.ok(Array.isArray(stream.evidence) && stream.evidence.length > 0, `missing acceptance evidence: ${stream.id}`)
      for (const reference of stream.evidence) validateEvidenceReference(stream.id, reference)
    }
    if (stream.status === 'intentionally-fallback') {
      assert.equal(typeof stream.omission, 'string', `missing omission reason: ${stream.id}`)
      assert.ok(stream.omission.trim().length > 20, `weak omission reason: ${stream.id}`)
      assert.equal(typeof stream.fallback, 'string', `missing safe fallback: ${stream.id}`)
      assert.ok(stream.fallback.trim().length > 10, `weak safe fallback: ${stream.id}`)
    }
  }

  assert.equal(byId.get('final-exact-release-capture').status, 'blocked-external')
  assert.match(byId.get('final-exact-release-capture').blocker, /release SHA/i)
  assert.equal(byId.get('brand-platform-outputs').status, 'blocked-human')
  assert.equal(byId.get('private-memory-film').status, 'blocked-human')
  assert.equal(byId.get('physical-xr-certification').status, 'separate-physical-gate')

  assert.match(authority.completionRule, /Every public-facing asset/)
  assert.match(authority.completionRule, /No unfinished artifact/)
})

function validateEvidenceReference(streamId, reference) {
  assert.equal(typeof reference, 'string', `invalid evidence reference: ${streamId}`)
  assert.equal(reference, reference.trim(), `untrimmed evidence reference: ${streamId}`)

  if (reference.startsWith('operations/') || reference.startsWith('urai-tier1/')) {
    const resolved = path.resolve(repositoryRoot, reference)
    assert.ok(resolved.startsWith(`${repositoryRoot}${path.sep}`), `evidence path escapes repository: ${streamId}`)
    assert.ok(fs.existsSync(resolved), `missing evidence path: ${streamId}: ${reference}`)
    return
  }

  if (reference.startsWith('github-actions:')) {
    assert.match(reference, workflowReferencePattern, `invalid workflow run reference: ${streamId}`)
    return
  }

  if (reference.startsWith('artifact:')) {
    assert.match(reference, artifactReferencePattern, `invalid artifact reference: ${streamId}`)
    return
  }

  if (reference.startsWith('sha256:')) {
    assert.match(reference, digestReferencePattern, `invalid SHA-256 reference: ${streamId}`)
    return
  }

  assert.fail(`unbounded evidence reference: ${streamId}: ${reference}`)
}
