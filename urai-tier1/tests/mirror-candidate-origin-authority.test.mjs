import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = process.env.URAI_REPAIR_SOURCE_ROOT || fileURLToPath(new URL('../..', import.meta.url))
const baseUrl = 'http://127.0.0.1:4173'
const exactSha = 'a'.repeat(40)
const runnerSource = fs.readFileSync(path.join(root, 'tests/mirror-release-proof-runner.mjs'), 'utf8')
const proofSource = fs.readFileSync(path.join(root, 'tests/mirror-release-proof.mjs'), 'utf8')
const { createCandidateRouteAuthority } = await import(pathToFileURL(path.join(fileURLToPath(new URL('../..', import.meta.url)), 'tests/lib/candidate-route-authority.mjs')))
const authority = createCandidateRouteAuthority(baseUrl)
const prefix = runnerSource.slice(0, runnerSource.indexOf('const original =')).replace(/^import .*$/gm, '')
const { isNarrowReplayScreenshotFailure } = vm.runInNewContext(prefix + '\n({ isNarrowReplayScreenshotFailure })', { URL, createCandidateRouteAuthority, process: { env: { URAI_AUDIT_BASE_URL: baseUrl, URAI_EXACT_HEAD: exactSha } } })
const receipt = (finalUrl, changes = {}) => ({ exactSha, status: 'failed', cases: [{ name: 'transition-to-replay', device: 'desktop', status: 'failed', error: 'page.screenshot: Timeout 60000ms exceeded', finalUrl, consoleErrors: [], failedRequests: [], httpErrors: [], ...changes }] })
const transitionStart = proofSource.indexOf('async function proveTransition(')
const transitionEnd = proofSource.indexOf('async function proveSemanticFallback(', transitionStart)
assert.ok(transitionStart >= 0 && transitionEnd > transitionStart, 'actual transition proof scope is present')
const transitionSource = proofSource.slice(transitionStart, transitionEnd)
const predicate = transitionSource.match(/page\.waitForURL\(\(url\) => (.*?), \{ timeout: 30000 \}\)/)?.[1]
assert.ok(predicate, 'actual transition wait predicate is present')
const originalPathname = (value) => new URL(value).pathname.replace(/\/$/, '') || '/'
const transitionAllows = (value) => vm.runInNewContext(predicate, { url: new URL(value), destination: 'replay', pathname: originalPathname, candidateAuthority: authority })
test('actual Mirror wait predicate rejects cross-origin same-path transition', () => assert.equal(transitionAllows('https://foreign.example/replay'), false))
test('actual Mirror wait predicate rejects candidate port drift', () => assert.equal(transitionAllows('http://127.0.0.1:4174/replay'), false))
test('actual Mirror wait predicate accepts exact candidate with query and trailing slash', () => assert.equal(transitionAllows(`${baseUrl}/replay/?memoryId=quiet-reset`), true))
const bareEntryStart = proofSource.indexOf('async function proveBareEntry(')
const bareEntryEnd = proofSource.indexOf('async function proveOverview(', bareEntryStart)
assert.ok(bareEntryStart >= 0 && bareEntryEnd > bareEntryStart, 'actual bare-entry proof scope is present')
const bareEntrySource = proofSource.slice(bareEntryStart, bareEntryEnd)
const bareEntryPredicate = bareEntrySource.match(/page\.waitForURL\(\(url\) => (.*?), \{ timeout: 30000 \}\)/)?.[1]
assert.ok(bareEntryPredicate, 'actual explicit-demo navigation predicate is present')
const bareEntryAllows = value => vm.runInNewContext(bareEntryPredicate, { url: new URL(value), candidateAuthority: authority })
const demoQuery = '?memoryId=demo%3Amirror-preview&node=mirror-preview&demo=1'
test('actual bare Mirror demo wait accepts exact disclosed context and trailing slash', () => assert.equal(bareEntryAllows(`${baseUrl}/mirror/${demoQuery}`), true))
for (const [label, value] of [
  ['foreign origin', `https://foreign.example/mirror/${demoQuery}`],
  ['candidate port drift', `http://127.0.0.1:4174/mirror/${demoQuery}`],
  ['wrong route', `${baseUrl}/replay/${demoQuery}`],
  ['unselected private memory', `${baseUrl}/mirror?memoryId=private-memory&node=mirror-preview&demo=1`],
  ['wrong node', `${baseUrl}/mirror?memoryId=demo%3Amirror-preview&node=other&demo=1`],
  ['missing disclosure', `${baseUrl}/mirror?memoryId=demo%3Amirror-preview&node=mirror-preview`],
]) {
  test(`actual bare Mirror demo wait rejects ${label}`, () => assert.equal(bareEntryAllows(value), false))
}

for (const value of ['https://foreign.example/replay', 'http://127.0.0.1:4174/replay', 'https://127.0.0.1:4173/replay', `${baseUrl}/focus`, 'not a URL', undefined, 'javascript:replay', 'http://user:password@127.0.0.1:4173/replay']) {
  test(`actual reconciliation qualification rejects ${value === undefined ? 'missing URL' : new String(value).replace(/user:password/g, 'credentials')}`, () => assert.equal(isNarrowReplayScreenshotFailure(receipt(value)), false))
}
test('actual reconciliation accepts only exact Replay candidate with unchanged narrow timeout conditions', () => assert.equal(isNarrowReplayScreenshotFailure(receipt(`${baseUrl}/replay/?memoryId=quiet-reset`)), true))
for (const changes of [{ name: 'other' }, { device: 'mobile' }, { error: 'resource failed' }, { consoleErrors: ['error'] }, { failedRequests: ['failure'] }, { httpErrors: ['404'] }]) {
  test(`actual narrow reconciliation retains ${Object.keys(changes)[0]} rejection`, () => assert.equal(isNarrowReplayScreenshotFailure(receipt(`${baseUrl}/replay`, changes)), false))
}
test('actual capture scripts fence initial navigation and both sides of retained screenshots', () => {
  assert.ok((proofSource.match(/candidateAuthority\.assertExactRoute/g) || []).length >= 10)
  assert.ok((runnerSource.match(/candidateAuthority\.assertExactRoute/g) || []).length >= 3)
  assert.match(proofSource, /assertCleanEvidence\(consoleErrors, failedRequests, httpErrors\)/)
  assert.match(runnerSource, /if \(consoleErrors\.length\)/)
  assert.match(runnerSource, /timeout: 120000/)
})
test('candidate authority rejects invalid or credential-bearing configured origins', () => {
  for (const value of ['not a URL', 'file:///replay', 'http://user:password@localhost']) assert.throws(() => createCandidateRouteAuthority(value))
})
