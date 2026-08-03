import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const authority = read('../docs/home/HOME_FINALIZATION_AUTHORITY_2026-07-23.md')
const personalization = read('src/app/home/homePersonalizationModel.ts')
const personalizationHook = read('src/app/home/useHomePersonalizedScene.ts')
const orb = read('src/app/home/orbStateController.ts')
const candidateState = read('src/app/home/homeReviewCandidateState.ts')
const assetOwner = read('src/app/AssetDrivenHomeWorld.tsx')
const manifest = read('src/spatial/assets/assetManifest.ts')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const fallback = read('src/app/FinalHomeWorld.tsx')
const selectedMemoryContract = read('src/spatial/memory/selectedMemoryContract.ts')
const doorwayProof = read('../tests/native-doorway-proof.mjs')
const authoring = read('../scripts/author-home-finalization-assets.mjs')
const authoredVerifier = read('../scripts/verify-home-finalization-authored-assets.mjs')
const visualProof = read('../scripts/capture-continuous-spatial-proof-v18.mjs')
const visualProofWrapper = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')

const has = (source, marker) => assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

test('Home remains visually NO-GO until exact deployed delegated founder acceptance', () => {
  assert.match(authority, /HOME VISUAL STATUS: NO-GO/)
  assert.match(authority, /delegated exact-SHA visual approval authority/)
  assert.match(authority, /No approval for another SHA transfers/)
})

test('the personalization contract separates private, empty, offline and disclosed sample modes', () => {
  for (const mode of ['private-personalized', 'world-forming', 'permission-limited', 'unavailable', 'offline', 'explicit-sample']) {
    assert.match(personalization, new RegExp(`['"]${mode}['"]`))
  }
  assert.match(personalization, /disclosedSample: true/)
  assert.match(personalization, /privateDataMounted: false/)
  assert.match(personalization, /No personal information is mounted here/)
  assert.match(personalization, /will not invent memories/)
  assert.match(personalization, /inspect, correct, hide, or delete/)
})

test('review fixtures isolate private records and include a disclosed synthetic personalized state', () => {
  assert.match(personalizationHook, /homePrivateFixture/)
  assert.match(personalizationHook, /safePrivate: true/)
  assert.match(personalizationHook, /if \(isolatedReviewMode\)/)
  assert.match(personalizationHook, /setSignedIn\(false\)/)
  assert.match(personalizationHook, /setEvidence\(\[\]\)/)
  assert.match(personalization, /safePrivateFixtureEvidence/)
  assert.match(personalization, /synthetic review inputs, not user records/)
  assert.match(personalization, /privateDataMounted: false/)
  assert.match(personalization, /reviewFixture: 'safe-private'/)
})

