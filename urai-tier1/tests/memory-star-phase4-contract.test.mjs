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

test('memory star schema keeps Phase 4 required fields', () => {
  for (const snippet of [
    'export type MemoryStarPrivacyState',
    'export type MemoryStarSourceType',
    'export type MemoryStarEmotionalSignature',
    'export type MemoryStarFieldPrimitive',
    'export type MemoryStarNode',
    'id: string',
    'userId: string | null',
    'sourceType: MemoryStarSourceType',
    'sourceId: string',
    'provenanceSummary: string',
    'emotionalSignature: MemoryStarEmotionalSignature',
    'privacyState: MemoryStarPrivacyState',
    'createdAt: string',
    'updatedAt: string',
    'replayId: string',
    'focusHref: string',
    'replayHref: string',
  ]) {
    assert.ok(schema.includes(snippet), `schema missing ${snippet}`)
  }
})

test('demo memory stars stay launch-safe and schema fails closed', () => {
  assert.match(demoStars, /ownerId: 'launch-demo'/)
  assert.match(demoStars, /provider: 'urai-demo'/)
  assert.match(schema, /userId: null/)
  assert.match(schema, /sourceType: 'demo'/)
  assert.match(schema, /unknown-or-private-memory-star/)
  assert.match(schema, /deleted-memory-star/)
  assert.match(schema, /locked-memory-star/)
  assert.match(schema, /non-renderable-memory-star/)
  assert.match(schema, /safeHref: '\/life-map'/)
  assert.match(schema, /redactMemoryStarForPublic/)
  assert.match(schema, /sourceId: 'redacted'/)
  assert.doesNotMatch(schema, /getFirestore|collection\(|doc\(|onSnapshot|getDoc|setDoc/)
})

test('direct routes resolve demo-safe ids into canonical route shells', () => {
  assert.match(lifeMapStarRoute, /resolveDemoMemoryStar\(starId\)/)
  assert.match(lifeMapStarRoute, /redirect\(resolution\.star\.focusHref\)/)
  assert.match(lifeMapStarRoute, /data-testid="urai-memory-star-direct-route"/)

  assert.match(focusSessionRoute, /resolveDemoMemoryStar\(sessionId\)/)
  assert.match(focusSessionRoute, /redirect\(resolution\.star\.focusHref\)/)
  assert.match(focusSessionRoute, /data-testid="urai-focus-session-direct-route"/)

  assert.match(replayDirectRoute, /resolveDemoReplay\(replayId\)/)
  assert.match(replayDirectRoute, /redirect\(resolution\.star\.replayHref\)/)
  assert.match(replayDirectRoute, /data-testid="urai-replay-direct-route"/)
})

test('canonical LifeMap, Focus, and Replay final owners remain present', () => {
  assert.match(lifeMapPage, /RealLifeMapGalaxy/)
  assert.match(focusPage, /FinalFocusChamber/)
  assert.match(replayPage, /FinalReplayFilm/)
})
