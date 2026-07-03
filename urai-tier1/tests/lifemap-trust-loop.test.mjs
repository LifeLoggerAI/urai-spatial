import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routeSource = readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const galaxySource = readFileSync(new URL('../src/components/lifemap/RealLifeMapGalaxy.tsx', import.meta.url), 'utf8')
const universeSource = readFileSync(new URL('../src/spatial/lifemap/lifeMapUniverseData.ts', import.meta.url), 'utf8')


test('Life Map route preserves the final RealLifeMapGalaxy authority', () => {
  assert.ok(routeSource.includes('RealLifeMapGalaxy'))
  assert.ok(!routeSource.includes('TierOneExperience'))
  assert.ok(!routeSource.includes('LifeMapTrustLoop'))
})

test('final galaxy keeps private selected-star state inside the route owner', () => {
  assert.ok(galaxySource.includes('const [selected, setSelected]'))
  assert.ok(galaxySource.includes('aria-pressed={active}'))
  assert.ok(galaxySource.includes('Select ${node.title}. Double click or press Enter to enter Focus.'))
  assert.ok(galaxySource.includes('Selected star'))
  assert.ok(galaxySource.includes('Thirty-four private stars'))
})

test('memory identity is deterministic and private-route safe', () => {
  assert.ok(galaxySource.includes("['quiet-reset', 'The Quiet Reset'"))
  assert.ok(galaxySource.includes('Array.from({ length: 34 }'))
  assert.ok(galaxySource.includes('encodeURIComponent(memoryId)'))
  assert.ok(galaxySource.includes('/focus?memoryId='))
  assert.ok(galaxySource.includes('/replay?memoryId='))
  assert.ok(universeSource.includes("privacyLevel: 'private'"))
})

test('node selection stays in place before explicit Focus or Replay actions', () => {
  assert.ok(galaxySource.includes('onClick={() => setSelected(node)}'))
  assert.ok(galaxySource.includes('onDoubleClick={() => router.push(focusHref(node.id))}'))
  assert.ok(galaxySource.includes('const openFocus = () => router.push(focusHref(selected.id))'))
  assert.ok(galaxySource.includes('const openReplay = () => router.push(replayHref(selected.id))'))
  assert.ok(galaxySource.includes('Enter Focus'))
  assert.ok(galaxySource.includes('Replay'))
})

test('selected-star camera pull and recenter remain user-controlled', () => {
  assert.ok(galaxySource.includes("'--pull-x'"))
  assert.ok(galaxySource.includes("'--pull-y'"))
  assert.ok(galaxySource.includes('setSelected(nodes[0])'))
  assert.ok(galaxySource.includes('Recenter'))
})

test('mobile dock remains stacked above route navigation', () => {
  assert.ok(galaxySource.includes('@media (max-width: 760px)'))
  assert.ok(galaxySource.includes('.starDock'))
  assert.ok(galaxySource.includes('.portalRail'))
})
