import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const page = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const canonical = fs.readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const source = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const world = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const visualSystem = fs.readFileSync(new URL('../src/components/lifemap/lifeMapVisualSystem.ts', import.meta.url), 'utf8')
const demo = fs.readFileSync(new URL('../src/components/lifemap/canonicalLifeMapDemoNodes.ts', import.meta.url), 'utf8')
const navigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const events = fs.readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts', import.meta.url), 'utf8')
const shell = fs.readFileSync(new URL('../src/spatial/world/UraiWorldShell.tsx', import.meta.url), 'utf8')
const isolation = fs.readFileSync(new URL('../src/spatial/world/lifeMapProductionIsolation.css', import.meta.url), 'utf8')
const proof = fs.readFileSync(new URL('../../scripts/capture-lifemap-founder-proof.mjs', import.meta.url), 'utf8')

test('Life Map route has one canonical production scene owner', () => {
  assert.match(page, /SpatialLifeMapCanonical/)
  assert.match(canonical, /LifeMapRouteBoundary/)
  assert.match(boundary, /ComposedLifeMapScene/)
  assert.match(boundary, /LifeMapSemanticNavigator/)
  assert.equal((source.match(/<Canvas\b/g) || []).length, 1)
  assert.doesNotMatch(page, /RealLifeMapGalaxy|LifeMapScene/)
  assert.ok(source.includes('data-home-companion-owned="false"'))
  assert.ok(source.includes('data-spatial-visible="true"'))
  assert.ok(source.includes('data-life-map-production-world="true"'))
  assert.match(source, /<LifeMapProductionWorld/)
})

test('Canonical Life Map visually isolates the authored world from legacy plates and dashboard chrome', () => {
  assert.match(shell, /lifeMapProductionIsolation\.css/)
  assert.match(isolation, /urai-world-atmosphere/)
  assert.match(isolation, /urai-final-asset-spine-scene-layer/)
  assert.match(isolation, /data-testid='urai-true-3d-life-map'/)
  assert.match(isolation, /opacity: 1 !important/)
  assert.match(isolation, /life-map-journey-rail/)
  assert.match(isolation, /life-map-semantic-inspector/)
  assert.match(isolation, /life-map-search-trigger/)
  assert.match(isolation, /life-map-navigator/)
  assert.doesNotMatch(isolation, /life-map-navigator:not\(\[open\]\)|> summary/)
})

test('Life Map establishes authored foreground middle distance and horizon depth', () => {
  for (const marker of [
    'life-map-white-gold-life-core',
    'life-map-authored-chapter-regions',
    'life-map-light-bridges',
    'life-map-foreground-observatory',
    'life-map-relationship-observatory',
    'life-map-goal-horizon',
    'life-map-achievement-monument',
    'life-map-privacy-vault',
    'life-map-emotional-weather',
    'life-map-archive-particles',
    'life-map-far-future-horizon',
  ]) assert.match(world, new RegExp(marker))
  assert.match(world, /fog attach="fog"/)
  assert.match(world, /name="life-map-world-stage" scale={stageScale} position={stagePosition}/)
  assert.match(world, /scaleMode: "intimate"/)
  assert.match(world, /depthBand: "near"/)
  assert.match(world, /life-map-authored-chapter-regions/)
  assert.match(world, /life-map-far-future-horizon/)
})

test('Life Map uses deterministic sequential travel compositions with a safe selected-memory stand-off', () => {
  for (const phase of ['overview', 'departure', 'travel', 'approach', 'arrival']) assert.ok(source.includes(`"${phase}"`))
  assert.ok(source.includes('setPhase("departure")'))
  assert.ok(source.includes('setPhase("travel")'))
  assert.ok(source.includes('setPhase("approach")'))
  assert.ok(source.includes('setPhase("arrival")'))
  assert.ok(source.includes('PHASE_DURATION_MS[phase]'))
  assert.ok(source.includes('journeyToken.current'))
  assert.ok(source.includes('goalForNode'))
  assert.match(source, /const SELECTED_MEMORY_STANDOFF = 7\.[0-9]+/)
  assert.ok(source.includes('addScaledVector(direction, SELECTED_MEMORY_STANDOFF)'))
  assert.ok(source.includes('direction.lengthSq()'))
  assert.ok(source.includes('THREE.MathUtils.damp'))
  assert.ok(source.includes('data-life-map-phase={phase}'))
  assert.ok(source.includes('data-life-map-scale='))
  assert.doesNotMatch(source, /setTimeout\(\(\) => setPhase\("approach"\), 1050\)/)
})

