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

test('query routes require valid responses and the exact requested key-value set', () => {
  assert.match(source, /redirecting && !response\.location/)
  assert.match(source, /!redirecting && response\.status !== 200/)
  assert.match(source, /function assertExactQueryIdentity/)
  assert.match(source, /JSON\.stringify\(observedEntries\) !== JSON\.stringify\(requestedEntries\)/)
  assert.match(source, /observedUrl\.searchParams\.get\(key\) !== expected/)
  assert.match(source, /Query route escaped canonical identity/)
  assert.match(source, /verifyHydratedIdentity/)
})

test('browser evidence blocks service workers and aborts cross-origin requests before send', () => {
  assert.match(source, /const \{ name: profileName, \.\.\.contextOptions \} = profile/)
  assert.match(source, /serviceWorkers: 'block'/)
  assert.match(source, /context\.route\('\*\*\/\*'/)
  assert.match(source, /requested\.origin !== canonicalOrigin/)
  assert.match(source, /route\.abort\('blockedbyclient'\)/)
  assert.match(source, /blockedExternalRequests/)
  assert.match(source, /Blocked cross-origin browser requests/)
})

test('retained evidence filenames are portable across artifact filesystems', () => {
  assert.match(source, /function safeEvidenceFilename/)
  assert.match(source, /replace\(\/\[\^a-zA-Z0-9\._-\]\+\/g, '-'\)/)
  assert.match(source, /safeEvidenceFilename\(profileName\)/)
  assert.match(source, /safeEvidenceFilename\(route\)/)
  assert.doesNotMatch(source, /route\.replace\(\/\[\/\?=&\]\+\/g/)
})

test('critical direct and compatibility routes stay in the browser proof surface', () => {
  for (const route of ['/terms', '/login', '/account-deletion', '/privacy-policy']) {
    assert.ok(source.includes(`'${route}'`), `missing direct critical route ${route}`)
  }
  for (const transition of [
    "['/waitlist', { pathname: '/status', searchEntries: [['from', 'waitlist']] }]",
    "['/system', { pathname: '/status', searchEntries: [['from', 'system']] }]",
    "['/settings/privacy', { pathname: '/privacy-controls', searchEntries: [['from', 'settings-privacy']] }]",
    "['/onboarding', { pathname: '/', searchEntries: [['onboarding', '1']] }]",
    "['/signup', { pathname: '/login', searchEntries: [['intent', 'signup']] }]",
  ]) {
    assert.ok(source.includes(transition), `missing compatibility transition ${transition}`)
  }
})

test('browser console, page, and blocked-network evidence fail the retained receipt', () => {
  assert.match(source, /page\.on\('pageerror'/)
  assert.match(source, /message\.type\(\) === 'error'/)
  assert.match(source, /smoke-report\.json/)
  assert.match(source, /urai-release-control-smoke-8/)
  assert.match(source, /if \(failures\.length\) throw new Error/)
})
