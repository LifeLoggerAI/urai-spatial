import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { getURLFromRedirectError } from 'next/dist/client/components/redirect.js'
import SpatialMemoryPage, { generateStaticParams as generateSpatialMemoryParams } from '../src/app/spatial/memory/[nodeId]/page.tsx'
import MemoryStarRoute, { generateStaticParams as generateStarParams } from '../src/app/life-map/star/[starId]/page.tsx'
import FocusSessionRoute, { generateStaticParams as generateSessionParams } from '../src/app/focus/session/[sessionId]/page.tsx'
import ReplayDirectRoute, { generateStaticParams as generateReplayParams } from '../src/app/replay/[replayId]/page.tsx'
import { DEMO_MEMORY_STAR_NODES, DEMO_MEMORY_STAR_NODE_BY_ID, resolveDemoMemoryStar } from '../src/spatial/memory/memoryStarSchema.ts'
import { buildNamedExplicitDemoMemory } from '../src/spatial/memory/explicitDemoMemory.ts'
import { isExplicitDemoRequest, parseSelectedMemory, sanitizeMemoryId } from '../src/spatial/memory/selectedMemoryContract.ts'

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
const lifeMapCanonical = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const lifeMapBoundary = read('src/components/lifemap/LifeMapRouteBoundary.tsx')
const focusPage = read('src/app/focus/page.tsx')
const focusClient = read('src/app/focus/FocusChamberClient.tsx')
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
  ]) assert.ok(schema.includes(snippet), `schema missing ${snippet}`)
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
  assert.ok(lifeMapPage.includes('SpatialLifeMapCanonical'), 'Life Map route must use SpatialLifeMapCanonical')
  assert.ok(lifeMapCanonical.includes('LifeMapRouteBoundary'), 'Life Map canonical owner must keep its route boundary')
  assert.ok(lifeMapBoundary.includes('ComposedLifeMapScene'), 'Life Map route boundary must use ComposedLifeMapScene')
  assert.ok(focusPage.includes('FinalFocusChamber'), 'Focus route must use FinalFocusChamber')
  assert.ok(replayPage.includes('FinalReplayFilm'), 'Replay route must use FinalReplayFilm')
})


test('Focus photosphere rejects planetary low-frequency terrain and exposes the memory imprint', () => {
  assert.ok(focusClient.includes('Low-frequency continents/terrain are suppressed so Focus cannot read as a planet.'))
  assert.ok(focusClient.includes('noise(p * 93.0'))
  assert.ok(focusClient.includes('noise(p * 151.0'))
  assert.ok(!focusClient.includes('noise(p * 7.0'))
  assert.ok(focusClient.includes('intensity={1.75}'))
  assert.ok(focusClient.includes('vec3 revealedMemory = mix(warmMemory, image * (.92 + localContrast * .20), .72);'))
  assert.ok(focusClient.includes('vec3 stellarizedMemory = mix(revealedMemory, vec3(1.0, .62, .12)'))
  assert.ok(focusClient.includes('float alpha = veil * (.36 + luminance * .22 + core * .20);'))
  assert.ok(focusClient.includes('<circleGeometry args={[0.68, 96]} />'))
  assert.ok(focusClient.includes("canon: 'memory-reveal-within-photosphere'"))
  assert.ok(focusClient.includes('surfaceWrap: false'))
  assert.ok(!focusClient.includes('<circleGeometry args={[1.0, 96]} />'))
  assert.ok(!focusClient.includes('<planeGeometry args={[2.08, 2.08]} />'))
})

async function renderSpatialMemory(nodeId) {
  return renderToStaticMarkup(await SpatialMemoryPage({ params: Promise.resolve({ nodeId }) }))
}

test('every generated spatial memory path renders its exact disclosed registry identity', async () => {
  const params = generateSpatialMemoryParams()
  const demoStars = DEMO_MEMORY_STAR_NODES.filter((star) => star.privacyState === 'demo')
  assert.equal(params.length, 7, 'verify the complete current exported demo set')
  assert.deepEqual(params.map(({ nodeId }) => nodeId), demoStars.map(({ id }) => id))
  assert.equal(new Set(params.map(({ nodeId }) => nodeId)).size, params.length)

  for (const { nodeId } of params) {
    const star = DEMO_MEMORY_STAR_NODE_BY_ID[nodeId]
    const markup = await renderSpatialMemory(nodeId)
    assert.ok(markup.includes(`data-memory-id="${nodeId}"`), `requested identity missing: ${nodeId}`)
    assert.equal(markup.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1], star.title, `wrong title for ${nodeId}`)
    assert.ok(markup.includes(star.description), `wrong description for ${nodeId}`)
    assert.ok(markup.includes(star.sourceId), `wrong provenance identity for ${nodeId}`)
    assert.ok(markup.includes('data-demo-disclosure="true"'))
    assert.ok(markup.includes('No private user data is used.'))
    const hrefs = [...markup.matchAll(/href="([^"]+)"/g)].map(([, href]) => new URL(href.replaceAll('&amp;', '&'), 'https://urai.app'))
    const returnUrl = hrefs.find(({ pathname }) => pathname === '/life-map')
    assert.ok(returnUrl, 'a working return link must be available')
    assert.equal(returnUrl.searchParams.get('node'), nodeId)
    assert.equal(returnUrl.searchParams.get('demo'), '1')
    assert.equal(hrefs.find(({ pathname }) => pathname === '/focus')?.href, new URL(star.focusHref, 'https://urai.app').href)
    assert.equal(hrefs.find(({ pathname }) => pathname === '/replay')?.href, new URL(star.replayHref, 'https://urai.app').href)
  }
})

