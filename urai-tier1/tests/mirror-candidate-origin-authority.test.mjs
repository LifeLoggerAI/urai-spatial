import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = process.env.URAI_REPAIR_SOURCE_ROOT || fileURLToPath(new URL('../..', import.meta.url))
const baseUrl = 'http://127.0.0.1:4173'
const runnerSource = fs.readFileSync(path.join(root, 'tests/mirror-release-proof-runner.mjs'), 'utf8')
const proofSource = fs.readFileSync(path.join(root, 'tests/mirror-release-proof.mjs'), 'utf8')
const { createCandidateRouteAuthority } = await import(pathToFileURL(path.join(fileURLToPath(new URL('../..', import.meta.url)), 'tests/lib/candidate-route-authority.mjs')))
const authority = createCandidateRouteAuthority(baseUrl)
// Run the actual parent driver and its real Node subprocess with a bounded
// synthetic proof. This checks status propagation, not Mirror visual acceptance.
function runProofDriver(proof, source = runnerSource) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-mirror-driver-'))
  try {
    fs.mkdirSync(path.join(directory, 'tests'))
    if (proof !== null) fs.writeFileSync(path.join(directory, 'tests/mirror-release-proof.mjs'), proof)
    const runner = path.join(directory, 'runner.mjs')
    fs.writeFileSync(runner, source)
    return spawnSync(process.execPath, [runner], { cwd: directory, encoding: 'utf8', timeout: 10000 })
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
}
function requireFailedOriginal(result, expectedCode) {
  assert.equal(result.error, undefined, 'the bounded driver subprocess must complete')
  assert.equal(result.status, expectedCode, 'original proof failure must propagate without reconciliation')
  assert.doesNotMatch(result.stdout, /MIRROR_RELEASE_PROOF_RUNNER_PASSED/)
  assert.match(result.stderr, /Mirror release proof failed without reconciliation/)
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

for (const value of ['https://foreign.example/replay', 'http://127.0.0.1:4174/replay', 'https://127.0.0.1:4173/replay', `${baseUrl}/focus`, 'not a URL', undefined, 'javascript:replay', 'http://user:password@127.0.0.1:4173/replay']) {
  test(`actual candidate route authority rejects ${value === undefined ? 'missing URL' : new String(value).replace(/user:password/g, 'credentials')}`, () => assert.equal(authority.isExactRoute(value, '/replay'), false))
}
test('actual candidate route authority accepts exact Replay origin with query and trailing slash', () => assert.equal(authority.isExactRoute(`${baseUrl}/replay/?memoryId=quiet-reset`, '/replay'), true))

async function executeRunner(result) {
  const process = { execPath: '/node', env: { URAI_AUDIT_BASE_URL: baseUrl, URAI_EXACT_HEAD: 'a'.repeat(40) }, exitCode: 0 }
  const spawned = [], messages = [], errors = []
  const execution = vm.runInNewContext(`(async () => {${runnerSource.replace(/^import .*$/gm, '')}\n})()`, {
    process,
    console: { log: message => messages.push(message), error: message => errors.push(message) },
    spawn: (command, args, options) => {
      spawned.push({ command, args: [...args], options })
      return { once(event, callback) {
        if (result.error && event === 'error') queueMicrotask(() => callback(result.error))
        if (!result.error && event === 'exit') queueMicrotask(() => callback(result.code, result.signal))
      } }
    },
  })
  if (result.error) await assert.rejects(execution, error => error === result.error)
  else await execution
  assert.equal(spawned.length, 1, 'a failed transition cannot be replaced by another capture')
  assert.equal(spawned[0].command, process.execPath)
  assert.deepEqual(spawned[0].args, ['tests/mirror-release-proof.mjs'])
  assert.equal(spawned[0].options.env, process.env, 'the original proof keeps the exact candidate environment')
  assert.equal(spawned[0].options.stdio, 'inherit')
  return { process, messages, errors }
}

for (const result of [
  { code: 0, signal: null },
  { code: 1, signal: null },
  { code: 7, signal: null },
  { code: null, signal: 'SIGTERM' },
  { code: 0, signal: 'SIGTERM' },
  { code: null, signal: null },
]) {
  test(`actual runner preserves original proof result ${result.code} / ${result.signal ?? 'no signal'}`, async () => {
    const { process, messages, errors } = await executeRunner(result)
    if (result.code === 0 && !result.signal) {
      assert.equal(process.exitCode, 0)
      assert.deepEqual(messages, ['MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL'])
      assert.deepEqual(errors, [])
    } else {
      assert.equal(process.exitCode, typeof result.code === 'number' && result.code !== 0 ? result.code : 1)
      assert.deepEqual(messages, [], 'failure must never emit a pass marker')
      assert.equal(errors.length, 1)
      assert.ok(errors[0].includes(`code=${result.code} signal=${result.signal || 'none'}`))
      assert.match(errors[0], /failed without reconciliation/)
    }
  })
}

test('actual runner propagates child spawn failure without a replacement capture', async () => {
  const { messages, errors } = await executeRunner({ error: new Error('synthetic child spawn failure') })
  assert.deepEqual(messages, [])
  assert.deepEqual(errors, [])
})

test('actual Mirror driver accepts only an original proof subprocess success', () => {
  const result = runProofDriver('process.exit(0)')
  assert.equal(result.error, undefined)
  assert.equal(result.status, 0)
  assert.match(result.stdout, /MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL/)
  assert.doesNotMatch(result.stderr, /failed without reconciliation/)
})
for (const code of [1, 7]) test(`actual Mirror driver preserves original proof exit ${code}`, () => requireFailedOriginal(runProofDriver(`process.exit(${code})`), code))
test('actual Mirror driver keeps a screenshot-timeout proof failed', () => requireFailedOriginal(runProofDriver("console.error('page.screenshot: Timeout 60000ms exceeded'); process.exit(1)"), 1))
test('actual Mirror driver rejects a signal-terminated original proof', () => requireFailedOriginal(runProofDriver("process.kill(process.pid, 'SIGTERM')"), 1))
test('actual Mirror driver rejects a missing original proof entry point', () => requireFailedOriginal(runProofDriver(null), 1))
test('driver contract rejects reintroducing a failed-proof reconciliation pass', () => {
  const assignment = /process\.exitCode = typeof original\.code === 'number' && original\.code !== 0 \? original\.code : 1/
  assert.match(runnerSource, assignment)
  const reconciled = runnerSource.replace(assignment, 'process.exitCode = 0')
  const result = runProofDriver("console.error('page.screenshot: Timeout 60000ms exceeded'); process.exit(7)", reconciled)
  assert.throws(() => requireFailedOriginal(result, 7), /original proof failure must propagate/)
})
test('actual original capture fences navigation and both sides of retained screenshots', () => {
  assert.ok((proofSource.match(/candidateAuthority\.assertExactRoute/g) || []).length >= 10)
  assert.match(proofSource, /assertCleanEvidence\(consoleErrors, failedRequests, httpErrors\)/)
  assert.doesNotMatch(runnerSource, /isNarrowReplayScreenshotFailure|chromium|page\.goto/)
})

test('candidate authority rejects invalid or credential-bearing configured origins', () => {
  for (const value of ['not a URL', 'file:///replay', 'http://user:password@localhost']) assert.throws(() => createCandidateRouteAuthority(value))
})
