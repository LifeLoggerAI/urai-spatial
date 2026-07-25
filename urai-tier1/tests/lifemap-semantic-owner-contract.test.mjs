import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const navigator = await readFile(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const scene = await readFile(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('semantic navigator activates the real world-label owner before persisting route state', () => {
  assert.match(navigator, /function activateWorldLabel\(node: LifeMapNode\)/)
  assert.match(navigator, /button\.life-map-world-label/)
  assert.match(navigator, /button\.getAttribute\("role"\) !== "listitem"/)
  assert.match(navigator, /owner\.click\(\)/)
  assert.match(navigator, /className="life-map-world-label" data-life-map-node-id=\{node\.id\} role="listitem"/)
  assert.match(navigator, /activateWorldLabel\(node\);[\s\S]*router\.replace/)
  assert.match(scene, /onSelect=\{selectNode\}/)
})

test('semantic navigator visibility is state-owned across external open and rerenders', () => {
  assert.match(navigator, /const \[navigatorOpen, setNavigatorOpen\] = useState\(false\)/)
  assert.match(navigator, /open=\{navigatorOpen\}/)
  assert.match(navigator, /onToggle=\{\(event\) => setNavigatorOpen\(event\.currentTarget\.open\)\}/)
  assert.match(navigator, /if \(event\.key === "\/"\)[\s\S]*setNavigatorOpen\(true\)/)
  assert.match(navigator, /setNavigatorOpen\(false\);[\s\S]*router\.replace/)
})
