import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  blockedRobotsMetadata,
  blockedRobotsRoute,
  blockedSitemapEntries,
  BLOCKED_INDEXING_STATE,
  CANONICAL_PUBLIC_ORIGIN,
} from '../src/lib/release/discoverability.ts'
import robots, { dynamic as robotsMode } from '../src/app/robots.ts'
import sitemap, { dynamic as sitemapMode } from '../src/app/sitemap.ts'

test('the actual App Router robots route denies every crawler while production proof is pending', () => {
  assert.equal(robotsMode, 'force-static')
  assert.deepEqual(robots(), { rules: { userAgent: '*', disallow: '/' }, host: 'https://urai.app' })
  assert.equal('allow' in robots().rules, false)
})

test('the actual static sitemap publishes no public, private, or internal routes', () => {
  assert.equal(sitemapMode, 'force-static')
  assert.deepEqual(sitemap(), [])
  assert.deepEqual(blockedSitemapEntries(), [])
})

test('the actual metadata denies indexing, following, caching and Google image indexing', () => {
  assert.deepEqual(blockedRobotsMetadata(), {
    index: false, follow: false, nocache: true,
    googleBot: { index: false, follow: false, nocache: true, noimageindex: true },
  })
  assert.equal(BLOCKED_INDEXING_STATE, 'blocked-pending-production-proof')
  assert.equal(CANONICAL_PUBLIC_ORIGIN, 'https://urai.app')
})

test('environment activation or alternate host input cannot authorize discoverability', () => {
  const keys = ['NEXT_PUBLIC_URAI_INDEXING_ENABLED', 'URAI_INDEXING_ENABLED', 'NEXT_PUBLIC_URAI_PUBLIC_ORIGIN']
  const previous = keys.map((key) => process.env[key])
  try {
    process.env[keys[0]] = 'true'
    process.env[keys[1]] = 'true'
    process.env[keys[2]] = 'https://alternate.invalid'
    assert.equal(blockedRobotsMetadata().index, false)
    assert.deepEqual(robots(), blockedRobotsRoute())
    assert.equal(robots().host, 'https://urai.app')
    assert.deepEqual(sitemap(), [])
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]
      else process.env[key] = previous[index]
    })
  }
})

test('a consumer cannot mutate one result to unlock later metadata or crawler calls', () => {
  const metadata = blockedRobotsMetadata()
  metadata.index = true
  metadata.googleBot.index = true
  const route = robots()
  route.rules.disallow = []
  const entries = sitemap()
  entries.push({ url: 'https://urai.app/passport/' })
  assert.equal(blockedRobotsMetadata().index, false)
  assert.equal(blockedRobotsMetadata().googleBot.index, false)
  assert.equal(robots().rules.disallow, '/')
  assert.deepEqual(sitemap(), [])
})

test('the production layout invokes the blocking metadata and retains exact-source fingerprint fields', () => {
  const layout = fs.readFileSync(fileURLToPath(new URL('../src/app/layout.tsx', import.meta.url)), 'utf8')
  assert.match(layout, /robots: blockedRobotsMetadata\(\)/)
  assert.match(layout, /'urai-indexing-state': BLOCKED_INDEXING_STATE/)
  assert.match(layout, /'urai-deployed-sha': deployedSha/)
  assert.match(layout, /'urai-preview-mode': previewMode \? 'true' : 'false'/)
  assert.match(layout, /data-deployed-sha=\{deployedSha\}/)
})
