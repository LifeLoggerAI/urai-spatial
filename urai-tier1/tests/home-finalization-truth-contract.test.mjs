import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const authority = read('../docs/home/HOME_FINALIZATION_AUTHORITY_2026-07-23.md')
const personalization = read('src/app/home/homePersonalizationModel.ts')
const personalizationHook = read('src/app/home/useHomePersonalizedScene.ts')
const orb = read('src/app/home/orbStateController.ts')
const manifest = read('src/spatial/assets/assetManifest.ts')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const productionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const production = read('src/spatial/layout/HomeWorldProductionFinal.tsx')
const selectedMemoryContract = read('src/spatial/memory/selectedMemoryContract.ts')
const forge = read('../scripts/author-final-glb-pack.mjs')
const verifier = read('../scripts/verify-final-glb-pack.mjs')
const authoredVerifier = read('../scripts/verify-home-finalization-authored-assets.mjs')
const buildPreparation = read('../scripts/prepare-low-disk-build.mjs')
const visualProof = read('../scripts/capture-continuous-spatial-proof-v18.mjs')

const has = (source, marker) => assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

test('Home remains visually NO-GO until exact deployed delegated founder acceptance', () => {
  assert.match(authority, /HOME VISUAL STATUS: NO-GO/)
  assert.match(authority, /delegated exact-SHA visual approval authority/)
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

test('the deterministic forge owns the complete final binary pack', () => {
  const files = [
    'home-entry-chamber-v1.glb',
    'portal-ring-master-v1.glb',
    'ground-world-terrain-v1.glb',
    'life-map-memory-star-v1.glb',
    'focus-memory-chamber-v1.glb',
    'replay-memory-environment-v1.glb',
    'urai-orb-avatar-v1.glb',
    'passport-status-room-v1.glb',
  ]
  for (const file of files) {
    has(forge, file)
    has(verifier, file)
  }
  assert.match(forge, /URAI Labs Final GLB Forge 1\.0/)
  assert.match(forge, /KHR_materials_emissive_strength/)
  assert.match(forge, /KHR_materials_transmission/)
  assert.match(forge, /KHR_materials_clearcoat/)
  assert.match(forge, /packId:'urai-final-glb-production-pack-v1'/)
  assert.match(verifier, /receipt hash mismatch/)
  assert.match(verifier, /triangle budget exceeded/)
  assert.match(verifier, /missing named scene structure|insufficient named scene structure/)
})

test('production builds always materialize and verify the final pack', () => {
  assert.match(buildPreparation, /author-final-glb-pack\.mjs/)
  assert.match(buildPreparation, /verify-final-glb-pack\.mjs/)
  assert.match(buildPreparation, /await runNodeScript\(assetForge\)/)
  assert.match(buildPreparation, /await runNodeScript\(assetVerifier\)/)
})

test('Home keeps one live camera authority and canonical ascent', () => {
  assert.match(runtime, /AssetDrivenHomeWorld/)
  assert.match(productionEntry, /export \{ HomeWorldProductionFinal as HomeWorldProduction \} from "\.\/HomeWorldProductionFinal"/)
  assert.match(production, /HomeWorldProductionFinal/)
  assert.match(production, /if \(store\.phase === "ASCENT"\)/)
  assert.match(production, /store\.setProgress\(linear\)/)
  assert.match(production, /cameraCheckpoint: "home-sky-ascent-complete"/)
  assert.doesNotMatch(production, /<CinematicCameraRig|<SpatialSceneClient/)
})

test('the Orb contract retains every semantic state and final animation clip', () => {
  const clips = ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition']
  for (const state of ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']) assert.match(orb, new RegExp(`\\b${state}: \\{`))
  for (const clip of clips) {
    has(forge, clip)
    has(verifier, clip)
  }
})

test('exact-head evidence still covers mobile motion portals accessibility and failures', () => {
  for (const marker of [
    "schemaVersion: 'urai-continuous-spatial-visual-proof-18'",
    'portrait-mobile',
    'landscape-mobile',
    'recordVideo',
    'reducedMotion',
    'forcedColors',
    'homeAssetFailure',
    'home-real-offline-transition',
    'home-ground-portal-journey',
    'home-life-map-portal-journey',
    'home-no-webgl-fallback',
    'home-pointer-look-desktop',
    'home-touch-orb',
  ]) has(visualProof, marker)
  assert.doesNotMatch(visualProof, /waitForTimeout/)
})