test('unknown and legacy spatial memory IDs remain unavailable without substituting a sample', async () => {
  for (const nodeId of ['unknown-memory', 'private-memory', 'demo-node-focus', '', '__proto__', 'constructor']) {
    const markup = await renderSpatialMemory(nodeId)
    assert.ok(markup.includes('Memory unavailable'), `unavailable state missing for ${nodeId}`)
    assert.ok(markup.includes('data-status="404"'))
    assert.ok(!markup.includes('data-memory-id='), `an unresolved identity was replaced for ${nodeId}`)
    for (const star of DEMO_MEMORY_STAR_NODES) assert.ok(!markup.includes(star.title), `sample leaked into ${nodeId}`)
  }
})

test('a non-demo spatial memory record is neither exported nor disclosed', async () => {
  const star = DEMO_MEMORY_STAR_NODES[0]
  const originalPrivacy = star.privacyState
  try {
    for (const privacyState of ['private', 'public', 'locked', 'vaulted', 'deleted', 'archived']) {
      star.privacyState = privacyState
      assert.ok(!generateSpatialMemoryParams().some(({ nodeId }) => nodeId === star.id), `${privacyState} record was exported`)
      assert.equal(resolveDemoMemoryStar(star.id).ok, false, `${privacyState} record was accepted by a demo alias`)
      const markup = await renderSpatialMemory(star.id)
      assert.ok(markup.includes('Memory unavailable'))
      assert.ok(!markup.includes(star.title), `${privacyState} title was disclosed`)
      assert.ok(!markup.includes(star.description), `${privacyState} description was disclosed`)
      assert.ok(!markup.includes(star.sourceId), `${privacyState} provenance was disclosed`)
    }
  } finally {
    star.privacyState = originalPrivacy
  }
})

test('all generated demo aliases roundtrip through real redirects and fixture/parser identity', async () => {
  const ids = DEMO_MEMORY_STAR_NODES.map(({ id }) => id)
  assert.deepEqual(generateStarParams().map(({ starId }) => starId), ids)
  assert.deepEqual(generateSessionParams().map(({ sessionId }) => sessionId), ids)
  assert.deepEqual(generateReplayParams().map(({ replayId }) => replayId), ids)

  const aliases = [
    [MemoryStarRoute, 'starId', '/focus'],
    [FocusSessionRoute, 'sessionId', '/focus'],
    [ReplayDirectRoute, 'replayId', '/replay'],
  ]
  for (const star of DEMO_MEMORY_STAR_NODES) {
    for (const [route, parameter, destination] of aliases) {
      let redirectHref = null
      await assert.rejects(route({ params: Promise.resolve({ [parameter]: star.id }) }), (error) => {
        redirectHref = getURLFromRedirectError(error)
        return redirectHref !== null
      })
      const url = new URL(redirectHref, 'https://urai.app')
      assert.equal(url.pathname, destination)
      assert.equal(isExplicitDemoRequest(url.searchParams), true)
      assert.equal(url.searchParams.get('node'), star.id)
      const memoryId = sanitizeMemoryId(url.searchParams.get('memoryId'))
      assert.equal(memoryId, `demo:${star.id}`)
      const fixture = buildNamedExplicitDemoMemory(memoryId)
      assert.equal(fixture.id, memoryId)
      assert.equal(fixture.star.id, star.id)
      assert.equal(fixture.title, star.title)
      assert.ok(fixture.summary.includes(star.description))
      assert.ok(fixture.summary.includes(star.provenanceSummary))
      assert.equal(fixture.occurredAt, star.createdAt)
      assert.deepEqual(fixture.people, [])
      assert.equal(fixture.place, undefined)
      assert.deepEqual(fixture.sourceMedia, [])
      assert.equal(fixture.demo, true)
      assert.equal(fixture.replayManifest.id, url.searchParams.get('manifestId'))
      assert.equal(fixture.replayManifest.id, star.id)
      const parsed = parseSelectedMemory(fixture, fixture.ownerId, fixture.id)
      assert.equal(parsed.status, 'ready', 'fixture must satisfy the production memory schema')
      assert.equal(parsed.memory.title, star.title)
      assert.equal(parsed.memory.id, memoryId)
      assert.equal(parsed.memory.star.id, star.id)
      assert.equal(parsed.memory.replayManifest.id, star.id)
      assert.deepEqual(parsed.memory.people, [])
    }
  }
})

test('existing quiet-reset and generic explicit fixtures retain their disclosed identity', () => {
  const quiet = buildNamedExplicitDemoMemory('demo:quiet-reset')
  assert.equal(quiet.id, 'demo:quiet-reset')
  assert.equal(quiet.title, 'The Quiet Reset')
  assert.equal(quiet.star.id, 'quiet-reset')
  assert.equal(quiet.replayManifest.id, 'replay-recovery-thread')
  assert.equal(quiet.replayManifest.durationMs, 12_000)
  assert.equal(quiet.demo, true)
  const routeAlias = buildNamedExplicitDemoMemory('quiet-reset')
  assert.equal(routeAlias.occurredAt, '2026-05-09T12:00:00.000Z')
  const generic = buildNamedExplicitDemoMemory('demo:existing-generic-fixture')
  assert.equal(generic.id, 'demo:existing-generic-fixture')
  assert.equal(generic.title, 'Demonstration Memory')
  assert.equal(generic.replayManifest.id, 'demo-manifest')
  assert.equal(generic.demo, true)
})
