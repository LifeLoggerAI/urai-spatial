import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const read = (relativePath) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8').replace(/\r\n?/g, '\n')

const operator = read('scripts/live-release.mjs')
const smoke = read('scripts/urai-release-control-smoke.mjs')
const recovery = read('scripts/firebase-hosting-recovery.mjs')
const focusedRunner = read('urai-tier1/scripts/run-unit-contract-tests.mjs')
const compactRunner = read('urai-tier1/scripts/run-unit-contract-tests-compact.mjs')
const contractPath = 'tests/automatic-hosting-recovery-contract.test.mjs'

test('canonical release operator is explicitly quarantined', () => {
  assert.match(operator, /process\.argv\.includes\('--deploy'\)/)
  assert.match(operator, /process\.argv\.includes\('--deploy-prebuilt'\)/)
  assert.match(operator, /URAI Spatial production release is NO-GO/)
  assert.match(operator, /No provider credentials were loaded and no production mutation was attempted\./)
})

test('canonical release operator contains no active Hosting mutation or recovery path', () => {
  assert.match(operator, /if \(deployRequested\) \{[\s\S]*throw new Error\(/)
  assert.match(operator, /WIF\/IAM least privilege/)
  assert.match(operator, /historical credential revocation/)
  assert.doesNotMatch(operator, /deployHostingWithTemporaryCredentials/)
  assert.doesNotMatch(operator, /recoverExactHostingVersion/)
  assert.doesNotMatch(operator, /discoverCurrentLiveRelease/)
})

test('dormant recovery implementation retains exact-version verification safeguards', () => {
  assert.match(recovery, /export async function verifyRestoredVersion/)
  assert.match(recovery, /restoreDiscoveredVersion/)
  assert.match(recovery, /listAllReleases/)
  assert.match(recovery, /verify-restored/)
})

test('strict smoke recovery remains isolated from direct deployment commands', () => {
  assert.match(smoke, /protectedDeployRecoveryContext/)
  assert.match(smoke, /await restoreDiscoveredVersion\(\)/)
  assert.match(smoke, /await verifyRestoredVersion\(\)/)
  assert.doesNotMatch(smoke, /gh workflow run/)
  assert.doesNotMatch(operator, /gh workflow run/)
})

test('both focused runners execute this quarantine-aware recovery contract', () => {
  assert.ok(focusedRunner.includes(`'${contractPath}'`))
  assert.ok(compactRunner.includes(`'${contractPath}'`))
})

// Exercise the actual workflow control fields. GitHub applies success() when
// an if has no status function; continue-on-error changes conclusion, not outcome.
// This bounded runner executes no deployment, credential or network commands.
const governed = read('.github/workflows/spatial-governed-wif-deploy.yml')
const blocks = governed.split(/\n(?=      - (?:id|name):)/)
const phaseIds = ['deploy-functions', 'deploy-hosting', 'live-smoke', 'certify-fingerprint', 'deploy-certified-fingerprint', 'certified-smoke']
function control(key, value) {
  const block = blocks.find((entry) => entry.startsWith(`      - ${key}: ${value}\n`))
  assert.ok(block, `missing governed step ${value}`)
  return {
    condition: /^        if: (.+)$/m.exec(block)?.[1] ?? '',
    continueOnError: /^        continue-on-error: true$/m.test(block),
  }
}
const rollbackControl = control('name', 'Roll back Hosting and Functions after any deployment or certification failure')
const finalControl = control('name', 'Fail release after rollback when deployment or live certification failed')
function enabled(condition, steps, state) {
  const statusFunction = /\b(?:always|success|failure|cancelled)\s*\(/.test(condition)
  if (!statusFunction && (state.failed || state.cancelled)) return false
  if (!condition) return true
  const expression = condition
    .replace(/steps\.([\w-]+)\.(outcome|conclusion)/g, (_, id, field) => JSON.stringify(steps[id]?.[field] ?? ''))
    .replace(/always\(\)/g, 'true')
    .replace(/success\(\)/g, String(!state.failed && !state.cancelled))
    .replace(/failure\(\)/g, String(state.failed))
    .replace(/cancelled\(\)/g, String(state.cancelled))
  assert.match(expression, /^[\s()!&|='"a-z-]*$/, 'unexpected governed condition syntax')
  return Boolean(runInNewContext(expression, {}, { timeout: 100 }))
}
function recoveryRun({ failPhase, rollbackFails = false, preflightFails = false, cancelPhase, cancelBeforeDeployment = false } = {}) {
  const state = { failed: preflightFails, cancelled: cancelBeforeDeployment }
  const steps = {}
  for (const id of phaseIds) {
    const fields = control('id', id)
    if (!enabled(fields.condition, steps, state)) {
      steps[id] = { outcome: 'skipped', conclusion: 'skipped' }
      continue
    }
    const outcome = id === cancelPhase ? 'cancelled' : id === failPhase ? 'failure' : 'success'
    const conclusion = outcome === 'failure' && fields.continueOnError ? 'success' : outcome
    steps[id] = { outcome, conclusion }
    state.failed ||= conclusion === 'failure'
    state.cancelled ||= conclusion === 'cancelled'
  }
  const rollback = enabled(rollbackControl.condition, steps, state)
  if (rollback && rollbackFails) state.failed = true
  const receipt = enabled(control('name', 'Write governed deployment receipt').condition, steps, state)
  const retainedEvidence = enabled(control('name', 'Retain governed deployment evidence').condition, steps, state)
  const finalFailure = enabled(finalControl.condition, steps, state)
  return { steps, rollback, receipt, retainedEvidence, finalFailure }
}

test('governed successful release neither rolls back nor reports a failed certification', () => {
  const result = recoveryRun()
  assert.ok(phaseIds.every((id) => result.steps[id].outcome === 'success'))
  assert.equal(result.rollback, false)
  assert.equal(result.finalFailure, false)
})

for (const failPhase of phaseIds) {
  test(`governed ${failPhase} failure attempts recovery and remains NO-GO`, () => {
    const result = recoveryRun({ failPhase })
    assert.equal(result.steps[failPhase].outcome, 'failure')
    assert.equal(result.rollback, true, 'failed deployed release must reach rollback despite implicit status filtering')
    assert.equal(result.finalFailure, true)
    assert.equal(result.receipt, true)
    assert.equal(result.retainedEvidence, true)
    if (['deploy-functions', 'deploy-hosting', 'live-smoke', 'certify-fingerprint'].includes(failPhase)) {
      assert.equal(result.steps['deploy-certified-fingerprint'].outcome, 'skipped', 'failed predecessor must never publish a certified fingerprint')
    }
  })
}

test('failed recovery retains evidence and still executes explicit release failure', () => {
  const result = recoveryRun({ failPhase: 'certify-fingerprint', rollbackFails: true })
  assert.equal(result.rollback, true)
  assert.equal(result.receipt, true)
  assert.equal(result.retainedEvidence, true)
  assert.equal(result.finalFailure, true)
})

test('preflight failure or cancellation cannot initiate a production rollback', () => {
  for (const options of [{ preflightFails: true }, { cancelBeforeDeployment: true }]) {
    const result = recoveryRun(options)
    assert.ok(phaseIds.every((id) => result.steps[id].outcome === 'skipped'))
    assert.equal(result.rollback, false)
    assert.equal(result.finalFailure, false)
    assert.equal(result.retainedEvidence, true)
  }
})

test('cancellation after deployment starts attempts recovery without fingerprint promotion', () => {
  for (const cancelPhase of ['deploy-functions', 'certify-fingerprint']) {
    const result = recoveryRun({ cancelPhase })
    assert.equal(result.rollback, true)
    assert.equal(result.finalFailure, true)
    assert.equal(result.steps['deploy-certified-fingerprint'].outcome, 'skipped')
    assert.equal(result.retainedEvidence, true)
  }
})

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
function withBundleFixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'urai-certified-bundle-'))
  try {
    const output = path.join(root, 'out')
    const initial = path.join(root, 'initial-bundle')
    const preserved = path.join(initial, 'urai-tier1/out')
    const finalManifest = path.join(root, 'receipt/certified-bundle-manifest.json')
    mkdirSync(output, { recursive: true })
    mkdirSync(preserved, { recursive: true })
    const fingerprint = {
      schemaVersion: 'urai-release-fingerprint-1', repository: 'LifeLoggerAI/urai-spatial',
      authoritySha: 'a'.repeat(40), releaseSha: 'a'.repeat(40), rollbackSha: 'b'.repeat(40),
      firebaseProject: 'urai-4dc1d', liveUrl: 'https://urai.app', deploymentScope: 'functions-and-hosting',
      functionsTreeSha: 'c'.repeat(40), firebaseStaticConfigSha256: 'd'.repeat(64),
      certification: 'pending-post-deploy-smoke', workflowRunId: '123', generatedAt: '2026-01-01T00:00:00Z',
    }
    const content = { 'index.html': '<main>Synthetic release fixture</main>', 'world.js': 'synthetic-world', 'release-fingerprint.json': JSON.stringify(fingerprint) + '\n' }
    const files = Object.entries(content).map(([name, value]) => {
      writeFileSync(path.join(output, name), value)
      copyFileSync(path.join(output, name), path.join(preserved, name))
      return { path: name, bytes: Buffer.byteLength(value), sha256: sha256(value) }
    }).sort((a, b) => a.path.localeCompare(b.path))
    const manifest = {
      schemaVersion: 'urai-static-release-bundle-1', repository: fingerprint.repository,
      workflowRunId: '123', authoritySha: fingerprint.authoritySha, targetSha: fingerprint.releaseSha,
      rollbackSha: fingerprint.rollbackSha, firebaseProject: fingerprint.firebaseProject,
      liveUrl: fingerprint.liveUrl, deploymentScope: fingerprint.deploymentScope,
      functionsTreeSha: fingerprint.functionsTreeSha, firebaseStaticConfigSha256: fingerprint.firebaseStaticConfigSha256,
      fingerprintSha256: sha256(content['release-fingerprint.json']), fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files,
    }
    const manifestPath = path.join(initial, 'manifest.json')
    writeFileSync(manifestPath, JSON.stringify(manifest) + '\n')
    const env = {
      ...process.env, URAI_RELEASE_FINGERPRINT_PATH: path.join(output, 'release-fingerprint.json'),
      URAI_RELEASE_BUNDLE_DIR: initial, URAI_CERTIFIED_BUNDLE_MANIFEST_PATH: finalManifest,
      URAI_EXPECTED_DEPLOYED_SHA: fingerprint.releaseSha, URAI_EXPECTED_AUTHORITY_SHA: fingerprint.authoritySha,
      URAI_EXPECTED_ROLLBACK_SHA: fingerprint.rollbackSha, URAI_EXPECTED_FUNCTIONS_TREE_SHA: fingerprint.functionsTreeSha,
      URAI_EXPECTED_STATIC_CONFIG_SHA256: fingerprint.firebaseStaticConfigSha256, GITHUB_RUN_ID: '123',
    }
    run({ output, preserved, fingerprint, manifest, manifestPath, finalManifest, env, execute: () => spawnSync(process.execPath, [path.join(repositoryRoot, 'scripts/certify-release-fingerprint.mjs')], { env, encoding: 'utf8' }) })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('actual certification preserves initial custody and attests only changed fingerprint metadata', () => withBundleFixture((fixture) => {
  const originalManifest = readFileSync(fixture.manifestPath)
  const originalFingerprint = readFileSync(path.join(fixture.preserved, 'release-fingerprint.json'))
  const result = fixture.execute()
  assert.equal(result.status, 0, result.stderr)
  const fingerprintBytes = readFileSync(path.join(fixture.output, 'release-fingerprint.json'))
  const fingerprint = JSON.parse(fingerprintBytes)
  const final = JSON.parse(readFileSync(fixture.finalManifest))
  assert.deepEqual(readFileSync(fixture.manifestPath), originalManifest)
  assert.deepEqual(readFileSync(path.join(fixture.preserved, 'release-fingerprint.json')), originalFingerprint)
  assert.equal(final.targetSha, fixture.manifest.targetSha)
  assert.equal(final.authoritySha, fixture.manifest.authoritySha)
  assert.equal(final.workflowRunId, '123')
  assert.equal(final.certificationRunId, '123')
  assert.equal(final.certification, 'verified-post-deploy-smoke')
  assert.equal(final.initialManifestSha256, sha256(originalManifest))
  assert.equal(final.initialFingerprintSha256, sha256(originalFingerprint))
  assert.equal(final.fingerprintSha256, sha256(fingerprintBytes))
  assert.equal(final.bundleDigestSha256, sha256(JSON.stringify(final.files)))
  assert.notEqual(final.fingerprintSha256, final.initialFingerprintSha256)
  const metadata = ['certification', 'certifiedAt', 'certificationRunId', 'certifiedBy']
  assert.deepEqual(Object.fromEntries(Object.entries(fingerprint).filter(([key]) => !metadata.includes(key))), Object.fromEntries(Object.entries(fixture.fingerprint).filter(([key]) => !metadata.includes(key))))
  assert.deepEqual(final.files.filter((file) => file.path !== 'release-fingerprint.json'), fixture.manifest.files.filter((file) => file.path !== 'release-fingerprint.json'))
  for (const file of final.files) {
    const bytes = readFileSync(path.join(fixture.output, file.path))
    assert.equal(file.bytes, bytes.length)
    assert.equal(file.sha256, sha256(bytes))
  }
}))

const bundleMutations = {
  'changed world content': (fixture) => writeFileSync(path.join(fixture.output, 'world.js'), 'different-world'),
  'missing output': (fixture) => unlinkSync(path.join(fixture.output, 'world.js')),
  'extra output': (fixture) => writeFileSync(path.join(fixture.output, 'unexpected.js'), 'extra'),
  'altered initial bundle copy': (fixture) => writeFileSync(path.join(fixture.preserved, 'world.js'), 'altered-custody'),
  'foreign manifest source': (fixture) => { fixture.manifest.targetSha = 'e'.repeat(40); writeFileSync(fixture.manifestPath, JSON.stringify(fixture.manifest)) },
  'foreign manifest run': (fixture) => { fixture.manifest.workflowRunId = '456'; writeFileSync(fixture.manifestPath, JSON.stringify(fixture.manifest)) },
  'false manifest totals': (fixture) => { fixture.manifest.totalBytes++; writeFileSync(fixture.manifestPath, JSON.stringify(fixture.manifest)) },
  'unbound fingerprint bytes': (fixture) => writeFileSync(path.join(fixture.output, 'release-fingerprint.json'), JSON.stringify({ ...fixture.fingerprint, extraClaim: true })),
}
for (const [label, mutate] of Object.entries(bundleMutations)) {
  test(`actual certification rejects ${label} before promotion`, () => withBundleFixture((fixture) => {
    mutate(fixture)
    const before = readFileSync(path.join(fixture.output, 'release-fingerprint.json'))
    const result = fixture.execute()
    assert.notEqual(result.status, 0, 'invalid source or custody must fail certification')
    assert.deepEqual(readFileSync(path.join(fixture.output, 'release-fingerprint.json')), before, 'rejected inputs must retain pending source unchanged')
    assert.throws(() => readFileSync(fixture.finalManifest), /ENOENT/)
  }))
}
