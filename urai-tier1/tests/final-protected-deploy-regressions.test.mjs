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
    /includeLiveRollbackProvenance && liveRollbackProvenancePath && existsSync\(liveRollbackProvenancePath\)/,
  )
})

test('predeploy receipt stays outside the checkout until deploy succeeds', () => {
  assert.ok(releaseOperator.includes('function resolvePreDeployReceiptRoot()'))
  assert.ok(releaseOperator.includes('rootDirectory: preDeployReceiptRoot'))
  assert.ok(releaseOperator.includes('includeLiveRollbackProvenance: false'))
  assert.ok(releaseOperator.includes('Current authority checkout must remain clean immediately before deployment'))
  assert.ok(releaseOperator.includes("output('git', ['status', '--porcelain', '--untracked-files=all'])"))
  assert.ok(releaseOperator.includes("copyFileSync(receiptPath, path.join(path.dirname(finalReceiptPath), 'predeploy-receipt.json'))"))

  const predeployReceipt = releaseOperator.indexOf("writeReceipt(targetSha, 'built-awaiting-deploy'")
  const deploy = releaseOperator.lastIndexOf('deployHostingWithTemporaryCredentials()')
  const finalReceipt = releaseOperator.indexOf("writeReceipt(targetSha, 'deployed'")
  const retainedPredeploy = releaseOperator.indexOf("'predeploy-receipt.json'")
  assert.ok(predeployReceipt >= 0 && deploy > predeployReceipt && finalReceipt > deploy && retainedPredeploy > finalReceipt)
})
