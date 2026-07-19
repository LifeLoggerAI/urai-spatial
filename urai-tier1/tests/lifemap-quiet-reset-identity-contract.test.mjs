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
  assert.match(demoNodes, /connectedTo: \["memory-thread", "recovery-bloom", "threshold-moment"\]/)
  assert.match(demoNodes, /privacyLevel: "private"/)
  assert.match(demoNodes, /lifeMapNodes\.some\(/)
  assert.match(demoNodes, /\? lifeMapNodes\s*:\s*\[quietResetDemoNode, \.\.\.lifeMapNodes\]/s)
})

test('the explicit demo feed always publishes canonical Quiet Reset identity', () => {
  assert.match(events, /import \{ canonicalLifeMapDemoNodes \} from "\.\/canonicalLifeMapDemoNodes"/)
  assert.match(events, /explicitDemo \? canonicalLifeMapDemoNodes : \[\]/)
  assert.match(events, /setNodes\(canonicalLifeMapDemoNodes\)/)
  assert.doesNotMatch(events, /explicitDemo \? lifeMapNodes : \[\]/)
  assert.doesNotMatch(events, /setNodes\(lifeMapNodes\)/)
})

test('selected Life Map mode resolves exact node identity into Focus and Replay', () => {
  assert.match(adaptive, /const queryNodeId = safeToken\(params\.get\("node"\) \|\| params\.get\("nodeId"\) \|\| params\.get\("memoryId"\)\)/)
  assert.match(adaptive, /nodes\.find\(\(candidate\) => candidate\.id === queryNodeId\)/)
  assert.match(adaptive, /setSelectedId\(node\.id\)/)
  assert.match(adaptive, /setCameraIntent\(cameraForNode\(node\)\)/)
  assert.match(adaptive, /next\.set\("memoryId", node\.id\)/)
  assert.match(adaptive, /next\.set\("manifestId", manifestId\)/)
  assert.match(adaptive, /next\.set\("node", node\.id\)/)
  assert.match(adaptive, /next\.set\("returnNode", node\.id\)/)
  assert.match(adaptive, /router\.push\(identityHref\("focus", node\)\)/)
  assert.match(adaptive, /router\.push\(identityHref\("replay", node\)\)/)
})
