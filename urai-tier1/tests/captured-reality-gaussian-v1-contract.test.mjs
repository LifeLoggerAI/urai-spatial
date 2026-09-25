import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decideCapturedRealityRender,
  validateCapturedRealityAsset,
} from '../src/spatial/captured-reality/capturedReality.ts'

const source = (id, provenance = 'recorded') => ({
  id,
  provenance,
  sourceType: 'video',
  transformations: [],
})

const privacy = () => ({
  requiredPurposes: ['location.context'],
  consentTiers: ['C3'],
  thirdPartyPresent: false,
  exactLocationAllowed: true,
  biometricIdentityAllowed: false,
  sensitiveInferenceAllowed: false,
  publicContributionAllowed: false,
})

const place = {
  id: 'place-1',
  kind: 'place',
  label: 'Private remembered place',
  eraIds: [],
  sourceIds: ['video-a'],
  sourceEvidence: [{ sourceId: 'video-a', sourceType: 'video', capturedAt: '2026-09-16T00:00:00Z' }],
  reconstruction: {
    fidelity: 'confirmed',
    confidence: 0.96,
    sourceIds: ['video-a'],
    privacy: privacy(),
    visibility: 'private',
    userCorrectionRevision: 0,
  },
  semanticImportance: 1,
  placeType: 'family-home',
  geographicPrecision: 'exact-private',
  buildingIds: [],
  routeIds: [],
}

const graph = (sources = { 'video-a': source('video-a') }) => ({
  schemaVersion: 'urai-lived-world-1',
  ownerId: 'owner-1',
  generatedAt: '2026-09-25T00:00:00Z',
  sourcePolicyVersion: 'captured-reality-v1',
  sources,
  entities: { 'place-1': place },
  edges: [],
})

const asset = (overrides = {}) => ({
  schemaVersion: 'urai-captured-reality-1',
  id: 'capture-1',
  label: 'Private place reconstruction',
  ownerId: 'owner-1',
  anchorEntityId: 'place-1',
  truthClass: 'spatially-reconstructable',
  sourceIds: ['video-a'],
  sourceEvidence: [{ sourceId: 'video-a', sourceType: 'video', capturedAt: '2026-09-16T00:00:00Z' }],
  reconstruction: {
    method: '3dgs',
    inputFormats: ['video', 'colmap', 'ply-3dgs'],
    cameraSolve: { engine: 'colmap', registeredImages: 40, totalInputImages: 44, coordinateSystem: 'right-handed-y-up', receiptRef: 'camera-solve.json' },
    training: { engine: '3dgs', receiptRef: 'training.json' },
    archival: { artifactId: 'capture-1-archive', format: 'ply-3dgs' },
    runtime: { artifactId: 'capture-1-runtime', format: 'splat', delivery: 'server-authorized' },
    fallbackMesh: { artifactId: 'capture-1-fallback', format: 'glb' },
    collisionProxy: { artifactId: 'capture-1-collision', format: 'glb' },
  },
  privacy: {
    visibility: 'private',
    requiredPurposes: ['location.context'],
    exactLocationEmbedded: true,
    thirdPartyPresent: false,
    biometricOrLikenessPresent: false,
  },
  qa: { sourceVsReconstructionReviewed: true, heldOutViewCount: 8, knownArtifactCount: 0, reviewState: 'accepted' },
  provenance: {
    sourcePackageRef: 'private-source-package',
    transformations: ['video -> selected frames', 'frames -> camera solve', 'camera solve -> 3DGS', '3DGS -> web splat'],
    toolchain: ['capture', 'camera-solve', '3dgs', 'runtime-export'],
    exactSourceHead: 'test-head',
    userCorrectionRevision: 0,
    createdAt: '2026-09-25T00:00:00Z',
    mustShowTruthLabel: true,
  },
  release: { state: 'private-pilot', browserCertified: true, mobileCertified: false, xrCertified: false },
  ...overrides,
})

const consent = {
  'location.context': {
    purpose: 'location.context',
    tier: 'C3',
    status: 'granted',
  },
}

