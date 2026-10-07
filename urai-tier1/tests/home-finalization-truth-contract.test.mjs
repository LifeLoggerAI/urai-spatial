import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const read = (path) => fs.readFileSync(path, 'utf8')
const authority = read('../docs/home/HOME_FINALIZATION_AUTHORITY_2026-07-23.md')
const personalization = read('src/app/home/homePersonalizationModel.ts')
const personalizationHook = read('src/app/home/useHomePersonalizedScene.ts')
const orb = read('src/app/home/orbStateController.ts')
const manifest = read('src/spatial/assets/assetManifest.ts')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const productionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const production = read('src/spatial/layout/HomeWorldProductionPolished.tsx')
const selectedMemoryContract = read('src/spatial/memory/selectedMemoryContract.ts')
const forge = read('../scripts/author-final-glb-pack.mjs')
const verifier = read('../scripts/verify-final-glb-pack.mjs')
const authoredVerifier = read('../scripts/verify-home-finalization-authored-assets.mjs')
const buildPreparation = read('../scripts/prepare-low-disk-build.mjs')
const visualProof = read('../scripts/capture-continuous-spatial-proof-v18.mjs')
const stateProof = read('../scripts/capture-home-state-proof.mjs')
const stateProofWorkflow = read('../.github/workflows/home-state-proof.yml')
const continuousProofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const portalProof = read('../scripts/run-continuous-spatial-proof-v18-portal-stable.mjs')
const groupedProof = read('../scripts/run-continuous-spatial-proof-v21-grouped.mjs')

const has = (source, marker) => assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

test('Home remains visually NO-GO until exact deployed delegated founder acceptance', () => {
  assert.match(authority, /HOME VISUAL STATUS: NO-GO/)
  assert.match(authority, /delegated exact-SHA visual approval authority/i)
  assert.match(authority, /No approval for another SHA transfers/)
  assert.match(authoredVerifier, /visualApproval: false/)
  assert.match(authoredVerifier, /Exact-head rendered inspection remains required/)
})

test('private personalization remains fail-closed and never invents memories', () => {
  for (const mode of ['private-personalized', 'world-forming', 'permission-limited', 'unavailable', 'offline', 'explicit-sample']) assert.match(personalization, new RegExp(`['"]${mode}['"]`))
  assert.match(personalization, /privateDataMounted: false/)
  assert.match(personalization, /will not invent memories/)
  assert.match(personalization, /inspect, correct, hide, or delete/)
  assert.match(personalizationHook, /safePrivate: true/)
  assert.match(personalizationHook, /if \(isolatedReviewMode\)/)
  assert.match(personalizationHook, /setSignedIn\(false\)/)
})

test('selected memory timestamps remain canonical before rendering', () => {
  assert.match(selectedMemoryContract, /const CANONICAL_UTC_TIMESTAMP =/)
  assert.match(selectedMemoryContract, /value\.trim\(\) !== value/)
  assert.match(selectedMemoryContract, /!CANONICAL_UTC_TIMESTAMP\.test\(value\)/)
  assert.match(selectedMemoryContract, /const canonical = new Date\(timestamp\)\.toISOString\(\)/)
  assert.match(selectedMemoryContract, /return canonical === value \? canonical : null/)
})

test('all eight final GLB assets are selected while degraded fallbacks remain available', () => {
  const ids = [
    'home-entry-chamber-model-v1',
    'portal-ring-master-glb-v1',
    'ground-world-terrain-glb-v1',
    'life-map-memory-star-glb-v1',
    'focus-memory-chamber-glb-v1',
    'replay-memory-environment-glb-v1',
    'urai-orb-avatar-glb-v1',
    'passport-status-room-glb-v1',
  ]
  for (const id of ids) assert.match(manifest, new RegExp(`finalGlb\\('${id}'`))
  assert.match(manifest, /status: 'ready'/)
  assert.match(manifest, /fallbackAssetId/)
  assert.match(manifest, /Emergency degraded geometry only/)
  assert.match(manifest, /Rendered visual acceptance remains an exact-head review gate/)
})

