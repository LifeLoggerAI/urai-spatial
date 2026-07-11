#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SHA_PATTERN = /^[0-9a-f]{40}$/
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const RUN_ID_PATTERN = /^\d+$/
const CANONICAL_ORIGIN = 'https://urai.app'
const CANONICAL_PROJECT = 'urai-4dc1d'
const CANONICAL_REPOSITORY = 'LifeLoggerAI/urai-spatial'
const FINGERPRINT_PATH = '/release-fingerprint.json'
const MAX_FINGERPRINT_BYTES = 64 * 1024

function requireFullSha(label, value) {
  if (!SHA_PATTERN.test(String(value || ''))) {
    throw new Error(`${label} must be a full lowercase 40-character commit SHA`)
  }
}

function requireExactCanonicalOrigin(value) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('Live origin must be a valid URL')
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== CANONICAL_ORIGIN ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(`Live origin must equal ${CANONICAL_ORIGIN}`)
  }
  return parsed.origin
}

export function validateLiveReleaseFingerprint(candidate, expected = {}) {
  const expectedOrigin = expected.liveOrigin || CANONICAL_ORIGIN
  const expectedProject = expected.firebaseProject || CANONICAL_PROJECT
  const expectedRepository = expected.repository || CANONICAL_REPOSITORY
  const failures = []

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Live release fingerprint must be a JSON object')
  }
  if (candidate.schemaVersion !== 'urai-release-fingerprint-1') {
    failures.push('schemaVersion must equal urai-release-fingerprint-1')
  }
  if (candidate.repository !== expectedRepository) {
    failures.push(`repository must equal ${expectedRepository}`)
  }
  if (!SHA_PATTERN.test(String(candidate.authoritySha || ''))) {
    failures.push('authoritySha must be a full lowercase 40-character commit SHA')
  }
  if (!SHA_PATTERN.test(String(candidate.releaseSha || ''))) {
    failures.push('releaseSha must be a full lowercase 40-character commit SHA')
  }
  if (!SHA_PATTERN.test(String(candidate.rollbackSha || ''))) {
    failures.push('rollbackSha must be a full lowercase 40-character commit SHA')
  }
  if (candidate.releaseSha === candidate.rollbackSha) {
    failures.push('releaseSha and rollbackSha must be distinct')
  }
  if (
    SHA_PATTERN.test(String(candidate.authoritySha || '')) &&
    ![candidate.releaseSha, candidate.rollbackSha].includes(candidate.authoritySha)
  ) {
    failures.push('authoritySha must equal the release or rollback authority recorded by the fingerprint')
  }
  if (candidate.firebaseProject !== expectedProject) {
    failures.push(`firebaseProject must equal ${expectedProject}`)
  }
  if (candidate.liveUrl !== expectedOrigin) {
    failures.push(`liveUrl must equal ${expectedOrigin}`)
  }
  if (candidate.deploymentScope !== 'hosting-only') {
    failures.push('deploymentScope must equal hosting-only')
  }
  if (candidate.certification !== 'pending-post-deploy-smoke') {
    failures.push('certification must equal pending-post-deploy-smoke')
  }
  if (!RUN_ID_PATTERN.test(String(candidate.workflowRunId || ''))) {
    failures.push('workflowRunId must be a numeric GitHub Actions run identifier')
  }

  if (failures.length) {
    throw new Error(`Live release fingerprint validation failed:\n- ${failures.join('\n- ')}`)
  }
  return candidate
}