test('source-backed captured reality can resolve to a browser Gaussian splat only after C3 consent and release enablement', () => {
  const result = decideCapturedRealityRender({
    asset: asset(),
    graph: graph(),
    consent,
    releaseEnabled: true,
    authorizedRuntimeUrl: 'https://storage.example.invalid/capture-1.splat?sig=test',
  })
  assert.equal(result.mode, 'gaussian-splat')
  assert.equal(result.autobiographical, true)
  assert.match(result.assetUrl ?? '', /^https:\/\//)
  assert.match(result.truthLabel, /Spatial reconstruction from recorded sources/)
})

test('captured reality fails closed to generic non-autobiographical fallback without C3 consent', () => {
  const result = decideCapturedRealityRender({
    asset: asset(),
    graph: graph(),
    consent: {},
    releaseEnabled: true,
    authorizedRuntimeUrl: 'https://storage.example.invalid/capture-1.splat?sig=test',
  })
  assert.equal(result.mode, 'generic-fallback')
  assert.equal(result.autobiographical, false)
  assert.equal(result.assetUrl, null)
})

test('release gate keeps the renderer hard-off even when source and consent are valid', () => {
  const result = decideCapturedRealityRender({
    asset: asset(),
    graph: graph(),
    consent,
    releaseEnabled: false,
  })
  assert.equal(result.mode, 'disabled')
  assert.ok(result.reasons.includes('CAPTURED_REALITY_RELEASE_DISABLED'))
})

test('reconstructed geometry can never claim to be the original camera recording', () => {
  const errors = validateCapturedRealityAsset(
    asset({ truthClass: 'recorded-source-truth' }),
    graph(),
  )
  assert.ok(errors.includes('RECONSTRUCTION_CANNOT_BE_RECORDED_SOURCE_TRUTH'))
})

test('generated-only context cannot qualify as a source-backed real-place reconstruction', () => {
  const g = graph({ 'video-a': source('video-a', 'generated-context') })
  const errors = validateCapturedRealityAsset(asset(), g)
  assert.ok(errors.includes('SPATIAL_RECONSTRUCTION_REQUIRES_REAL_SOURCE'))
})

test('interpretive reconstruction never enters the photoreal autobiographical splat lane', () => {
  const result = decideCapturedRealityRender({
    asset: asset({ truthClass: 'interpretive' }),
    graph: graph(),
    consent,
    releaseEnabled: true,
    authorizedRuntimeUrl: 'https://storage.example.invalid/capture-1.splat?sig=test',
  })
  assert.equal(result.mode, 'mesh-fallback')
  assert.equal(result.autobiographical, false)
  assert.match(result.truthLabel, /not camera-recorded history/)
})

test('missing capture source suppresses the asset rather than guessing', () => {
  const result = decideCapturedRealityRender({
    asset: asset(),
    graph: graph({}),
    consent,
    releaseEnabled: true,
    authorizedRuntimeUrl: 'https://storage.example.invalid/capture-1.splat?sig=test',
  })
  assert.equal(result.mode, 'suppressed')
  assert.ok(result.reasons.some((reason) => reason.startsWith('MISSING_CAPTURE_SOURCE:')))
})

test('source-backed reconstruction waits for server-authorized delivery instead of embedding a private URL', () => {
  const result = decideCapturedRealityRender({
    asset: asset(),
    graph: graph(),
    consent,
    releaseEnabled: true,
  })
  assert.equal(result.mode, 'awaiting-authorized-delivery')
  assert.equal(result.assetUrl, null)
  assert.ok(result.reasons.includes('AUTHORIZED_RUNTIME_URL_REQUIRED'))
})

test('accepted browser certification is rejected unless source-vs-reconstruction QA occurred', () => {
  const candidate = asset({
    qa: { sourceVsReconstructionReviewed: false, heldOutViewCount: 0, knownArtifactCount: 0, reviewState: 'accepted' },
  })
  const errors = validateCapturedRealityAsset(candidate, graph())
  assert.ok(errors.includes('ACCEPTED_WITHOUT_SOURCE_REVIEW'))
})

test('likeness-bearing reconstruction requires biometric identity authority', () => {
  const candidate = asset({
    privacy: {
      visibility: 'private',
      requiredPurposes: ['location.context'],
      exactLocationEmbedded: true,
      thirdPartyPresent: true,
      biometricOrLikenessPresent: true,
    },
  })
  const errors = validateCapturedRealityAsset(candidate, graph())
  assert.ok(errors.includes('LIKENESS_REQUIRES_BIOMETRIC_AUTHORITY'))
})
