import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

const worldTypes = read('src/spatial/world/worldTypes.ts')
const registry = read('src/spatial/world/destinationRegistry.ts')
const shell = read('src/spatial/world/UraiWorldShell.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const atmosphere = read('src/spatial/world/PersistentRealmAtmosphere.tsx')
const atmosphereCss = read('src/spatial/world/persistentRealmAtmosphere.css')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const currentHomeVisualAuthority = JSON.parse(read('src/app/currentHomeVisualAuthority.json'))
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const activeHomeProduction = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const activeHomeVisual = read('src/spatial/layout/HomeWorldProductionV225PolishV3.tsx')
const groundedOrb = read('src/spatial/assets/HomeOrbGroundedV288.tsx')
const focusClient = read('src/app/focus/FocusChamberClient.tsx')
const replayClient = read('src/app/replay/CinematicReplayClient.tsx')
const launchAssetManifest = JSON.parse(read('../operations/assets/launch-critical-assets.json'))
const replayPromotionRehearsal = JSON.parse(read('../operations/assets/promotion-rehearsal/replay-memory-environment-v1.json'))
const chrome = read('src/spatial/world/persistentWorldCompanion.css')
const lifeMapConvergence = read('src/spatial/world/lifeMapConvergence.css')
const lifeMapSelectedCinematic = read('src/spatial/world/lifeMapSelectedCinematic.css')
const cosmicLifeMap = read('src/components/lifemap/CosmicComposedLifeMapScene.tsx')
const routeOwnerConvergence = read('src/spatial/world/routeOwnerConvergence.css')
const secondaryRealmConvergence = read('src/spatial/world/secondaryRealmConvergence.css')
const canonicalAssetForge = read('../scripts/author-urai-aaa-assets.py')
const activeAssetRegenerationWorkflow = read('../.github/workflows/temp-regenerate-canon-critical-glbs.yml')

const canonicalDestinations = ['home', 'infrastructure-hub', 'life-map', 'focus', 'replay', 'mirror', 'passport', 'privacy-controls', 'location-map']

test('the full journey participates in one persistent world model', () => {
  for (const destination of canonicalDestinations) {
    assert.match(worldTypes, new RegExp(`['"]${destination}['"]`))
    assert.match(registry, new RegExp(`['"]${destination}['"]`))
  }
  assert.match(registry, /\[\s*['"]\/life-map['"]\s*,\s*['"]life-map['"]\s*\]/)
  assert.match(registry, /entryPortal:\s*['"]sky-ascent-life-map['"]/)
  assert.match(registry, /environmentalForm:\s*['"]explorable-memory-galaxy['"]/)
})

test('Orb and Home ownership preserve predecessor truth while the current candidate uses governed Avatar presentation to bodyless camera-only first-person embodiment', () => {
  assert.match(shell, /PersistentWorldCompanion/)
  assert.match(shell, /const flatControlRoute = pathname === '\/settings' \|\| pathname\.startsWith\('\/settings\/'\)/)
  assert.match(shell, /const showWorldCompanion = !flatControlRoute && world\.destination !== 'life-map' && world\.destination !== 'location-map'/)
  assert.match(shell, /\{!flatControlRoute \? <PersistentRealmAtmosphere \/> : null\}/)
  assert.match(shell, /\{!flatControlRoute \? <GroundGateway \/> : null\}/)
  assert.match(shell, /\{showWorldCompanion \? <PersistentWorldCompanion \/> : null\}/)
  assert.doesNotMatch(companion, /PRIMARY_DESTINATIONS|SECONDARY_DESTINATIONS|destinationButtons|requestUraiWorldTravel/)
  assert.doesNotMatch(companion, /Public constellation|Travel through the URAI world|Travel to private URAI realms/)
  assert.match(companion, /requestUraiWorldReturn/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /aria-label=\{open \? 'Close UrAi Orb companion' : 'Open UrAi Orb companion'\}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.doesNotMatch(companion, /next\/link/)
  assert.match(worldEvents, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /onOrbOpen=\{requestUraiWorldOrbOpen\}/)
  assert.match(homeRuntime, /AssetDrivenHomeWorld/)
  assert.match(homeRuntime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld|data-home-visual-owner="final-coherent-sanctuary"/)
  assert.match(assetHome, /HomeWorldProduction/)
  assert.doesNotMatch(assetHome, /HomeV75RetainedPixelWorld|HomeWorldProductionV75/)
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionV223 as HomeWorldProduction \} from ['"]\.\/HomeWorldProductionV223['"]/)
  assert.doesNotMatch(homeProductionEntry, /HomeWorldProductionV70/)

  assert.equal(currentHomeVisualAuthority.artRevision, 'v293-direct-bodyless-first-person-convergence')
  assert.equal(currentHomeVisualAuthority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.equal(currentHomeVisualAuthority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.orbInteractionAuthority, 'v291-current-home-orb-state-and-speech-runtime')
  assert.equal(currentHomeVisualAuthority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.certified, false)
  assert.ok(currentHomeVisualAuthority.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbGroundedV288.tsx'))

  assert.match(activeHomeProduction, /export function HomeWorldProductionV223/)
  assert.match(activeHomeProduction, /<HomeV225PolishV3 orbState=\{orbState\} reducedMotion=\{reducedMotion\} onOrb=\{retiredLocalDestination\} onGround=\{retiredLocalDestination\} onLifeMap=\{retiredLocalDestination\} onWalk=\{physicalWorldClick\} \/>/)
  assert.match(activeHomeProduction, /<HomeCurrentArtRepair orbState=\{orbState\}/)
  assert.match(activeHomeProduction, /<HomeAtmosphericSky[^>]*onLifeMap=\{onLifeMap\}/)
  assert.doesNotMatch(activeHomeProduction, /HomeEmbodiedAvatar|home-human-makehuman-v4\.glb|visible-avatar-presentation-activation-gate|home-avatar-presentation/)
  assert.equal((activeHomeProduction.match(/urai-home-user-avatar/g) ?? []).length, 1)
  assert.match(activeHomeProduction, /const legacyHotspotPatterns = \[[\s\S]*\/urai-home-user-avatar\/,[\s\S]*\]/)
  assert.match(activeHomeProduction, /useHomeExperienceController/)
  assert.match(activeHomeProduction, /<OrbCompanion state=\{orbState\} reducedMotion=\{reducedMotion\} onOrb=\{onOrb\} \/>/)
  assert.match(activeHomeProduction, /data-testid="urai-home-webgl-orb"/)
  assert.match(activeHomeProduction, /data-home-embodied-self=\{firstPerson \? 'camera-only-first-person-home' : 'camera-only-transition'\}/)
  assert.match(activeHomeProduction, /data-home-presence-presentation=\{firstPerson \? 'bodyless-first-person-home' : 'camera-only-transition'\}/)
  assert.match(activeHomeProduction, /data-home-camera-mode=\{homeState\.transition \?\? \(firstPerson \? \(dragging \? 'home-first-person-look' : 'home-first-person'\) : 'camera-only-transition'\)\}/)
  assert.match(activeHomeProduction, /data-home-movement=\{firstPerson \? 'shared-keyboard-touch-walk-look-interact' : 'camera-only-transition'\}/)
  assert.match(activeHomeProduction, /data-home-non-xr-body-policy="camera-only-no-hands-body-rig"/)
  assert.match(activeHomeProduction, /data-home-presence-policy="direct-first-person-camera-only-no-hands-body-rig"/)
  assert.match(activeHomeProduction, /data-home-avatar-activation-gate="none-direct-first-person-home"/)
  assert.match(activeHomeProduction, /data-home-art-revision="v293-direct-bodyless-first-person-convergence"/)
  assert.match(activeHomeProduction, /data-home-pointer-lock="false"/)
  assert.match(activeHomeProduction, /data-home-ground-entry="physical-world-surface"/)
  assert.match(activeHomeProduction, /data-home-life-map-entry="visible-sky-broad-interaction"/)
  assert.match(activeHomeProduction, /\/assets\/urai\/generated\/models\/urai-orb-avatar-v1\.glb/)
  assert.match(activeHomeProduction, /stepEmbodiedMotion/)
  assert.match(activeHomeProduction, /useMovementInput/)
  assert.match(activeHomeProduction, /MobileMovementPad/)
  assert.match(activeHomeProduction, /setLoop\(THREE\.LoopOnce, 1\)/)
  assert.match(activeHomeProduction, /clampWhenFinished = true/)
  assert.doesNotMatch(activeHomeProduction, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/)
  assert.match(activeHomeProduction, /const retiredLocalDestination = useCallback\(\(\) => \{\}, \[\]\)/)
  assert.match(activeHomeProduction, /onOrb=\{retiredLocalDestination\} onGround=\{retiredLocalDestination\} onLifeMap=\{retiredLocalDestination\}/)
  assert.match(activeHomeProduction, /event\.point\.clone\(\)/)
  assert.match(activeHomeProduction, /window\.addEventListener\(URAI_ORB_STATE_EVENT, listener\)/)
  assert.match(activeHomeProduction, /data-home-orb-state=\{orbState\}/)
  assert.match(activeHomeProduction, /data-home-orb-clip=\{resolveOrbSensoryOutput\(orbState, reducedMotion, true\)\.animation\}/)

  assert.match(groundedOrb, /GROUNDED_RELIQUARY_NAME = 'home-v288-grounded-biomorphic-memory-reliquary'/)
  assert.match(groundedOrb, /FALLBACK_INTERACTION_OWNER = 'home-gold-companion'/)
  assert.match(groundedOrb, /visualOnly: true/)
  assert.match(groundedOrb, /interactionOwner: false/)
  assert.match(groundedOrb, /fallbackVisualOwner: false/)
  assert.match(groundedOrb, /material\.colorWrite = false/)
  assert.match(groundedOrb, /material\.depthWrite = false/)

  assert.match(assetHome, /data-home-v288-certification/)
  assert.match(assetHome, /data-home-v226-retained-pixel-rebuild="superseded"/)
  assert.match(assetHome, /data-home-v288-retained-pixel-rebuild="active"/)
  assert.doesNotMatch(assetHome, /data-home-v226-certification/)

  assert.doesNotMatch(activeHomeVisual, /<Canvas/)
  assert.equal((activeHomeProduction.match(/<Canvas/g) ?? []).length, 1)
  assert.match(routeOwnerConvergence, /data-world-destination='home'[\s\S]*\.urai-world-companion__orb/)
  assert.match(routeOwnerConvergence, /background:\s*transparent\s*!important/)
  assert.match(routeOwnerConvergence, /box-shadow:\s*none\s*!important/)
  assert.match(routeOwnerConvergence, /outline:\s*3px solid rgba\(224,255,255,.96\)\s*!important/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-orb-trigger|urai-home-spatial-runtime-orb/)
})

test('active asset regeneration cannot re-promote Focus or Replay supporting-reference binaries', () => {
  const start = canonicalAssetForge.indexOf('CANON_CRITICAL_FILES={')
  const end = canonicalAssetForge.indexOf('CANON_RECEIPT_META={', start)
  const activeSet = canonicalAssetForge.slice(start, end)
  assert.match(activeSet, /life-map-memory-star-v1\.glb/)
  assert.match(activeSet, /urai-orb-avatar-v1\.glb/)
  assert.doesNotMatch(activeSet, /focus-memory-chamber-v1\.glb|replay-memory-environment-v1\.glb/)
  assert.match(canonicalAssetForge, /'schemaVersion':'2\.2\.0'/)
  assert.match(canonicalAssetForge, /Focus and Replay GLBs are retained only as supporting references/)
  assert.doesNotMatch(activeAssetRegenerationWorkflow, /focus-memory-chamber-v1\.glb|replay-memory-environment-v1\.glb/)
})

test('one environmental continuity layer persists across every route transition', () => {
  assert.match(shell, /PersistentRealmAtmosphere/)
  assert.match(shell, /<PersistentRealmAtmosphere\s*\/>/)
  assert.match(shell, /import '\.\/persistentRealmAtmosphere\.css'/)
  assert.match(atmosphere, /data-realm=\{world\.destination\}/)
  assert.match(atmosphere, /data-phase=\{phase\}/)
  assert.match(atmosphere, /urai-world-atmosphere__horizon/)
  assert.match(atmosphere, /urai-world-atmosphere__threshold/)
  for (const destination of ['infrastructure-hub', 'life-map', 'focus', 'replay', 'mirror', 'passport', 'privacy-controls', 'location-map']) assert.match(atmosphereCss, new RegExp(`data-realm=['"]${destination}['"]`))
  assert.match(atmosphereCss, /pointer-events:\s*none/)
  assert.match(atmosphereCss, /data-phase/)
  assert.match(atmosphereCss, /env\(safe-area-inset-bottom\)/)
  assert.match(atmosphereCss, /prefers-reduced-motion: reduce/)
})

test('page-like route chrome is removed from the active world', () => {
  for (const selector of ['.ground-card', '.ground-rail', '.focusTitle', '.focusNav']) assert.match(chrome, new RegExp(selector.replace('.', '\\.')))
  assert.match(chrome, /\[aria-label='URAI Life Map route portals'\]/)
  assert.match(chrome, /\[aria-label='Replay location'\]/)
  assert.match(chrome, /display:\s*none\s*!important/)
})

test('Life Map reads as the active full-viewport canonical stellar world', () => {
  assert.match(shell, /import '\.\/lifeMapConvergence\.css'/)
  assert.match(lifeMapConvergence, /data-world-destination='life-map'/)
  assert.match(cosmicLifeMap, /data-testid="urai-true-3d-life-map"/)
  assert.match(cosmicLifeMap, /<Canvas camera=\{\{ position: \[0, 2\.4, 27\], fov: 54, near: \.06, far: 190 \}\}/)
  assert.match(cosmicLifeMap, /className="life-map-root"/)
  assert.match(cosmicLifeMap, /position:fixed;inset:0;z-index:100;overflow:hidden/)
  assert.match(cosmicLifeMap, /type Phase = "overview" \| "departure" \| "travel" \| "approach" \| "arrival"/)
  assert.match(cosmicLifeMap, /data-life-map-phase=\{phase\}/)
  assert.match(cosmicLifeMap, /data-life-map-mode=\{selected \? "selected" : "overview"\}/)
  assert.match(cosmicLifeMap, /data-home-companion-owned="false"/)
  assert.match(cosmicLifeMap, /data-life-map-production-world="true"/)
  assert.match(cosmicLifeMap, /data-life-map-ground="none"/)
  assert.match(cosmicLifeMap, /<header className="life-map-title">/)
  assert.match(cosmicLifeMap, /<h1 className="sr-only">URAI Life Map private universe<\/h1>/)
  assert.match(cosmicLifeMap, /if \(selectedId\) overview\(\); else returnHome\(\)/)
  assert.match(cosmicLifeMap, /<button className="overview-return" onClick=\{overview\}>Overview<\/button>/)
  assert.match(cosmicLifeMap, /const returnHome = useCallback\(\(\) => \{ router\.push\(explicitDemo \? "\/home\?demo=1" : "\/home"\); \}/)
  assert.match(cosmicLifeMap, /env\(safe-area-inset-bottom\)/)
  assert.match(cosmicLifeMap, /@media\(max-width:700px\)/)
  assert.match(cosmicLifeMap, /@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(cosmicLifeMap, /requestPointerLock|PersistentWorldCompanion/)
})

test('canonical route clients own Focus and Replay', () => {
  assert.match(shell, /import '\.\/routeOwnerConvergence\.css'/)
  assert.match(focusClient, /data-testid="urai-final-focus-chamber"/)
  assert.match(focusClient, /useSelectedMemory\(\)/)
  assert.match(focusClient, /requestUraiWorldTravel/)
  assert.match(focusClient, /requestUraiWorldReturn/)
  assert.doesNotMatch(focusClient, /uraiAutoFocus|quiet-reset|replay-recovery-thread/)
  assert.match(replayClient, /data-testid="cinematic-replay-client"/)
  assert.match(replayClient, /useSelectedMemory\(\)/)
  assert.match(replayClient, /requestUraiWorldReturn/)
  assert.doesNotMatch(replayClient, /uraiAutoReplay|quiet-reset|replay-recovery-thread|seed-memory-bloom/)
  assert.doesNotMatch(routeOwnerConvergence, /\.uraiAutoFocus|\.uraiAutoReplay/)
  assert.match(routeOwnerConvergence, /data-world-destination='replay'/)
})

test('Replay supporting geometry is truthfully runtime-consumed without becoming visual or promotion authority', () => {
  const replayAsset = launchAssetManifest.assets.find((asset) => asset.id === 'replay-memory-environment-v1')
  assert.ok(replayAsset)
  assert.equal(replayAsset.releaseState, 'supporting-reference')
  assert.equal(replayAsset.authorityRole, 'runtime-supporting-geometry')
  assert.equal(replayAsset.runtimeConsumptionAllowed, true)
  assert.equal(replayPromotionRehearsal.routeConsumptionVerified, true)
  assert.equal(replayPromotionRehearsal.promote, false)
  assert.match(replayClient, /const REPLAY_ENVIRONMENT_MODEL = ['"]\/assets\/urai\/generated\/models\/replay-memory-environment-v1\.glb['"]/)
  assert.match(replayClient, /const gltf = useGLTF\(REPLAY_ENVIRONMENT_MODEL\)/)
  assert.match(replayClient, /<primitive object=\{model\} name="replay-memory-environment-v1" \/>/)
  assert.match(replayClient, /replay-film-portal/)
  assert.match(replayClient, /object\.visible = false/)
})

test('secondary realms remain full-viewport destinations owned by the shared Orb', () => {
  assert.match(shell, /import '\.\/secondaryRealmConvergence\.css'/)
  for (const destination of ['mirror', 'passport', 'privacy-controls', 'location-map']) assert.match(secondaryRealmConvergence, new RegExp(`data-world-destination=['"]${destination}['"]`))
  assert.match(secondaryRealmConvergence, /URAI launch route chain/)
  assert.match(secondaryRealmConvergence, /URAI passport route chain/)
  assert.match(secondaryRealmConvergence, /URAI privacy route chain/)
  assert.match(secondaryRealmConvergence, /display:\s*none\s*!important/)
  assert.match(secondaryRealmConvergence, /height:\s*100svh/)
  assert.match(secondaryRealmConvergence, /env\(safe-area-inset-bottom\)/)
  assert.match(secondaryRealmConvergence, /@media \(max-width: 430px\)/)
  assert.match(secondaryRealmConvergence, /prefers-reduced-motion: reduce/)
})

test('mobile safe area, scroll containment, and reduced motion remain explicit', () => {
  assert.match(chrome, /env\(safe-area-inset-bottom\)/)
  assert.match(chrome, /max-height:\s*min\(68svh, 520px\)/)
  assert.match(chrome, /overflow-y:\s*auto/)
  assert.match(chrome, /@media \(max-width: 560px\)/)
  assert.match(chrome, /prefers-reduced-motion: reduce/)
  assert.match(lifeMapConvergence, /prefers-reduced-motion: reduce/)
})

test('Life Map renders the current layered galaxy and stellar Memory Star authority', () => {
  for (const pattern of [
    /function MemoryStar/,
    /name=\{`life-map-memory-star-\$\{node\.id\}`\}/,
    /stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere"/,
    /function StellarDepthField/,
    /depthSpan=\{30\} zOffset=\{-2\}/,
    /depthSpan=\{58\} zOffset=\{-24\}/,
    /depthSpan=\{88\} zOffset=\{-58\}/,
    /<LivingGalaxyField tier=\{tier\}/,
    /function OverviewRegions/,
    /graphEdges: false/,
    /function Constellations\(\) \{ return <group name="life-map-constellations" visible=\{false\}/,
    /setPhase\(profile\.reducedMotion \? "arrival" : "departure"\)/,
    /setPhase\("travel"\)/,
    /setPhase\("approach"\)/,
    /setPhase\("arrival"\)/,
    /<nav className="life-map-thresholds" aria-label="Selected memory actions"/,
    />Enter Focus<\/strong>/,
    />Replay<\/strong>/,
    />Overview<\/button>/,
    /data-webgl-state=\{webglState\}/,
    /webglcontextlost/,
    /webglcontextrestored/,
    /Your selected memory, privacy state, and return position remain preserved\./,
    /Open semantic overview/,
  ]) assert.match(cosmicLifeMap, pattern)

  assert.match(lifeMapSelectedCinematic, /data-life-map-mode='selected'/)
  assert.match(lifeMapSelectedCinematic, /position: fixed/)
  assert.match(lifeMapSelectedCinematic, /pointer-events: auto !important/)
  assert.doesNotMatch(cosmicLifeMap, /function\s+MemoryLens|life-map-anchored-paths|sphereGeometry args=\{\[\.30 \+ node\.intensity/)
})

