import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigator = await readFile(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const scene = await readFile(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const selection = await readFile(new URL('../src/components/lifemap/lifeMapSelection.ts', import.meta.url), 'utf8')
const founder = await readFile(new URL('../../scripts/capture-lifemap-founder-proof-fixed.mjs', import.meta.url), 'utf8')

test('semantic navigator invokes the authoritative world selection transaction without hidden re-entry', () => {
  assert.match(navigator, /className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id=\{node\.id\} role="listitem"/)
  assert.doesNotMatch(navigator, /className="life-map-world-label"|function activateWorldLabel|owner\.click\(\)|activateWorldLabel\(node\)/)
  assert.match(navigator, /requestLifeMapSelection\(node\.id, source\)/)
  assert.match(selection, /LIFE_MAP_SELECTION_EVENT = 'urai:life-map-select-node'/)
  assert.match(selection, /window\.dispatchEvent\(new CustomEvent<LifeMapSelectionDetail>/)
  assert.match(scene, /window\.addEventListener\(LIFE_MAP_SELECTION_EVENT, handler\)/)
  assert.match(scene, /const detail = readLifeMapSelection\(event\)/)
  assert.match(scene, /const node = nodes\.find\(\(candidate\) => candidate\.id === detail\.nodeId\)/)
  assert.match(scene, /if \(node\) selectNode\(node\)/)
  assert.match(scene, /onSelect=\{selectNode\}/)
})

test('selection delivery is one synchronous authoritative request with no duplicate broker retries', () => {
  assert.match(selection, /const detail = \{ nodeId, source \}/)
  assert.match(selection, /window\.dispatchEvent\(new CustomEvent<LifeMapSelectionDetail>/)
  assert.doesNotMatch(selection, /SELECTION_RETRY_DELAYS_MS|selectionWasAcknowledged|setTimeout|dispatchLifeMapSelection/)
  assert.doesNotMatch(selection, /route\.searchParams|synthetic-selected|test-only-selected|forceSelected/)
})

test('semantic selection emits one authoritative event and synchronizes route identity without fallback retries', () => {
  assert.match(navigator, /requestLifeMapSelection\(node\.id, source\)/)
  assert.match(navigator, /next\.set\('memoryId'|next\.set\("memoryId"/)
  assert.match(navigator, /next\.set\('node'|next\.set\("node"/)
  assert.match(navigator, /router\.replace\(`\/life-map\?\$\{next\.toString\(\)\}`/)
  assert.doesNotMatch(navigator, /selectionFallbackRef|window\.setTimeout\([\s\S]*router\.replace|root\?\.dataset\.lifeMapMode|routeSelectedId/)
  assert.equal((navigator.match(/requestLifeMapSelection\(node\.id, source\)/g) || []).length, 1)
})

test('mounted cosmic Memory Stars retain independent pointer activation ownership', () => {
  assert.doesNotMatch(scene, /life-map-world-label|handleWorldLabelClick|document\.addEventListener\("click"/)
  assert.match(scene, /name=\{`life-map-memory-star-\$\{node\.id\}`\}/)
  assert.match(scene, /visualAuthority: "stellar-memory-not-node-graph"/)
  assert.match(scene, /stellarMorphology: "point-photosphere-layered-corona-no-visible-sphere"/)
  assert.match(scene, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(node\); \}\}/)
  assert.match(scene, /root\.dataset\.memoryStarPointerHit = node\.id/)
  assert.match(scene, /<mesh scale=\{active \? 1\.15 : overview \? 1\.08 : \.92\}>/)
  assert.match(scene, /<sphereGeometry args=\{\[\.30, 8, 6\]\} \/>/)
  assert.match(scene, /<meshBasicMaterial transparent opacity=\{0\} depthWrite=\{false\} colorWrite=\{false\} \/>/)
})

test('pointer keyboard and touch semantic paths converge on one single-fire selection transaction', () => {
  assert.match(navigator, /event\.detail === 0 \? 'keyboard' : 'pointer'|event\.detail === 0 \? "keyboard" : "pointer"/)
  assert.match(navigator, /const currentParams = new URLSearchParams\(window\.location\.search\)/)
  assert.match(navigator, /const liveSelectedId = currentParams\.get\('overview'\) === '1'/)
  assert.match(navigator, /const nextIndex = current >= 0[\s\S]*\? \(current \+ direction \+ candidates\.length\) % candidates\.length[\s\S]*: direction >= 0 \? 0 : candidates\.length - 1/)
  assert.match(navigator, /selectNode\(candidates\[nextIndex\], 'keyboard'\)|selectNode\(candidates\[nextIndex\], "keyboard"\)/)
  assert.doesNotMatch(navigator, /onTouchEnd=/)
  assert.match(founder, /await page\.touchscreen\.tap\(x, y\)/)
  assert.match(founder, /await page\.mouse\.click\(x, y\)/)
  assert.match(founder, /await page\.keyboard\.press\('Enter'\)/)
  assert.match(founder, /await activateCanonicalControl\(page, resultSelector, result, options\.keyboard \? 'keyboard' : options\.touch \? 'touch' : 'pointer'\)/)
  assert.match(selection, /const detail = \{ nodeId, source \}/)
})

test('semantic navigator is opt-in, semantically controlled, and keyboard accessible without a permanent rail', () => {
  assert.match(navigator, /const \[open, setOpen\] = useState\(false\)/)
  assert.match(navigator, /className="life-map-search-trigger"/)
  assert.match(navigator, /aria-label="Search and navigate Life Map"/)
  assert.match(navigator, /aria-expanded=\{open\}/)
  assert.match(navigator, /onClick=\{\(\) => \{ setOpen\(\(value\) => !value\)/)
  assert.match(navigator, /\{open \? <section className="life-map-navigator" aria-label="Search and filter Life Map">/)
  assert.match(navigator, /if \(event\.key === '\/'\)|if \(event\.key === "\/"\)/)
  assert.match(navigator, /setOpen\(true\)/)
  assert.match(navigator, /event\.key === 'Escape' && open|event\.key === "Escape" && open/)
  assert.match(navigator, /setOpen\(false\)/)
  assert.doesNotMatch(navigator, /<details|<summary|life-map-journey-rail/)
})

test('Founder proof observes the real selected world state and real journey phases', () => {
  assert.match(founder, /waitForState\(page, 'data-life-map-mode', 'selected'\)/)
  assert.match(founder, /selectQuietResetAtFrozenPhase\(/)
  assert.match(founder, /await armJourneyPhaseWatch\(page, targetPhase\)/)
  assert.match(founder, /await readJourneyPhaseWatch\(page, targetPhase, 1_000\)/)
  assert.match(founder, /Emulation\.setVirtualTimePolicy/)
  assert.match(founder, /policy: 'pause'/)
  assert.match(founder, /policy: 'advance'/)
  assert.match(founder, /captureIsolatedJourneyPhase\(\{ id: 'selection-start', targetPhase: 'departure', captureState: 'departure' \}\)/)
  assert.match(founder, /captureIsolatedJourneyPhase\(\{ id: 'mid-travel', targetPhase: 'travel', captureState: 'travel' \}\)/)
  assert.match(founder, /captureIsolatedJourneyPhase\(\{ id: 'approach', targetPhase: 'approach', captureState: 'approach' \}\)/)
  assert.match(founder, /waitForState\(page, 'data-life-map-phase', 'arrival'\)/)
  assert.doesNotMatch(founder, /synthetic-selected|test-only-selected|forceSelected|window\.setTimeout\s*=|captureTimingFactor/)
})
