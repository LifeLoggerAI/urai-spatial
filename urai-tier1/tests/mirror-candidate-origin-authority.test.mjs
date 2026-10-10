import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = process.env.URAI_REPAIR_SOURCE_ROOT || fileURLToPath(new URL('../..', import.meta.url))
const baseUrl = 'http://127.0.0.1:4173'
const exactSha = 'a'.repeat(40)
const runnerSource = fs.readFileSync(path.join(root, 'tests/mirror-release-proof-runner.mjs'), 'utf8')
const proofSource = fs.readFileSync(path.join(root, 'tests/mirror-release-proof.mjs'), 'utf8')
const { createCandidateRouteAuthority } = await import(pathToFileURL(path.join(fileURLToPath(new URL('../..', import.meta.url)), 'tests/lib/candidate-route-authority.mjs')))
const authority = createCandidateRouteAuthority(baseUrl)
async function runActualProofRunner({ code = 0, signal = null, error = null } = {}) {
  const calls = []
  const messages = []
  const processFixture = { execPath: '/fixture/node', env: { URAI_AUDIT_BASE_URL: baseUrl, URAI_EXACT_HEAD: exactSha }, exitCode: undefined }
  const spawn = (...args) => {
    calls.push(args)
    const child = new EventEmitter()
    queueMicrotask(() => error ? child.emit('error', error) : child.emit('exit', code, signal))
    return child
  }
  const source = runnerSource.replace(/^import .*$/gm, '')
  await vm.runInNewContext(`(async () => {${source}\n})()`, { spawn, process: processFixture, console: { log: message => messages.push(message), error: message => messages.push(message) } })
  assert.equal(calls.length, 1, 'a failed transition must never spawn a substitute direct-entry proof')
  assert.equal(calls[0][0], processFixture.execPath)
  assert.deepEqual(Array.from(calls[0][1]), ['tests/mirror-release-proof.mjs'])
  assert.equal(calls[0][2].env, processFixture.env)
  assert.equal(calls[0][2].stdio, 'inherit')
  return { exitCode: processFixture.exitCode, messages }
}
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

test('actual proof runner admits only successful original transition proof', async () => {
  const result = await runActualProofRunner()
  assert.equal(result.exitCode, undefined)
  assert.deepEqual(result.messages, ['MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL'])
})
for (const [label, outcome, expectedCode] of [
  ['screenshot or transition failure', {code:1}, 1],
  ['specific original nonzero exit', {code:7}, 7],
  ['signal despite zero exit', {code:0,signal:'SIGTERM'}, 1],
  ['missing exit code', {code:null}, 1],
]) {
  test(`actual proof runner refuses reconciliation for ${label}`, async () => {
    const result = await runActualProofRunner(outcome)
    assert.equal(result.exitCode, expectedCode)
    assert.equal(result.messages.length, 1)
    assert.match(result.messages[0], /failed without reconciliation/)
    assert.doesNotMatch(result.messages[0], /PASSED/)
  })
}
test('actual proof runner propagates child creation errors without accepting a substitute', async () => {
  await assert.rejects(runActualProofRunner({error:new Error('fixture child spawn failed')}), /fixture child spawn failed/)
})
test('actual capture scripts fence initial navigation and both sides of retained screenshots', () => {
  assert.ok((proofSource.match(/candidateAuthority\.assertExactRoute/g) || []).length >= 10)
  assert.match(proofSource, /assertCleanEvidence\(consoleErrors, failedRequests, httpErrors\)/)
  assert.doesNotMatch(runnerSource, /isNarrowReplayScreenshotFailure|page\.goto|page\.screenshot/)
})
test('candidate authority rejects invalid or credential-bearing configured origins', () => {
  for (const value of ['not a URL', 'file:///replay', 'http://user:password@localhost']) assert.throws(() => createCandidateRouteAuthority(value))
})
