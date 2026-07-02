import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const schema = read('src/spatial/memory/memoryStarSchema.ts')
const demoStars = read('src/spatial/demo/demoMemoryStars.ts')
const lifeMapStarRoute = read('src/app/life-map/star/[starId]/page.tsx')
const focusSessionRoute = read('src/app/focus/session/[sessionId]/page.tsx')
const replayDirectRoute = read('src/app/replay/[replayId]/page.tsx')
const lifeMapPage = read('src/app/life-map/page.tsx')
const focusPage = read('src/app/focus/page.tsx')
const replayPage = read('src/app/replay/page.tsx')

test('memory star schema keeps final privacy and route fields', () => {
  for (const snippet of [
    'export type MemoryStarPrivacyState',
    'export type MemoryStarNode',
    'userId: string | null',
    'sourceId: string',
    'privacyState: MemoryStarPrivacyState',
    'focusHref: string',
    'replayHref: string',
    'canEnterPlace: boolean',
    'redactMemoryStarForPublic',
    "sourceId: 'redacted'",
  ]) {
    assert.ok(schema.includes(snippet), `schema missing ${snippet}`)
  }
})

test('demo memory stars remain local launch-safe data', () => {
  assert.ok(demoStars.includes("ownerId: 'launch-demo'"), 'demo stars must remain launch-demo owned')
  assert.ok(demoStars.includes("provider: 'urai-demo'"), 'demo stars must use the demo provider')
  assert.ok(schema.includes('unknown-or-private-memory-star'), 'unknown stars must fail closed')
  assert.ok(schema.includes('locked-memory-star'), 'locked stars must fail closed')
  assert.ok(schema.includes("safeHref: '/life-map'"), 'blocked stars must return to Life Map')
})

test('direct memory routes keep safe redirect shells', () => {
  assert.ok(lifeMapStarRoute.includes('resolveDemoMemoryStar(starId)'), 'star route must resolve demo star id')
  assert.ok(lifeMapStarRoute.includes('redirect(resolution.star.focusHref)'), 'star route must redirect to Focus shell')
  assert.ok(lifeMapStarRoute.includes('urai-memory-star-direct-route'), 'star route must expose unavailable state marker')

  assert.ok(focusSessionRoute.includes('resolveDemoMemoryStar(sessionId)'), 'focus session route must resolve demo star id')
  assert.ok(focusSessionRoute.includes('redirect(resolution.star.focusHref)'), 'focus session route must redirect to Focus shell')
  assert.ok(focusSessionRoute.includes('urai-focus-session-direct-route'), 'focus session route must expose unavailable state marker')

  assert.ok(replayDirectRoute.includes('resolveDemoReplay(replayId)'), 'replay route must resolve replay id')
  assert.ok(replayDirectRoute.includes('redirect(resolution.star.replayHref)'), 'replay route must redirect to Replay shell')
  assert.ok(replayDirectRoute.includes('urai-replay-direct-route'), 'replay route must expose unavailable state marker')
})

test('canonical LifeMap, Focus, and Replay final owners remain present', () => {
  assert.ok(lifeMapPage.includes('RealLifeMapGalaxy'), 'Life Map route must use RealLifeMapGalaxy')
  assert.ok(focusPage.includes('FinalFocusChamber'), 'Focus route must use FinalFocusChamber')
  assert.ok(replayPage.includes('FinalReplayFilm'), 'Replay route must use FinalReplayFilm')
})