test('normal production personalization cannot silently consume disclosed sample places', () => {
  assert.match(personalization, /if \(input\.requestedMode === 'explicit-sample'\)/)
  assert.match(personalizationHook, /params\.get\('homeSample'\) === '1'/)
  assert.match(personalizationHook, /users', user\.uid, 'memories'/)
  assert.match(personalizationHook, /setDataAvailable\(false\)/)
  assert.match(personalization, /No substitute memories or sample records were mounted/)
})

test('selected memory parsing rejects ambiguous malformed and normalized timestamps before Mirror rendering', () => {
  assert.match(selectedMemoryContract, /const CANONICAL_UTC_TIMESTAMP =/)
  assert.match(selectedMemoryContract, /value\.trim\(\) !== value/)
  assert.match(selectedMemoryContract, /!CANONICAL_UTC_TIMESTAMP\.test\(value\)/)
  assert.match(selectedMemoryContract, /const timestamp = Date\.parse\(value\)/)
  assert.match(selectedMemoryContract, /if \(!Number\.isFinite\(timestamp\)\) return null/)
  assert.match(selectedMemoryContract, /const canonical = new Date\(timestamp\)\.toISOString\(\)/)
  assert.match(selectedMemoryContract, /return canonical === value \? canonical : null/)
  assert.match(selectedMemoryContract, /const occurredAt = isoDateValue\(raw\.occurredAt\)/)
  assert.match(selectedMemoryContract, /if \(!title \|\| !occurredAt \|\| !summary/)
})

test('every required Orb state maps to a directly bound authored GLB clip', () => {
  const clips = ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition']
  for (const state of ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']) {
    assert.match(orb, new RegExp(`\\b${state}: \\{`))
    assert.match(assetOwner, new RegExp(`\\b${state}: ['"]Orb_`))
  }
  for (const clip of clips) {
    has(assetOwner, clip)
    has(authoring, clip)
  }
  for (const binding of ['animation', 'material', 'light', 'particles', 'movement', 'audioCue', 'caption', 'haptic', 'announcement', 'affordance']) {
    assert.match(orb, new RegExp(`readonly ${binding}`))
  }
  assert.match(assetOwner, /useAnimations/)
  assert.match(assetOwner, /data-home-orb-clip=/)
  assert.match(assetOwner, /data-home-animation-owner="gltf-authored-clips"/)
  assert.match(assetOwner, /data-home-audio=/)
  assert.match(assetOwner, /Enable ambience/)
  assert.match(assetOwner, /aria-live="polite"/)
})

test('review candidates remain disclosed and cannot silently become promoted assets', () => {
  for (const id of ['home-entry-chamber-model-v1', 'portal-ring-master-glb-v1', 'urai-orb-avatar-glb-v1']) {
    const start = manifest.indexOf(`id: '${id}'`)
    assert.notEqual(start, -1)
    const entry = manifest.slice(start, start + 700)
    assert.match(entry, /status: 'future'/)
    assert.match(entry, /fallbackAssetId:/)
    assert.match(candidateState, new RegExp(`assetId: '${id}'`))
  }
  assert.match(candidateState, /allowDisclosedReviewCandidate/)
  assert.match(assetOwner, /homeAssetReview/)
  assert.match(assetOwner, /data-home-review-disclosure=/)
  assert.doesNotMatch(assetOwner, /Review candidate composition — visually improved, still unapproved\./)
})

test('asset-driven Home owns supported review runtime and procedural world is degraded fallback only', () => {
  assert.match(runtime, /AssetDrivenHomeWorld/)
  assert.match(runtime, /asset-driven-primary-with-procedural-degraded-fallback/)
  assert.match(runtime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.match(assetOwner, /AssetRuntimeBoundary/)
  assert.match(assetOwner, /fallback=\{fallback\}/)
  assert.match(assetOwner, /data-home-fallback-reason=/)
  assert.match(assetOwner, /data-home-assets-ready=/)
  assert.match(assetOwner, /Your private world is forming/)
  assert.match(assetOwner, /home-authored-entry-chamber/)
  assert.match(assetOwner, /home-embodied-presence-interaction/)
  assert.doesNotMatch(assetOwner, /latheGeometry|capsuleGeometry|const MEMORY_SCENES =/)
  assert.match(fallback, /capsuleGeometry/)
  assert.match(fallback, /const MEMORY_SCENES =/)
  assert.match(authority, /reclassified as a fallback implementation/)
})

test('the review world uses authored sanctuary embodiment and meaningful spatial places', () => {
  for (const marker of ['home-sanctuary-root','embodied-presence-root','embodied-presence-cloak-back','memory-place-anchor-1','ground-alcove-root','life-map-alcove-root','Home_Breathing','Presence_Idle','Presence_Privacy','Presence_Forming']) has(authoring, marker)
  assert.match(assetOwner, /MemoryPlace/)
  assert.match(assetOwner, /OrganicArch/)
  assert.match(assetOwner, /WovenLeaf/)
  assert.match(assetOwner, /relationship-presence/)
  assert.doesNotMatch(assetOwner, /torusKnotGeometry|latheGeometry/)
  assert.match(assetOwner, /destination="ground"/)
  assert.match(assetOwner, /destination="life-map"/)
  assert.match(assetOwner, /living path descends into Ground/)
  assert.match(assetOwner, /luminous path rises into Life Map/)
})

test('Portal opening traversal and closing phases bind all seven authored clips', () => {
  for (const clip of ['Portal_Closed','Portal_Available','Portal_Attention','Portal_Active','Portal_Opening','Portal_Traversal','Portal_Closing']) {
    has(authoring, clip)
    has(assetOwner, clip)
  }
  assert.match(assetOwner, /setPhase\('opening'\)/)
  assert.match(assetOwner, /setPhase\('traversal'\)/)
  assert.match(assetOwner, /setPhase\('closing'\)/)
  assert.match(assetOwner, /data-home-portal-sequence=/)
})

test('authored asset verification refuses structural pruning and premature promotion', () => {
  assert.match(authoredVerifier, /minNodes: 120/)
  assert.match(authoredVerifier, /minNodes: 40/)
  assert.match(authoredVerifier, /minNodes: 20/)
  assert.match(authoredVerifier, /EXT_meshopt_compression/)
  assert.match(authoredVerifier, /status: 'future'/)
  assert.match(authoredVerifier, /retired procedural review marker remains/)
})

test('persistent visible shortcut pills are removed and semantic direct access remains', () => {
  assert.doesNotMatch(runtime, /urai-home-runtime-doorways/)
  assert.doesNotMatch(assetOwner, /className="urai-final-home-doorways"/)
  assert.match(assetOwner, /home-semantic-navigation sr-only/)
  assert.match(assetOwner, /data-testid="home-semantic-ground"/)
  assert.match(assetOwner, /data-testid="home-semantic-life-map"/)
  assert.match(doorwayProof, /persistentVisibleShortcutPillsForbidden: true/)
  assert.match(doorwayProof, /semanticNavigationNonDominant/)
})

test('personalized state changes actual world composition and exposes provenance', () => {
  assert.match(assetOwner, /PersonalizedPlaces/)
  assert.match(assetOwner, /scene\.environment\.weatherTone/)
  assert.match(assetOwner, /home-personalized-places-/)
  assert.match(assetOwner, /data-home-review-fixture=/)
  assert.match(assetOwner, /Why am I seeing this\?/)
  assert.match(assetOwner, /Review consent/)
  assert.match(assetOwner, /Correct, hide, or delete sources/)
})

test('continuous Home keyboard proof materializes an enabled discreet control and preserves movement focus clearing', () => {
  assert.match(visualProofWrapper, /focusReplacement = .*button:not\(:disabled\)/)
  assert.match(visualProofWrapper, /'const patched = portalPatched',/)
  assert.match(visualProofWrapper, /'\s*\.replace\(focusTarget, focusReplacement\)',/)
  has(visualProofWrapper, 'Home proof could not establish editable-control focus before movement regression')
  has(visualProofWrapper, "method === \\'keyboard\\' && (!result.editableFocusProven || !result.focusClear?.blurred || result.focusClear.afterEditable)")
  assert.match(visualProofWrapper, /focusCount !== 1/)
  assert.match(visualProofWrapper, /Home keyboard focus assertion was weakened or removed/)
  assert.match(visualProofWrapper, /Home keyboard focus-clear regression assertion was weakened or removed/)
})

test('v18 exact-head evidence covers root parity mobile states motion portals accessibility and failures', () => {
  for (const marker of [
    "schemaVersion: 'urai-continuous-spatial-visual-proof-18'",
    "route of ['/', '/home/']",
    "portrait-mobile",
    "landscape-mobile",
    "homeOrbState",
    "recordVideo",
    "reducedMotion",
    "forcedColors",
    "homeAssetFailure",
    "home-real-offline-transition",
    "home-ground-portal-journey",
    "home-life-map-portal-journey",
    "home-no-webgl-fallback",
    "home-pointer-look-desktop",
    "home-touch-orb",
  ]) has(visualProof, marker)
  assert.doesNotMatch(visualProof, /waitForTimeout/)
})
