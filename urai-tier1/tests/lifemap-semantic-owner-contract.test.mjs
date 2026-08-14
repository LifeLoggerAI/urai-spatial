import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigator = await readFile(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const scene = await readFile(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const world = await readFile(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const selection = await readFile(new URL('../src/components/lifemap/lifeMapSelection.ts', import.meta.url), 'utf8')
const founder = await readFile(new URL('../../scripts/capture-lifemap-founder-proof-fixed.mjs', import.meta.url), 'utf8')

test('semantic navigator invokes the authoritative world selection transaction without hidden re-entry', () => {
  assert.match(navigator, /className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id=\{node\.id\} role="listitem"/)
  assert.doesNotMatch(navigator, /className="life-map-world-label"|function activateWorldLabel|owner\.click\(\)|activateWorldLabel\(node\)/)
  assert.match(navigator, /requestLifeMapSelection\(node\.id, source\)/)
  assert.match(selection, /LIFE_MAP_SELECTION_EVENT = 'urai:life-map-select-node'/)
  assert.match(selection, /window\.dispatchEvent\(new CustomEvent<LifeMapSelectionDetail>/)
  assert.match(world, /window\.addEventListener\(LIFE_MAP_SELECTION_EVENT, handleSelectionRequest\)/)
  assert.match(world, /const node = nodes\.find\(\(candidate\) => candidate\.id === detail\.nodeId\)/)
  assert.match(world, /if \(node\) onSelect\(node\)/)
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

test('mounted 3D artifacts retain independent pointer activation ownership', () => {
  assert.doesNotMatch(world, /life-map-world-label|handleWorldLabelClick|document\.addEventListener\("click"/)
  assert.match(world, /name=\{`life-map-artifact-\$\{resolveArtifactFamily\(node\)\}-\$\{node\.id\}`\}/)
  assert.match(world, /userData=\{\{ artifactFamily: resolveArtifactFamily\(node\), importance: importance\.toFixed\(2\), semanticLabel, chapterId: chapter\.id, runtimeAsset: MEMORY_STAR_MODEL \}\}/)
  assert.doesNotMatch(world, /data-artifact-family=/)
  assert.match(world, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(node\); \}\}/)
  assert.match(world, /if \(node\) onSelect\(node\)/)
})

test('pointer keyboard and touch semantic paths converge on one single-fire selection transaction', () => {
  assert.match(navigator, /event\.detail === 0 \? 'keyboard' : 'pointer'|event\.detail === 0 \? "keyboard" : "pointer"/)
  assert.match(navigator, /selectNode\(candidates\[\(current \+ direction \+ candidates\.length\) % candidates\.length\], 'keyboard'\)|selectNode\(candidates\[\(current \+ direction \+ candidates\.length\) % candidates\.length\], "keyboard"\)/)
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

test('Founder proof waits for the real selected world state and real journey phases', () => {
  assert.match(founder, /waitForState\(page, 'data-life-map-mode', 'selected'\)/)
  assert.match(founder, /waitForState\(page, 'data-life-map-phase', 'travel'\)/)
  assert.match(founder, /waitForState\(page, 'data-life-map-phase', 'approach'\)/)
  assert.match(founder, /waitForState\(page, 'data-life-map-phase', 'arrival'\)/)
  assert.doesNotMatch(founder, /synthetic-selected|test-only-selected|forceSelected/)
})
