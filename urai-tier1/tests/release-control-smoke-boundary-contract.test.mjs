import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), '..', 'scripts', 'urai-release-control-smoke.mjs'), 'utf8')

test('release-control smoke requires canonical origin and exact deployed SHA', () => {
  assert.match(source, /canonicalOrigin !== 'https:\/\/urai\.app'/)
  assert.match(source, /URAI_EXPECTED_DEPLOYED_SHA must be a full lowercase 40-character SHA/)
  assert.match(source, /assertCanonicalFinalUrl/)
  assert.match(source, /final\.origin !== canonicalOrigin/)
  assert.match(source, /final\.search !== requested\.search/)
})

test('query routes require valid responses and exact structured identity', () => {
  assert.match(source, /redirecting && !response\.location/)
  assert.match(source, /!redirecting && response\.status !== 200/)
  assert.match(source, /observedUrl\.searchParams\.get\(key\) !== expected/)
  assert.match(source, /Query route escaped canonical identity/)
  assert.match(source, /verifyHydratedIdentity/)
})

test('browser evidence uses clean options, blocks service workers, and rejects cross-origin requests', () => {
  assert.match(source, /const \{ name: profileName, \.\.\.contextOptions \} = profile/)
  assert.match(source, /serviceWorkers: 'block'/)
  assert.match(source, /page\.on\('request'/)
  assert.match(source, /requested\.origin !== canonicalOrigin/)
  assert.match(source, /Cross-origin browser requests/)
})

test('browser console and page errors fail the retained evidence receipt', () => {
  assert.match(source, /page\.on\('pageerror'/)
  assert.match(source, /message\.type\(\) === 'error'/)
  assert.match(source, /smoke-report\.json/)
  assert.match(source, /urai-release-control-smoke-4/)
})
