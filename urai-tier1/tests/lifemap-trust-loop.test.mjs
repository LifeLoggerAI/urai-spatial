import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dataSource = readFileSync(new URL('../src/spatial/lifemap/lifeMapTrustData.ts', import.meta.url), 'utf8')
const loopSource = readFileSync(new URL('../src/spatial/lifemap/LifeMapTrustLoop.tsx', import.meta.url), 'utf8')
const routeSource = readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const shellSource = readFileSync(new URL('../src/spatial/layout/TierOneExperience.tsx', import.meta.url), 'utf8')
const integratedSceneSource = readFileSync(new URL('../src/scene/UraiIntegratedHomeScene.tsx', import.meta.url), 'utf8')
const homeSceneSource = readFileSync(new URL('../src/scene/HomeScene.tsx', import.meta.url), 'utf8')

test('Life Map route preserves canonical TierOneExperience shell', () => {
  assert.ok(routeSource.includes('TierOneExperience'))
  assert.ok(routeSource.includes('mode="life-map"'))
})

test('canonical shell delegates Life Map authority through integrated HomeScene wrapper', () => {
  assert.ok(shellSource.includes('<UraiIntegratedHomeScene sceneMode={mode} />'))
  assert.ok(integratedSceneSource.includes('<HomeScene sceneMode={sceneMode} />'))
  assert.ok(!shellSource.includes('mode === "life-map" ? <LifeMapTrustLoop /> : null'))
  assert.ok(shellSource.includes('mode !== "life-map"'))
  assert.ok(shellSource.includes('mode !== "home"'))
})

test('HomeScene mounts selected-node trust loop behind Life Map gate authority', () => {
  assert.ok(homeSceneSource.includes("import LifeMapTrustLoop from '../spatial/lifemap/LifeMapTrustLoop'"))
  assert.ok(homeSceneSource.includes("const showLifeMapTrustLoop = sceneMode === 'life-map' && !gateBlocksMode"))
  assert.ok(homeSceneSource.includes('{showLifeMapTrustLoop ? <LifeMapTrustLoop /> : null}'))
})

test('Life Map uses typed deterministic trust-safe demo nodes', () => {
  for (const kind of ['now', 'memory', 'ritual', 'pattern', 'void']) {
    assert.ok(dataSource.includes(`kind: '${kind}'`))
  }

  assert.ok(dataSource.includes('whyThisAppeared'))
  assert.ok(dataSource.includes("confidence: 'light'") || dataSource.includes("confidence: 'emerging'") || dataSource.includes("confidence: 'strong'"))
  assert.ok(dataSource.includes('privateToUser: true'))
  assert.ok(dataSource.includes('canRename: true'))
  assert.ok(dataSource.includes('canHide: true'))
  assert.ok(dataSource.includes('canCorrect: true'))
  assert.ok(dataSource.includes('canUnlink: true'))
})

test('node selection opens details before replay', () => {
  assert.ok(loopSource.includes('setSelectedNodeId(nextNode.id)'))
  assert.ok(loopSource.includes('SelectedMemoryPanel'))
  assert.ok(loopSource.includes('This may connect to...'))
  assert.ok(loopSource.includes('Why this appeared'))
  assert.ok(loopSource.includes('Private to you'))
  assert.ok(loopSource.includes('Open Replay'))
})

test('replay is an explicit action only', () => {
  const starButtonBlock = loopSource.slice(loopSource.indexOf('function StarNode'), loopSource.indexOf('function SelectedMemoryPanel'))
  assert.ok(!starButtonBlock.includes('router.push'))
  assert.ok(loopSource.includes('function openReplay'))
  assert.ok(loopSource.includes('router.push(`/replay?manifestId='))
})

test('correction actions provide visible feedback', () => {
  assert.ok(loopSource.includes('onTrustAction'))
  assert.ok(loopSource.includes('setTrustActionFeedback'))
  assert.ok(loopSource.includes('aria-live="polite"'))
})

test('mobile panel uses bottom-sheet layout', () => {
  assert.ok(loopSource.includes('@media(max-width:760px)'))
  assert.ok(loopSource.includes('.lm-panel{inset:auto 0 0 0'))
})
