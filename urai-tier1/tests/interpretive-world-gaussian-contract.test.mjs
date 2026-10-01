import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  decideInterpretiveWorldRender,
  validateInterpretiveWorldAsset,
} from '../src/spatial/interpretive-world/interpretiveWorld.ts'
import {
  buildInterpretiveWorldReplayPlan,
} from '../src/spatial/interpretive-world/interpretiveWorldReplay.ts'

const accepted = (overrides = {}) => ({
  schemaVersion: 'urai-interpretive-world-1',
  id: 'URAI-IW-TEST',
  label: 'Generated test world',
  truthClass: 'interpretive',
  truthLabel: 'Interpretive generated world — not camera-recorded history.',
  autobiographical: false,
  generatedOnly: true,
  sourceTruthEligible: false,
  sourceIds: [],
  exactPrivateLocationEmbedded: false,
  generation: {
    provider: 'test-provider',
    taskIds: ['task-a'],
    visualAcceptance: 'accepted',
  },
  reconstruction: {
    method: '3dgs',
    cameraSolve: {
      engine: 'colmap',
      registeredImages: 90,
      totalInputImages: 100,
      meanReprojectionErrorPx: 0.8,
      fixedLensFocalSpread: 0.02,
      receiptRef: 'camera.json',
    },
    training: { engine: 'splatfacto', state: 'complete', receiptRef: 'training.json' },
    archival: { artifactId: 'archive-1', format: 'ply-3dgs' },
    runtime: { artifactId: 'runtime-1', format: 'splat', delivery: 'server-authorized' },
    collisionProxy: { artifactId: 'collision-1', format: 'glb' },
  },
  qa: {
    reviewState: 'accepted',
    heldOutViewCount: 10,
    psnrDb: 27,
    ssim: 0.91,
    lpips: 0.16,
    knownArtifactCount: 0,
  },
  release: {
    state: 'private-pilot',
    browserCertified: true,
    mobileCertified: false,
    xrCertified: false,
  },
  ...overrides,
})

test('accepted generated world may render a Gaussian splat without becoming autobiographical', () => {
  const result = decideInterpretiveWorldRender({
    asset: accepted(),
    releaseEnabled: true,
    authorizedRuntimeUrl: 'https://storage.example.invalid/generated-world.splat?sig=test',
  })
  assert.equal(result.mode, 'interpretive-gaussian-splat')
  assert.equal(result.autobiographical, false)
  assert.deepEqual(result.allowedSourceIds, [])
  assert.equal(result.embodiedMovementAllowed, true)
  assert.match(result.truthLabel, /not camera-recorded history/i)
})

test('generated world is hard-off under its independent release flag', () => {
  const result = decideInterpretiveWorldRender({ asset: accepted(), releaseEnabled: false })
  assert.equal(result.mode, 'disabled')
  assert.ok(result.reasons.includes('INTERPRETIVE_WORLD_RELEASE_DISABLED'))
})

test('generated worlds reject source truth and exact private location claims', () => {
  const bad = accepted({ sourceIds: ['video-real'], sourceTruthEligible: true, exactPrivateLocationEmbedded: true })
  const errors = validateInterpretiveWorldAsset(bad)
  assert.ok(errors.includes('SOURCE_TRUTH_MUST_BE_FALSE'))
  assert.ok(errors.includes('GENERATED_WORLD_SOURCE_IDS_FORBIDDEN'))
  assert.ok(errors.includes('EXACT_PRIVATE_LOCATION_FORBIDDEN'))
})

test('literal visual acceptance is required before generated Gaussian delivery', () => {
  const candidate = accepted({
    generation: { provider: 'test-provider', taskIds: ['task-a'], visualAcceptance: 'pending' },
    qa: { reviewState: 'unreviewed', heldOutViewCount: 0, knownArtifactCount: 0 },
    release: { state: 'private-pilot', browserCertified: false, mobileCertified: false, xrCertified: false },
  })
  const result = decideInterpretiveWorldRender({
    asset: candidate,
    releaseEnabled: true,
    authorizedRuntimeUrl: 'https://storage.example.invalid/generated-world.splat?sig=test',
  })
  assert.equal(result.mode, 'awaiting-acceptance')
  assert.equal(result.assetUrl, null)
})

test('camera solve and held-out QA thresholds fail closed', () => {
  const bad = accepted({
    reconstruction: {
      ...accepted().reconstruction,
      cameraSolve: {
        engine: 'colmap',
        registeredImages: 60,
        totalInputImages: 100,
        meanReprojectionErrorPx: 2.2,
        fixedLensFocalSpread: 0.08,
        receiptRef: 'camera.json',
      },
    },
    qa: {
      reviewState: 'accepted',
      heldOutViewCount: 10,
      psnrDb: 20,
      ssim: 0.7,
      lpips: 0.4,
      knownArtifactCount: 2,
    },
  })
  const errors = validateInterpretiveWorldAsset(bad)
  assert.ok(errors.includes('CAMERA_SOLVE_REGISTRATION_BELOW_FLOOR'))
  assert.ok(errors.includes('CAMERA_SOLVE_REPROJECTION_ERROR_TOO_HIGH'))
  assert.ok(errors.includes('CAMERA_SOLVE_FOCAL_SPREAD_TOO_HIGH'))
  assert.ok(errors.includes('HELD_OUT_PSNR_BELOW_FLOOR'))
  assert.ok(errors.includes('HELD_OUT_SSIM_BELOW_FLOOR'))
  assert.ok(errors.includes('HELD_OUT_LPIPS_ABOVE_CEILING'))
})

test('Replay preserves Focus identity while clearly entering a non-autobiographical interpretive world', () => {
  const asset = accepted()
  const binding = {
    schemaVersion: 'urai-interpretive-world-replay-binding-1',
    memoryId: 'memory-1',
    interpretiveWorldAssetId: asset.id,
    memoryStarId: 'star-1',
    returnContract: { focusMemoryId: 'memory-1', returnTo: 'focus', preserveSelectedMemory: true },
  }
  const plan = buildInterpretiveWorldReplayPlan({ asset, binding, interpretiveWorldAvailable: true })
  assert.equal(plan.mode, 'interpretive-world')
  assert.equal(plan.autobiographical, false)
  assert.equal(plan.focusMemoryId, 'memory-1')
  assert.equal(plan.returnTo, 'focus')
})

test('interpretive renderer reuses only the low-level splat primitive and never captured-reality truth decisions', () => {
  const source = fs.readFileSync(new URL('../src/spatial/interpretive-world/InterpretiveWorldSplat.tsx', import.meta.url), 'utf8')
  assert.match(source, /decision\.mode !== 'interpretive-gaussian-splat'/)
  assert.match(source, /OwnedCapturedRealitySplat/)
  assert.match(source, /autobiographical: false/)
  assert.match(source, /allowedSourceIds: \[\]/)
  assert.doesNotMatch(source, /decideCapturedRealityRender/)
})