test('the immutable author and verifier retain all eight receipt-bound GLBs', () => {
  const budgets = {
    'home-entry-chamber-v1.glb': 180000,
    'portal-ring-master-v1.glb': 24000,
    'ground-world-terrain-v1.glb': 120000,
    'life-map-memory-star-v1.glb': 40000,
    'focus-memory-chamber-v1.glb': 50000,
    'replay-memory-environment-v1.glb': 50000,
    'urai-orb-avatar-v1.glb': 30000,
    'passport-status-room-v1.glb': 50000,
  }
  const receipt = JSON.parse(read('../operations/assets/generated-receipts/urai-final-glb-pack-v1.json'))
  assert.equal(receipt.packId, 'urai-final-glb-production-pack-v1')
  assert.equal(receipt.assets.length, 8)
  assert.deepEqual(receipt.assets.map((asset) => asset.fileName).sort(), Object.keys(budgets).sort())
  for (const record of receipt.assets) {
    has(verifier, record.fileName)
    const payload = fs.readFileSync(`public/assets/urai/generated/models/${record.fileName}`)
    assert.equal(payload.length, record.bytes)
    assert.equal(createHash('sha256').update(payload).digest('hex'), record.sha256)
    assert.equal(payload.readUInt32LE(0), 0x46546c67)
    assert.equal(payload.readUInt32LE(4), 2)
    assert.equal(payload.readUInt32LE(8), payload.length)
    assert.equal(payload.readUInt32LE(16), 0x4e4f534a)
    const json = JSON.parse(payload.subarray(20, 20 + payload.readUInt32LE(12)).toString('utf8').trim())
    const restoredReviewedHome = record.fileName === 'home-entry-chamber-v1.glb'
      && record.sha256 === 'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529'
    if (restoredReviewedHome) {
      assert.equal(record.bytes, 184160)
      assert.equal(record.sourceHead, '51db7b3ba77a657659da34ca5e146e049dd03d31')
      assert.equal(json.asset.generator, 'glTF-Transform v4.4.2')
      assert.equal(json.asset.extras.source, 'scripts/author-home-finalization-assets.mjs')
      for (const extension of ['EXT_meshopt_compression', 'KHR_mesh_quantization']) assert.ok(json.extensionsRequired.includes(extension))
    } else {
      assert.equal(json.asset.generator, 'URAI Labs Final GLB Forge 1.0')
      for (const extension of ['KHR_materials_emissive_strength', 'KHR_materials_transmission', 'KHR_materials_clearcoat']) {
        assert.ok(json.extensionsUsed.includes(extension), `${record.fileName} is missing ${extension}`)
      }
    }
    assert.equal(json.nodes.length, record.nodes)
    assert.deepEqual(json.animations.map((clip) => clip.name).sort(), [...record.animations].sort())
    let triangles = 0
    for (const mesh of json.meshes) for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, 'authored meshes must retain their triangle topology')
      const count = json.accessors[primitive.indices ?? primitive.attributes.POSITION].count
      assert.equal(count % 3, 0)
      triangles += count / 3
    }
    assert.equal(triangles, record.triangleCount)
    assert.ok(triangles > 0 && triangles <= budgets[record.fileName])
  }
  for (const script of ['author-final-glb-pack.mjs', 'verify-final-glb-pack.mjs']) {
    const result = spawnSync(process.execPath, [path.resolve('..', 'scripts', script)], { cwd: path.resolve('..'), encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    const report = JSON.parse(result.stdout)
    assert.equal(report.ok, true)
    assert.equal(report.packId, receipt.packId)
    assert.deepEqual([...report.assets].sort(), Object.keys(budgets).sort())
    if (script === 'author-final-glb-pack.mjs') {
      assert.equal(report.mode, 'verify-committed-authored-binaries')
      assert.equal(report.generatedSubstitutes, 0)
    } else assert.deepEqual(report.errors, [])
  }
  assert.match(verifier, /receipt hash mismatch/)
  assert.match(verifier, /receipt byte count mismatch/)
  assert.match(verifier, /triangle budget exceeded/)
  assert.match(verifier, /missing named scene structure|insufficient named scene structure/)
})