test('Production artifacts are differentiated by meaning rather than generic bubbles', () => {
  for (const family of ['visual', 'audio', 'relationship', 'place', 'emotion', 'pattern', 'achievement', 'goal', 'future', 'everyday', 'archive', 'protected']) {
    assert.ok(visualSystem.includes(`"${family}"`), `missing artifact family ${family}`)
  }
  for (const component of ['VisualArtifact', 'AudioArtifact', 'RelationshipArtifact', 'PlaceArtifact', 'EmotionArtifact', 'PatternArtifact', 'AchievementArtifact', 'GoalArtifact', 'EverydayArtifact', 'ArchiveArtifact', 'ProtectedArtifact']) {
    assert.match(world, new RegExp(`function ${component}`))
  }
  assert.doesNotMatch(world.slice(world.indexOf('function MemoryArtifact'), world.indexOf('function SemanticPath')), /sphereGeometry/)
  assert.match(world, /name={`life-map-artifact-\${resolveArtifactFamily\(node\)}-\${node\.id}`}/)
  assert.match(world, /scale={active \? 0\.56 : 0\.42 \+ importance \* 0\.14}/)
  assert.match(world, /position=\{\[selected\.position\[0\], selected\.position\[1\] - 0\.28, selected\.position\[2\] - 2\.6\]\}/)
  assert.match(world, /scale=\{0\.34\}/)
  assert.match(world, /artifactFamilyLabel\(node\)/)
})

test('Relationships use curved semantic path classes, living pulses, and privacy-aware rendering', () => {
  for (const kind of ['family', 'friendship', 'work', 'conflict', 'goal', 'temporal', 'pattern', 'confirmed', 'inferred', 'corrected', 'protected']) {
    assert.ok(visualSystem.includes(`"${kind}"`), `missing path kind ${kind}`)
  }
  assert.match(world, /QuadraticBezierCurve3/)
  assert.match(world, /life-map-curved-semantic-paths/)
  assert.match(world, /resolvePathKind\(source, target\)/)
  assert.match(world, /kind === "protected"/)
  assert.match(world, /dashed={kind === "inferred" \|\| kind === "corrected" \|\| kind === "protected"}/)
  assert.match(world, /curve\.getPoint\(t\)/)
})

test('Selection Focus Replay Overview and Escape preserve artifact identity', () => {
  assert.ok(source.includes('next.set("memoryId", node.id)'))
  assert.ok(source.includes('next.set("node", node.id)'))
  assert.ok(source.includes('next.set("returnNode", selected.id)'))
  assert.ok(source.includes('next.set("artifactFamily", resolveArtifactFamily(selected))'))
  assert.ok(source.includes('router.push(destinationHref("focus"))'))
  assert.ok(source.includes('router.push(destinationHref("replay"))'))
  assert.ok(source.includes('if (selectedId) overview(); else router.push("/home")'))
  assert.ok(source.includes('next.set("overview", "1")'))
  assert.match(source, /aria-label="Selected memory actions"/)
})

test('Semantic navigator supports search filters keyboard travel and connected destinations', () => {
  assert.match(navigator, /Search memories, people, dates, places, themes, and eras/)
  assert.match(navigator, /TYPE_FILTERS/)
  assert.match(navigator, /typeFilter === 'all' \|\| node\.type === typeFilter|typeFilter === "all" \|\| node\.type === typeFilter/)
  assert.match(navigator, /eraFilter === 'all' \|\| node\.eraId === eraFilter|eraFilter === "all" \|\| node\.eraId === eraFilter/)
  assert.match(navigator, /event\.key === 'ArrowRight'|event\.key === "ArrowRight"/)
  assert.match(navigator, /event\.key === 'ArrowLeft'|event\.key === "ArrowLeft"/)
  assert.match(navigator, /event\.key === 'Home'|event\.key === "Home"/)
  assert.match(navigator, /event\.key === '\/'|event\.key === "\/"/)
  assert.match(navigator, /selected\.connectedTo\.includes\(node\.id\)/)
  assert.match(navigator, /node\.connectedTo\.includes\(selected\.id\)/)
  assert.match(navigator, /Connected/)
  assert.doesNotMatch(navigator, /destinationHref\("timeline"\)|destinationHref\("location-map"\)/)
  assert.match(navigator, /data-visible-count=/)
  assert.match(navigator, /min-height:48px/)
  assert.match(navigator, /env\(safe-area-inset-bottom\)/)
})

