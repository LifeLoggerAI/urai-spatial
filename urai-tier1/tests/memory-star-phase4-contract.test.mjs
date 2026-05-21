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

test('memory star schema includes Phase 4 privacy-safe required fields', () => {
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

test('demo memory stars remain separated from private user data', () => {
  assert.match(demoStars, /ownerId: 'launch-demo'/)
  assert.match(demoStars, /provider: 'urai-demo'/)
  assert.match(demoStars, /Local preview manifest generated without private user data/)
  assert.match(schema, /userId: null/)
  assert.match(schema, /sourceType: 'demo'/)
  assert.match(schema, /Demo-only memory star generated from bundled launch-safe sample data/)
  assert.doesNotMatch(schema, /getFirestore|collection\(|doc\(|onSnapshot|getDoc|setDoc/)
})

test('memory star privacy resolver fails closed for unknown, locked, vaulted, and deleted stars', () => {
  assert.match(schema, /unknown-or-private-memory-star/)
  assert.match(schema, /deleted-memory-star/)
  assert.match(schema, /locked-memory-star/)
  assert.match(schema, /non-renderable-memory-star/)
  assert.match(schema, /safeHref: '\/life-map'/)
  assert.match(schema, /privacyState === 'deleted'/)
  assert.match(schema, /privacyState === 'locked' \|\| star\.privacyState === 'vaulted'/)
})

test('public redaction removes private provenance and source data', () => {
  assert.match(schema, /redactMemoryStarForPublic/)
  assert.match(schema, /sourceId: 'redacted'/)
  assert.match(schema, /Private provenance redacted for public\/fallback rendering/)
  assert.match(schema, /Private memory details are hidden until authenticated access and consent are verified/)
})

test('direct routes resolve only demo-safe ids and redirect into canonical shells', () => {
  assert.match(lifeMapStarRoute, /resolveDemoMemoryStar\(starId\)/)
  assert.match(lifeMapStarRoute, /redirect\(resolution\.star\.focusHref\)/)
  assert.match(lifeMapStarRoute, /data-testid="urai-memory-star-direct-route"/)
  assert.match(lifeMapStarRoute, /unknown|private|locked|deleted|launch-safe demo set/i)

  assert.match(focusSessionRoute, /resolveDemoMemoryStar\(sessionId\)/)
  assert.match(focusSessionRoute, /redirect\(resolution\.star\.focusHref\)/)
  assert.match(focusSessionRoute, /data-testid="urai-focus-session-direct-route"/)

  assert.match(replayDirectRoute, /resolveDemoReplay\(replayId\)/)
  assert.match(replayDirectRoute, /redirect\(resolution\.star\.replayHref\)/)
  assert.match(replayDirectRoute, /data-testid="urai-replay-direct-route"/)
})

test('canonical LifeMap, Focus, and Replay shells remain present', () => {
  assert.match(lifeMapPage.replace(/\s+/g, ''), /<TierOneExperiencemode="life-map"\/>/)
  assert.match(focusPage.replace(/\s+/g, ''), /<TierOneExperiencemode="focus"\/>/)
  assert.match(replayPage.replace(/\s+/g, ''), /<TierOneExperiencemode="replay"\/>/)
})