export function evaluateLiveRollbackProvenance({
  operation,
  targetSha,
  rollbackSha,
  currentMainSha,
  fingerprint,
  liveOrigin = CANONICAL_ORIGIN,
  firebaseProject = CANONICAL_PROJECT,
  repository = CANONICAL_REPOSITORY,
}) {
  if (!['deploy', 'rollback'].includes(operation)) {
    throw new Error(`Unsupported release operation: ${operation || 'missing'}`)
  }
  requireFullSha('Target SHA', targetSha)
  requireFullSha('Rollback SHA', rollbackSha)
  requireFullSha('Current main SHA', currentMainSha)
  if (targetSha === rollbackSha) throw new Error('Target SHA and rollback SHA must be distinct')
  requireExactCanonicalOrigin(liveOrigin)
  if (firebaseProject !== CANONICAL_PROJECT) {
    throw new Error(`Firebase project must equal ${CANONICAL_PROJECT}`)
  }
  if (repository !== CANONICAL_REPOSITORY) {
    throw new Error(`Repository must equal ${CANONICAL_REPOSITORY}`)
  }

  const live = validateLiveReleaseFingerprint(fingerprint, {
    liveOrigin,
    firebaseProject,
    repository,
  })

  if (operation === 'deploy') {
    if (targetSha !== currentMainSha) {
      throw new Error('Deploy target must equal current main')
    }
    if (live.releaseSha !== rollbackSha) {
      throw new Error(`Deploy recovery SHA ${rollbackSha} is not the currently live production SHA ${live.releaseSha}`)
    }
    if (targetSha === live.releaseSha) {
      throw new Error('Deploy target is already the currently live production SHA')
    }
  } else {
    if (rollbackSha !== currentMainSha) {
      throw new Error('Rollback recovery SHA must equal current main')
    }
    if (live.releaseSha !== currentMainSha) {
      throw new Error(`Rollback is authorized only when current main ${currentMainSha} is the currently live production SHA ${live.releaseSha}`)
    }
    if (targetSha !== live.rollbackSha) {
      throw new Error(`Rollback target ${targetSha} is not the recovery SHA recorded by the live production fingerprint ${live.rollbackSha}`)
    }
  }

  return {
    operation,
    targetSha,
    rollbackSha,
    currentMainSha,
    liveAuthoritySha: live.authoritySha,
    liveReleaseSha: live.releaseSha,
    liveRollbackSha: live.rollbackSha,
    firebaseProject,
    repository,
    liveOrigin,
  }
}

