import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigator = await readFile(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const scene = await readFile(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const world = await readFile(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')

test('semantic navigator owns one route selection without re-entering through hidden world labels', () => {
  assert.match(navigator, /className="life-map-semantic-result" data-life-map-semantic-result data-life-map-node-id=\{node\.id\} role="listitem"/)
  assert.doesNotMatch(navigator, /className="life-map-world-label"[^>]*role="listitem"/)
  assert.doesNotMatch(navigator, /function activateWorldLabel|owner\.click\(\)|activateWorldLabel\(node\)/)
  assert.match(navigator, /setNavigatorOpen\(false\);[\s\S]*next\.set\("memoryId", node\.id\)[\s\S]*next\.set\("node", node\.id\)[\s\S]*router\.replace/)
  assert.match(scene, /onSelect=\{selectNode\}/)
})

test('mounted world labels retain independent pointer activation ownership', () => {
  assert.match(world, /className="life-map-world-label" data-life-map-node-id=\{node\.id\}/)
  assert.match(world, /button\.life-map-world-label\[data-life-map-node-id\]/)
  assert.match(world, /document\.addEventListener\("click", handleWorldLabelClick, true\)/)
  assert.match(world, /if \(node\) onSelect\(node\)/)
})

test('semantic navigator retains externally opened native details state across rerenders', () => {
  assert.match(navigator, /const navigatorRef = useRef<HTMLDetailsElement>\(null\)/)
  assert.match(navigator, /const desiredNavigatorOpenRef = useRef\(false\)/)
  assert.match(navigator, /desiredNavigatorOpenRef\.current = open/)
  assert.match(navigator, /useLayoutEffect\(\(\) => \{[\s\S]*navigator\.open !== desiredNavigatorOpenRef\.current[\s\S]*navigator\.open = desiredNavigatorOpenRef\.current/)
  assert.match(navigator, /new MutationObserver\(\(\) => \{[\s\S]*desiredNavigatorOpenRef\.current = navigator\.open/)
  assert.match(navigator, /attributeFilter: \["open"\]/)
  assert.match(navigator, /<details ref=\{navigatorRef\} className="life-map-navigator" data-life-map-navigator>/)
  assert.doesNotMatch(navigator, /open=\{navigatorOpen\}/)
  assert.match(navigator, /if \(event\.key === "\/"\)[\s\S]*setNavigatorOpen\(true\)/)
  assert.match(navigator, /setNavigatorOpen\(false\);[\s\S]*router\.replace/)
})