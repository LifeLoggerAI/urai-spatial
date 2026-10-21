import assert from 'node:assert/strict'
import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'

const source = readFileSync(new URL('../scripts/run-optional-e2e.mjs', import.meta.url), 'utf8')

test('optional E2E uses pinned workspace runner and no ambient pnpm shell', () => {
  assert.match(source, /run\(process\.execPath, \['scripts\/run-pnpm\.mjs', 'playwright:check'\]/)
  assert.match(source, /run\(process\.execPath, \['tests\/spatial-tier-lock-hardening\.mjs', '--suite=all'\]/)
  assert.match(source, /shell: false/)
  assert.match(source, /'--suite=all'/)
  assert.doesNotMatch(source, /\['tests\/spatial-lock\.mjs'\]/)
  assert.doesNotMatch(source, /run\('pnpm'/)
})

function fixture(probeExit, e2eExit) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-optional-e2e-'))
  try {
    mkdirSync(path.join(dir, 'scripts'))
    mkdirSync(path.join(dir, 'tests'))
    writeFileSync(path.join(dir, 'scripts/run-optional-e2e.mjs'), source)
    writeFileSync(path.join(dir, 'scripts/run-pnpm.mjs'), `if(process.argv[2]!=='playwright:check')process.exit(22);process.exit(${probeExit})`)
    writeFileSync(path.join(dir, 'tests/spatial-tier-lock-hardening.mjs'), `if(process.argv[2]!=='--suite=all')process.exit(44);process.stdout.write('REAL_BROWSER_E2E_EXECUTED\\n');process.exit(${e2eExit})`)
    const result = spawnSync(process.execPath, [path.join(dir, 'scripts/run-optional-e2e.mjs')], {
      cwd: dir, env: { ...process.env, CI: '1' }, encoding: 'utf8', timeout: 20000, shell: false,
    })
    assert.ifError(result.error)
    return result
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('passing Playwright probe executes existing browser E2E', () => {
  const r=fixture(0,0)
  assert.equal(r.status,0,r.stdout+r.stderr)
  assert.match(r.stdout,/REAL_BROWSER_E2E_EXECUTED/)
})
test('failed Playwright probe remains a CI failure', () => {
  const r=fixture(8,0)
  assert.notEqual(r.status,0)
  assert.match(r.stderr,/Real Playwright browser acceptance is required/)
  assert.doesNotMatch(r.stdout,/REAL_BROWSER_E2E_EXECUTED/)
})
test('genuine browser E2E failure remains failing', () => {
  const r=fixture(0,7)
  assert.equal(r.status,7,r.stdout+r.stderr)
  assert.match(r.stdout,/REAL_BROWSER_E2E_EXECUTED/)
})

test('root runner cannot silently fall back to a static route lock', () => {
  assert.doesNotMatch(source, /run\(process\.execPath, \['tests\/spatial-lock\.mjs'\]/)
  assert.match(source, /Real Playwright browser acceptance is required/)
  assert.match(source, /EXPLICIT LOCAL E2E SKIP: browser acceptance NOT VERIFIED/)
})

const replaySource = readFileSync(new URL('./replay-tier5-lock.mjs', import.meta.url), 'utf8')

test('root Replay E2E refuses HTTP 404 and foreign HTML as UrAi readiness', () => {
  assert.match(replaySource, /import \{ allocateEphemeralPort, isUraiHomeDocument, waitForOwnedHome \} from '\.\/spatial-owned-server\.mjs'/)
  assert.match(replaySource, /response\.status === 200/)
  assert.match(replaySource, /isUraiHomeDocument\(await response\.text\(\)\)/)
  assert.match(replaySource, /URAI_REPLAY_EXISTING_SERVER_NOT_ORIGINAL_HOME/)
  assert.doesNotMatch(replaySource, /response\.ok \|\| response\.status < 500/)
  assert.doesNotMatch(replaySource, /serverResponds|waitForServer/)
})

test('Replay E2E owns a fresh ephemeral server and verifies the mounted original Home', () => {
  assert.match(replaySource, /await allocateEphemeralPort\(\)/)
  assert.match(replaySource, /await waitForOwnedHome\(server\.baseUrl, server\.child\)/)
  assert.match(replaySource, /Production Replay proof must own the exact built server/)
  assert.doesNotMatch(replaySource, /REQUESTED_PORT \+ 1/)
  assert.match(replaySource, /await stopServer\(server\.child\)/)
})