export async function verifyLiveRollbackProvenance({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  evidenceDirectory = path.resolve('release-control-evidence'),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Global fetch is required to verify live rollback provenance')

  const operation = String(env.URAI_RELEASE_OPERATION || '').trim()
  const targetSha = String(env.URAI_TARGET_SHA || env.NEXT_PUBLIC_URAI_BUILD_SHA || '').trim()
  const rollbackSha = String(env.ROLLBACK_SHA || env.URAI_ROLLBACK_SHA || '').trim()
  const currentMainSha = String(env.CURRENT_MAIN_SHA || '').trim()
  const firebaseProject = String(env.FIREBASE_PROJECT_ID || '').trim()
  const expectedProject = String(env.URAI_EXPECTED_FIREBASE_PROJECT || CANONICAL_PROJECT).trim()
  const repository = String(env.GITHUB_REPOSITORY || '').trim()
  const liveOrigin = requireExactCanonicalOrigin(String(env.URAI_LIVE_BASE_URL || env.LIVE_URL || '').trim())

  if (firebaseProject !== expectedProject || expectedProject !== CANONICAL_PROJECT) {
    throw new Error(`Live provenance project mismatch: selected ${firebaseProject || 'missing'}, expected ${CANONICAL_PROJECT}`)
  }
  if (repository !== CANONICAL_REPOSITORY) {
    throw new Error(`Live provenance repository mismatch: selected ${repository || 'missing'}, expected ${CANONICAL_REPOSITORY}`)
  }

  const fingerprintUrl = new URL(FINGERPRINT_PATH, liveOrigin)
  fingerprintUrl.searchParams.set('urai_provenance_check', String(Date.now()))
  const response = await fetchImpl(fingerprintUrl, {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'cache-control': 'no-cache, no-store, max-age=0',
      pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (response.status >= 300 && response.status < 400) {
    throw new Error(`Live release fingerprint must not redirect; received ${response.status}`)
  }
  if (response.status !== 200) {
    throw new Error(`Live release fingerprint request failed with HTTP ${response.status}`)
  }
  const responseUrl = new URL(response.url || fingerprintUrl)
  if (responseUrl.toString() !== fingerprintUrl.toString()) {
    throw new Error(`Live release fingerprint resolved to an unexpected URL: ${responseUrl.toString()}`)
  }
  const contentType = response.headers?.get?.('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Live release fingerprint content type must be application/json; received ${contentType || 'missing'}`)
  }

  const raw = await response.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_FINGERPRINT_BYTES) {
    throw new Error(`Live release fingerprint exceeds ${MAX_FINGERPRINT_BYTES} bytes`)
  }
  let fingerprint
  try {
    fingerprint = JSON.parse(raw)
  } catch {
    throw new Error('Live release fingerprint must be valid JSON')
  }

  const result = evaluateLiveRollbackProvenance({
    operation,
    targetSha,
    rollbackSha,
    currentMainSha,
    fingerprint,
    liveOrigin,
    firebaseProject,
    repository,
  })

  const report = {
    schemaVersion: 'urai-live-rollback-provenance-2',
    verifiedAt: now().toISOString(),
    fingerprintUrl: `${liveOrigin}${FINGERPRINT_PATH}`,
    fingerprintRequestUrl: fingerprintUrl.toString(),
    fingerprintSha256: createHash('sha256').update(raw).digest('hex'),
    ...result,
  }
  if (!SHA256_PATTERN.test(report.fingerprintSha256)) {
    throw new Error('Live release fingerprint SHA-256 could not be materialized')
  }

  mkdirSync(evidenceDirectory, { recursive: true })
  const reportPath = path.join(evidenceDirectory, 'live-rollback-provenance.json')
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w' })
  console.log(JSON.stringify(report, null, 2))
  return report
}

export function runLiveRollbackProvenanceSelfTest() {
  const main = 'a'.repeat(40)
  const prior = 'b'.repeat(40)
  const older = 'c'.repeat(40)
  const fingerprint = {
    schemaVersion: 'urai-release-fingerprint-1',
    repository: CANONICAL_REPOSITORY,
    authoritySha: prior,
    releaseSha: prior,
    rollbackSha: older,
    firebaseProject: CANONICAL_PROJECT,
    liveUrl: CANONICAL_ORIGIN,
    deploymentScope: 'hosting-only',
    certification: 'pending-post-deploy-smoke',
    workflowRunId: '123456789',
  }

  evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: prior,
    currentMainSha: main,
    fingerprint,
  })

  evaluateLiveRollbackProvenance({
    operation: 'rollback',
    targetSha: older,
    rollbackSha: prior,
    currentMainSha: prior,
    fingerprint,
  })

  const rejected = []
  function expectRejected(name, callback, expectedMessage) {
    try {
      callback()
      throw new Error(`${name} unexpectedly passed`)
    } catch (error) {
      if (String(error).includes('unexpectedly passed')) throw error
      if (!String(error).includes(expectedMessage)) {
        throw new Error(`${name} failed for the wrong reason: ${String(error)}`)
      }
      rejected.push(name)
    }
  }

  expectRejected('unproven deploy recovery', () => evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: older,
    currentMainSha: main,
    fingerprint,
  }), 'not the currently live production SHA')

  expectRejected('arbitrary rollback ancestor', () => evaluateLiveRollbackProvenance({
    operation: 'rollback',
    targetSha: 'd'.repeat(40),
    rollbackSha: prior,
    currentMainSha: prior,
    fingerprint,
  }), 'not the recovery SHA recorded')

  expectRejected('rollback from non-live main', () => evaluateLiveRollbackProvenance({
    operation: 'rollback',
    targetSha: older,
    rollbackSha: main,
    currentMainSha: main,
    fingerprint,
  }), 'currently live production SHA')

  expectRejected('malformed fingerprint', () => evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: prior,
    currentMainSha: main,
    fingerprint: { ...fingerprint, rollbackSha: 'manual' },
  }), 'rollbackSha must be a full lowercase')

  expectRejected('unbound authority', () => evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: prior,
    currentMainSha: main,
    fingerprint: { ...fingerprint, authoritySha: 'd'.repeat(40) },
  }), 'authoritySha must equal the release or rollback authority')

  expectRejected('wrong repository', () => evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: prior,
    currentMainSha: main,
    fingerprint: { ...fingerprint, repository: 'LifeLoggerAI/UrAi' },
  }), `repository must equal ${CANONICAL_REPOSITORY}`)

  expectRejected('wrong production project', () => evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: prior,
    currentMainSha: main,
    fingerprint: { ...fingerprint, firebaseProject: 'other-project' },
  }), `firebaseProject must equal ${CANONICAL_PROJECT}`)

  expectRejected('wrong live origin', () => evaluateLiveRollbackProvenance({
    operation: 'deploy',
    targetSha: main,
    rollbackSha: prior,
    currentMainSha: main,
    fingerprint: { ...fingerprint, liveUrl: 'https://example.com' },
  }), `liveUrl must equal ${CANONICAL_ORIGIN}`)

  console.log(`[PASS] live rollback provenance self-test (${rejected.length + 2} cases)`)
  return true
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href
if (isMain) {
  if (process.argv.includes('--self-test')) runLiveRollbackProvenanceSelfTest()
  else await verifyLiveRollbackProvenance()
}
