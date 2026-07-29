import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const demoNodes = read('src/components/lifemap/canonicalLifeMapDemoNodes.ts')
const events = read('src/components/lifemap/useLifeMapEvents.ts')
const adaptive = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')

test('Quiet Reset is an exact replayable canonical Life Map node', () => {
  assert.match(demoNodes, /id: "quiet-reset"/)
  assert.match(demoNodes, /title: "The Quiet Reset"/)
  assert.match(demoNodes, /type: "recovery"/)
  assert.match(demoNodes, /replayAvailable: true/)
  assert.match(demoNodes, /connectedTo: \["memory-thread", "recovery-bloom", "threshold-moment", "voice-note-home"\]/)
  assert.match(demoNodes, /privacyLevel: "private"/)
  assert.match(demoNodes, /quietResetDemoNode,/)
  assert.match(demoNodes, /\.\.\.enrichedBaseNodes\.filter\(\(node\) => node\.id !== quietResetDemoNode\.id\)/)
  assert.match(demoNodes, /\.\.\.authoredDemoNodes/)
})

test('the explicit demo feed always publishes canonical positioned Quiet Reset identity', () => {
  assert.match(events, /import \{ canonicalLifeMapDemoNodes \} from "\.\/canonicalLifeMapDemoNodes"/)
  assert.match(events, /const positionedDemoNodes = canonicalLifeMapDemoNodes\.map/)
  assert.match(events, /useState<LifeMapNode\[\]>\(\(\) => explicitDemo \? positionedDemoNodes : \[\]\)/)
  assert.match(events, /setNodes\(positionedDemoNodes\)/)
  assert.doesNotMatch(events, /explicitDemo \? lifeMapNodes : \[\]/)
  assert.doesNotMatch(events, /setNodes\(lifeMapNodes\)/)
})

test('selected Life Map mode resolves exact node identity into Focus and Replay', () => {
  assert.match(adaptive, /const queryNode = safeToken\(params\.get\("node"\) \|\| params\.get\("memoryId"\)\)/)
  assert.match(adaptive, /nodes\.find\(\(candidate\) => candidate\.id === queryNode\)/)
  assert.match(adaptive, /setSelectedId\(node\.id\)/)
  assert.match(adaptive, /goalForNode\(selected\)/)
  assert.match(adaptive, /next\.set\("memoryId", selected\.id\)/)
  assert.match(adaptive, /next\.set\("manifestId", manifestId\)/)
  assert.match(adaptive, /next\.set\("node", selected\.id\)/)
  assert.match(adaptive, /next\.set\("returnNode", selected\.id\)/)
  assert.match(adaptive, /router\.push\(destinationHref\("focus"\)\)/)
  assert.match(adaptive, /router\.push\(destinationHref\("replay"\)\)/)
})