test('Only explicit demo identity can load the coherent disclosed sample universe', () => {
  assert.ok(source.includes('const explicitDemoRequested = params.get("demo") === "1"'))
  assert.ok(source.includes('useLifeMapEvents(explicitDemoRequested ? "demo-user" : undefined)'))
  assert.ok(source.includes('if (explicitDemoRequested) next.set("demo", "1")'))
  assert.match(navigator, /const explicitDemo = params\.get\('demo'\) === '1'|const explicitDemo = params\.get\("demo"\) === "1"/)
  assert.match(navigator, /useLifeMapEvents\(explicitDemo \? 'demo-user' : undefined\)|useLifeMapEvents\(explicitDemo \? "demo-user" : undefined\)/)
  assert.match(events, /function explicitDemoEnabled\(explicitUserId\?: string\) \{\s*return explicitUserId === "demo-user";/)
  assert.doesNotMatch(events, /NEXT_PUBLIC_URAI_EXPLICIT_DEMO/)
  assert.doesNotMatch(events, /lifeMapDemoMode/)
  for (const id of ['voice-note-home', 'home-place-fragment', 'relationship-repair-orbit', 'recurring-pressure-loop', 'earned-ground-monument', 'active-goal-structure', 'future-bridge', 'sealed-private-chapter']) {
    assert.ok(demo.includes(`id: "${id}"`), `missing coherent demo node ${id}`)
  }
})

test('Signed-out threshold never mounts private memory data', () => {
  assert.ok(canonical.includes('data-testid="urai-life-map-signed-out-threshold"'))
  assert.ok(canonical.includes('data-private-memory-mounted="false"'))
  assert.ok(canonical.includes('Signed out · no personal data displayed'))
  assert.ok(canonical.includes('Open disclosed sample'))
  assert.ok(canonical.includes('current.get("demo") === "1"'))
  assert.doesNotMatch(canonical, /DEMO_MODE_KEY|lifeMapDemoMode/)
})

test('Reduced motion portrait adaptive quality and high contrast retain equivalent journeys', () => {
  assert.match(source, /profile\.reducedMotion/)
  assert.match(source, /shadows={profile\.shadows}/)
  assert.match(world, /profile\.tier/)
  assert.match(world, /profile\.postprocessing/)
  assert.match(source, /size\.height > size\.width/)
  assert.match(source, /positionGoal\.current\.set\(0, 2\.15, 16\.6\)/)
  assert.match(source, /@media\(max-width:700px\)/)
  assert.match(source, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(source, /@media\(forced-colors:active\)/)
  assert.ok(source.includes('min-height:58px'))
  assert.ok(source.includes('env(safe-area-inset-bottom)'))
  assert.match(navigator, /@media\(max-width:760px\)/)
  assert.match(navigator, /@media\(prefers-reduced-motion:reduce\)/)
})

test('Founder proof rejects blank, duplicate, or state-incomplete WebGL evidence', () => {
  assert.match(proof, /waitForRenderedWorld/)
  assert.match(proof, /data-life-map-visible-anchors/)
  assert.match(proof, /parallax proof produced duplicate captures/)
  assert.match(proof, /WebGL pixel variance is below the visible-world minimum/)
  assert.match(proof, /waitForState\(page, 'data-life-map-phase', 'approach'\)/)
  assert.match(proof, /waitForState\(page, 'data-life-map-phase', 'arrival'\)/)
  assert.match(proof, /requestfailed/)
  assert.match(proof, /pageerror/)
})

test('WebGL context loss preserves truthful semantic recovery', () => {
  assert.ok(source.includes('webglcontextlost'))
  assert.ok(source.includes('webglcontextrestored'))
  assert.ok(source.includes('data-webgl-state={webglState}'))
  assert.ok(source.includes('Your selected memory, privacy state, and return position remain preserved.'))
  assert.ok(source.includes('Open semantic overview'))
  assert.ok(canonical.includes('data-testid="urai-life-map-authored-fallback"'))
  assert.ok(canonical.includes('requestUraiWorldReturn()'))
})