test('the immutable author rejects missing or altered inputs without generating substitutes', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-immutable-asset-test-'))
  const receipt = JSON.parse(read('../operations/assets/generated-receipts/urai-final-glb-pack-v1.json'))
  const fixtureReceiptPath = path.join(fixtureRoot, 'operations/assets/generated-receipts/urai-final-glb-pack-v1.json')
  const fixtureModels = path.join(fixtureRoot, 'urai-tier1/public/assets/urai/generated/models')
  const authorPath = path.resolve('../scripts/author-final-glb-pack.mjs')
  try {
    fs.mkdirSync(path.dirname(fixtureReceiptPath), { recursive: true })
    fs.mkdirSync(fixtureModels, { recursive: true })
    for (const asset of receipt.assets) fs.symlinkSync(path.resolve(`public/assets/urai/generated/models/${asset.fileName}`), path.join(fixtureModels, asset.fileName))
    const rejectReceipt = (candidate, expected) => {
      fs.writeFileSync(fixtureReceiptPath, JSON.stringify(candidate))
      const result = spawnSync(process.execPath, [authorPath], { cwd: fixtureRoot, encoding: 'utf8' })
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, expected)
      assert.equal(result.stdout, '')
    }
    rejectReceipt({ ...receipt, packId: 'unaccepted-pack' }, /receipt identity mismatch/)
    rejectReceipt({ ...receipt, assets: receipt.assets.slice(1) }, /Exactly eight authored production GLBs/)
    for (const field of ['sha256', 'bytes']) {
      const candidate = structuredClone(receipt)
      candidate.assets[0][field] = field === 'sha256' ? '0'.repeat(64) : candidate.assets[0].bytes + 1
      rejectReceipt(candidate, /immutable authored binary does not match its receipt/)
    }
    const missing = path.join(fixtureModels, receipt.assets[0].fileName)
    fs.unlinkSync(missing)
    rejectReceipt(receipt, /authored binary is missing; no procedural fallback will be generated/)
    assert.equal(fs.existsSync(missing), false, 'author must not create replacement geometry')
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('production builds always materialize and verify the final pack', () => {
  assert.match(buildPreparation, /author-final-glb-pack\.mjs/)
  assert.match(buildPreparation, /verify-final-glb-pack\.mjs/)
  assert.match(buildPreparation, /await runNodeScript\(assetForge\)/)
  assert.match(buildPreparation, /await runNodeScript\(assetVerifier\)/)
})

test('Home keeps one live camera authority and canonical ascent', () => {
  assert.match(runtime, /AssetDrivenHomeWorld/)
  assert.match(productionEntry, /export \{ HomeWorldProductionPolished as HomeWorldProduction \} from "\.\/HomeWorldProductionPolished"/)
  assert.match(production, /HomeWorldProductionPolished/)
  assert.match(production, /store\.phase === 'ASCENT'/)
  assert.match(production, /store\.setProgress\(t\)/)
  assert.match(production, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.doesNotMatch(production, /<CinematicCameraRig|<SpatialSceneClient/)
})

test('the Orb contract retains every semantic state and final animation clip', () => {
  const clips = ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition']
  for (const state of ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']) assert.match(orb, new RegExp(`\\b${state}: \\{`))
  const fileName = 'urai-orb-avatar-v1.glb'
  const receipt = JSON.parse(read('../operations/assets/generated-receipts/urai-final-glb-pack-v1.json'))
  const record = receipt.assets.find((asset) => asset.fileName === fileName)
  assert.ok(record, 'authored Orb receipt is required')
  const payload = fs.readFileSync(`public/assets/urai/generated/models/${fileName}`)
  assert.equal(payload.length, record.bytes)
  assert.equal(createHash('sha256').update(payload).digest('hex'), record.sha256)
  assert.equal(payload.readUInt32LE(0), 0x46546c67, 'authored Orb must be a GLB')
  assert.equal(payload.readUInt32LE(4), 2, 'authored Orb must use glTF 2')
  assert.equal(payload.readUInt32LE(8), payload.length)
  assert.equal(payload.readUInt32LE(16), 0x4e4f534a, 'first Orb chunk must be JSON')
  const jsonLength = payload.readUInt32LE(12)
  const json = JSON.parse(payload.subarray(20, 20 + jsonLength).toString('utf8').trim())
  has(forge, 'verify-committed-authored-binaries')
  has(production, 'useAnimations(orb.animations, authoredOrb)')
  for (const clip of clips) {
    assert.ok(record.animations.includes(clip), `receipt is missing ${clip}`)
    const animation = json.animations.find((candidate) => candidate.name === clip)
    assert.ok(animation, `committed Orb binary is missing ${clip}`)
    assert.ok(animation.channels.length > 0, `${clip} must animate an authored node`)
    assert.ok(animation.samplers.length > 0, `${clip} must have authored keyframes`)
    for (const channel of animation.channels) {
      assert.ok(json.nodes[channel.target.node], `${clip} targets a missing node`)
      assert.ok(animation.samplers[channel.sampler], `${clip} references a missing sampler`)
    }
    for (const sampler of animation.samplers) {
      const times = json.accessors[sampler.input]
      assert.ok(times?.count >= 2 && times.max[0] > times.min[0], `${clip} must retain a positive authored duration`)
      assert.ok(json.accessors[sampler.output], `${clip} output keyframes must exist`)
    }
    has(production, clip)
    has(verifier, clip)
  }
})

test('CI-invoked exact-head evidence covers mobile motion portals accessibility and real loader failure recovery', () => {
  for (const marker of [
    "schemaVersion: 'urai-continuous-spatial-visual-proof-18'",
    'portrait-mobile',
    'landscape-mobile',
    'recordVideo',
    'home-no-webgl-fallback',
    'home-pointer-look-desktop',
  ]) has(visualProof, marker)
  // Current receipts use home-portal-${destination} and
  // home-${method}-${destination}-${spec.id}; require the actual journeys.
  has(visualProof, 'async function capturePortalSequence(browser)')
  has(portalProof, "for (const destination of ['ground', 'life-map'])")
  has(portalProof, "await movePortalToNearby(page, destination)")
  has(portalProof, "await page.keyboard.press('Enter')")
  has(portalProof, "cameraCheckpoint: 'home-ground-descent'")
  has(portalProof, "cameraCheckpoint: 'home-sky-ascent-complete'")
  has(portalProof, 'routeEvidence?.routeSettled')
  has(groupedProof, "for (const destination of ['orb', 'ground', 'life-map']) await captureInteraction(browser, spec, 'touch', destination)")
  has(groupedProof, 'await capturePortalSequence(browser)')
  has(groupedProof, './run-continuous-spatial-proof-v19-portal-stable.mjs')
  for (const marker of ['reducedMotion', 'forcedColors', 'homeAssetFailure', 'home-real-offline-transition', 'captureHomeAssetFailure', 'real-loader-http-503']) has(stateProof, marker)
  for (const file of ['home-entry-chamber-v1.glb', 'urai-orb-avatar-v1.glb', 'polyhaven-fern-02-geometry-v1.glb']) has(stateProof, file)
  assert.match(stateProof, /await page\.route\(targetUrl, blockActualAssetRequest\)/)
  assert.match(stateProof, /route\.fulfill\(\{ status: 503/)
  assert.match(stateProof, /await page\.unroute\(targetUrl, blockActualAssetRequest\)/)
  assert.match(stateProof, /retry\.focus\(\)[\s\S]{0,80}page\.keyboard\.press\('Enter'\)/)
  assert.match(stateProof, /record\.failedAssetsReady === 'false'/)
  assert.match(stateProof, /record\.failedWebglReady === 'false'/)
  assert.match(stateProof, /response\.phase === 'retry' && response\.status === 200/)
  assert.match(stateProof, /record\.recoveredAssetsReady === 'true'/)
  assert.match(stateProof, /record\.freshSuccessfulRetryObserved/)
  assert.match(runtime, /<HomeSceneRenderBoundary key=\{recoveryKey\} onFailure=\{onSceneFailure\}>/)
  assert.match(runtime, /accessible-fallback-after-asset-load-failure/)
  assert.match(runtime, /clearHomeAssetCache\(\)/)
  assert.doesNotMatch(runtime, /homeAssetFailure/)
  assert.doesNotMatch(production, /homeAssetFailure/)
  assert.match(stateProofWorkflow, /node scripts\/capture-home-state-proof\.mjs/)
  assert.match(stateProofWorkflow, /ref: \$\{\{ env\.URAI_EXACT_HEAD \}\}/)
  assert.match(continuousProofWorkflow, /scripts\/run-continuous-spatial-proof-v22-natural\.mjs/)
  assert.match(read('../scripts/run-continuous-spatial-proof-v22-natural.mjs'), /capture-continuous-spatial-proof-v18\.mjs/)
  assert.doesNotMatch(visualProof, /waitForTimeout/)
  assert.doesNotMatch(stateProof, /waitForTimeout/)
})
