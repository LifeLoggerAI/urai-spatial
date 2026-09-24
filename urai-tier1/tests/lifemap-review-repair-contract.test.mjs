import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const scene = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const canvasProof = fs.readFileSync(new URL('../../scripts/verify-lifemap-canvas-proof.mjs', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../../.github/workflows/lifemap-founder-visual-proof.yml', import.meta.url), 'utf8')
const focusSource = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')

test('Memory Star review proof uses the same canonical readiness threshold as the full cosmic world', () => {
  assert.match(scene, /function RenderProof\(\)/)
  assert.match(scene, /const ready = gl\.info\.render\.calls > 0 && objects > 20 && anchors >= 8/)
  assert.ok((scene.match(/<RenderProof \/>/g) || []).length >= 2)
  assert.doesNotMatch(scene, /minObjects|minAnchors/)
  assert.match(scene, /memoryStarReview === "isolated" \|\| memoryStarReview === "hover" \|\| memoryStarReview === "near-cluster"/)
  assert.match(scene, /name="memory-star-reference-review"/)
})

test('Memory Star hover and related emphasis preserve the same mounted stellar object', () => {
  assert.match(scene, /const \[hovered, setHovered\] = useState\(false\)/)
  assert.match(scene, /const hoverEmphasis = forceHover \|\| hovered/)
  assert.match(scene, /const outer = \(active \? 1\.08 : related \? \.82 : \.74\)/)
  assert.match(scene, /onPointerOver=\{\(event\) => pointer\(event, true\)\}/)
  assert.match(scene, /onPointerOut=\{\(event\) => pointer\(event, false\)\}/)
  assert.match(scene, /root\.dataset\.memoryStarPointerHit = node\.id/)
  assert.doesNotMatch(scene, /hovered \? <[^>]*(planet|orb|ring|portal)/i)
  assert.match(scene, /data-life-map-quality=\{profile\.tier\}/)
})

test('selected camera goals use the same deterministic cosmic point as rendered memories', () => {
  assert.match(scene, /const point = useMemo\(\(\) => positionOverride \?\? cosmicPoint\(node, index\)/)
  assert.match(scene, /const target = new THREE\.Vector3\(\.\.\.cosmicPoint\(selected, selectedIndex\)\)/)
  assert.match(scene, /const selectedPoint = selected \? cosmicPoint\(selected, selectedIndex\) : null/)
  assert.match(scene, /COSMIC_LAYOUT_VERSION = 3/)
  assert.match(scene, /COSMIC_SEED_VERSION = 1/)
})

test('reduced motion forces an in-flight selected journey directly to arrival', () => {
  assert.match(scene, /if \(profile\.reducedMotion\) \{ journey\.current \+= 1; setPhase\("arrival"\); return; \}/)
  assert.match(scene, /if \(reducedMotion\) \{ camera\.position\.copy\(position\); look\.current\.copy\(target\); \}/)
})

test('selected arrival preserves surrounding personal-universe geography instead of isolating one node', () => {
  assert.match(scene, /<group name="life-map-deep-space">/)
  assert.match(scene, /<OverviewRegions nodes=\{nodes\} phase=\{phase\} \/>/)
  assert.match(scene, /<group name="life-map-memory-stars">\{nodes\.map/)
  assert.match(scene, /life-map-selected-local-depth/)
  assert.match(scene, /life-map-selected-memory-dust/)
  assert.doesNotMatch(scene, /const visibleNodes\s*=\s*.*\[selected\]/)
})

test('relationship graph language remains retired from the visible overview grammar', () => {
  assert.match(scene, /function Constellations\(\) \{ return <group name="life-map-constellations" visible=\{false\}/)
  assert.match(scene, /retiredVisualRole: "v260-no-explicit-graph-edges"/)
  assert.match(scene, /graphEdges: false/)
  assert.doesNotMatch(scene, /<line>|<lineSegments>|LineSegments|CatmullRomCurve3|TubeGeometry/)
})

test('portrait overview compacts the same galaxy into vertical territory composition', () => {
  assert.match(scene, /function PortraitOverviewDepth/)
  assert.match(scene, /if \(phase !== "overview" \|\| size\.height <= size\.width\) return null/)
  assert.match(scene, /portraitAuthority: portrait \? "v285-vertical-territory-composition" : "desktop-v284-archipelago-composition"/)
  assert.match(scene, /layoutRadius = \(portrait \? 6\.8 : 7\.4\)/)
  assert.match(scene, /portraitBand = portrait \? \(index - 2\.5\) \* 2\.65/)
})

test('Founder proof samples retained WebGL canvas pixels only', () => {
  assert.match(canvasProof, /canvas\.screenshot\(/)
  assert.match(canvasProof, /sampleCount !== 3456/)
  assert.match(canvasProof, /retained-webgl-canvas-png/)
  assert.match(canvasProof, /distributed-grid-24x16-3x3/)
  assert.match(canvasProof, /receipt\.captures\.length === 4/)
  assert.match(workflow, /scripts\/verify-lifemap-canvas-proof\.mjs/)
  assert.match(workflow, /lifemap-review-repair-contract\.test\.mjs/)
})

test('Focus final composition preserves selected-star identity and rejects terrain or orb ownership', () => {
  assert.match(focusSource, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.match(focusSource, /data-focus-visual-revision="v395-stellar-photosphere-visible-contained-memory-no-orb"/)
  assert.match(focusSource, /data-focus-spatial="selected-memory-star"/)
  assert.match(focusSource, /data-focus-terrain-owner="false"/)
  assert.match(focusSource, /data-focus-life-map-star-morphology="stellar-point-photosphere-layered-corona"/)
  assert.match(focusSource, /data-focus-stellar-treatment="selected-corona-plasma-irregular-photosphere-visible-contained-memory-v395"/)
  assert.match(focusSource, /name="focus-selected-memory-star"/)
  assert.match(focusSource, /<MemoryVisualContent memory=\{memory\} \/>/)
  assert.doesNotMatch(focusSource, /FocusSanctuaryGround|FocusStoneBank|focusSelectedMemoryCavityDepth|createFocusGroundIncision|FOCUS_CHAMBER_MODEL/)
})
