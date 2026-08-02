import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const realRepositoryRoot = fs.realpathSync(repositoryRoot)
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

const physicalGateWorkstreams = new Set(['physical-xr-certification'])
const workflowReferencePattern = /^github-actions:[1-9]\d*$/
const digestReferencePattern = /^sha256:[a-f0-9]{64}$/

test('AAA presentation convergence authority is complete and fail closed', () => {
  assert.equal(authority.repository, 'LifeLoggerAI/urai-spatial')
  assert.equal(authority.authorityIssue, 'LifeLoggerAI/urai-spatial#1030')

  const declaredStatuses = authority.statusVocabulary
  assert.ok(Array.isArray(declaredStatuses), 'status vocabulary must be an array')
  assert.equal(new Set(declaredStatuses).size, declaredStatuses.length, 'duplicate status vocabulary entries')
  assert.deepEqual([...declaredStatuses].sort(), [...allowedStatuses].sort(), 'status vocabulary must match allowed statuses exactly')

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
      assertSubstantiveProse(stream.blocker, 20, `blocker: ${stream.id}`)
    }

    if (stream.status === 'separate-physical-gate') {
      assert.ok(physicalGateWorkstreams.has(stream.id), `non-physical workstream assigned to physical gate: ${stream.id}`)
      const blocker = assertSubstantiveProse(stream.blocker, 40, `physical-device blocker: ${stream.id}`)
      assert.match(blocker, /\b(?:device|hardware|physical|quest|xr|ar)\b/i, `physical gate lacks device-specific blocker: ${stream.id}`)
    }

    if (stream.status === 'accepted') {
      assert.ok(Array.isArray(stream.evidence) && stream.evidence.length > 0, `missing acceptance evidence: ${stream.id}`)
      for (const reference of stream.evidence) validateEvidenceReference(stream.id, reference)
    }

    if (stream.status === 'intentionally-fallback') {
      const omission = assertSubstantiveProse(stream.omission, 20, `omission reason: ${stream.id}`)
      assert.ok(stream.fallback && typeof stream.fallback === 'object' && !Array.isArray(stream.fallback), `fallback must be a structured behavior: ${stream.id}`)
      const behavior = assertSubstantiveProse(stream.fallback.behavior, 20, `fallback behavior: ${stream.id}`)
      assertSubstantiveProse(stream.fallback.trigger, 15, `fallback trigger: ${stream.id}`)
      assert.ok(Array.isArray(stream.fallback.evidence) && stream.fallback.evidence.length > 0, `fallback evidence is required: ${stream.id}`)
      for (const reference of stream.fallback.evidence) validateEvidenceReference(stream.id, reference)
      assert.notEqual(normalizeWordContent(omission), normalizeWordContent(behavior), `fallback behavior must differ from omission: ${stream.id}`)
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

function assertSubstantiveProse(value, minimumLength, label) {
  assert.equal(typeof value, 'string', `missing ${label}`)
  const normalized = value.trim().replace(/\s+/g, ' ')
  assert.ok(normalized.length > minimumLength, `weak ${label}`)
  assert.match(normalized, /[A-Za-z0-9]/, `placeholder-only ${label}`)
  const words = normalized.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []
  assert.ok(words.length >= 3, `non-substantive ${label}`)
  return normalized
}

function normalizeWordContent(value) {
  return (value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).join(' ').toLowerCase()
}

function validateEvidenceReference(streamId, reference) {
  assert.equal(typeof reference, 'string', `invalid evidence reference: ${streamId}`)
  assert.equal(reference, reference.trim(), `untrimmed evidence reference: ${streamId}`)

  if (reference.startsWith('operations/') || reference.startsWith('urai-tier1/')) {
    const resolved = path.resolve(repositoryRoot, reference)
    assert.ok(resolved.startsWith(`${repositoryRoot}${path.sep}`), `evidence path escapes repository: ${streamId}`)
    assert.ok(fs.existsSync(resolved), `missing evidence path: ${streamId}: ${reference}`)
    const metadata = fs.lstatSync(resolved)
    assert.equal(metadata.isSymbolicLink(), false, `evidence path must not be a symbolic link: ${streamId}: ${reference}`)
    assert.ok(metadata.isFile(), `evidence path must identify a regular file: ${streamId}: ${reference}`)
    const realResolved = fs.realpathSync(resolved)
    assert.ok(realResolved.startsWith(`${realRepositoryRoot}${path.sep}`), `evidence target escapes repository: ${streamId}: ${reference}`)
    return
  }

  if (reference.startsWith('github-actions:')) {
    assert.match(reference, workflowReferencePattern, `invalid workflow run reference: ${streamId}`)
    return
  }

  if (reference.startsWith('artifact:')) {
    assert.fail(`direct artifact identifiers are not resolvable evidence; use a committed receipt, workflow run, or digest: ${streamId}: ${reference}`)
  }

  if (reference.startsWith('sha256:')) {
    assert.match(reference, digestReferencePattern, `invalid SHA-256 reference: ${streamId}`)
    return
  }

  assert.fail(`unbounded evidence reference: ${streamId}: ${reference}`)
}
