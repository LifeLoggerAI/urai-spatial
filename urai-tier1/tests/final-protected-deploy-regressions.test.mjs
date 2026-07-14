import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const readRepositoryFile = (file) => readFileSync(path.join(repositoryRoot, file), 'utf8').replace(/\r\n?/g, '\n')

const releaseOperator = readRepositoryFile('scripts/live-release.mjs')
const credentialBoundary = readRepositoryFile('scripts/verify-release-credential-boundary.mjs')

test('prebuilt release verification rejects every dot-prefixed path segment', () => {
  assert.match(
    releaseOperator,
    /relative\.split\('\/'\)\.some\(\(segment\) => segment\.startsWith\('\.'\)\)/,
  )
  assert.doesNotMatch(
    releaseOperator,
    /path\.posix\.basename\(relative\)\.startsWith\('\.'\)/,
  )
  assert.match(releaseOperator, /Firebase-ignored dot path/)
})

test('live rollback provenance evidence stays outside the authority checkout', () => {
  assert.match(credentialBoundary, /const runnerTemp = \(process\.env\.RUNNER_TEMP \|\| ''\)\.trim\(\)/)
  assert.match(credentialBoundary, /path\.join\(runnerTemp, 'release-control-evidence'\)/)
  assert.match(
    credentialBoundary,
    /verifyLiveRollbackProvenance\(\{ evidenceDirectory: liveRollbackEvidenceDirectory \}\)/,
  )
  assert.match(
    releaseOperator,
    /status === 'deployed' && liveRollbackProvenancePath && existsSync\(liveRollbackProvenancePath\)/,
  )
})
