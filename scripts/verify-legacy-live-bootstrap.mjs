#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SHA_PATTERN = /^[0-9a-f]{40}$/
const CANONICAL_ORIGIN = 'https://urai.app'
const CANONICAL_PROJECT = 'urai-4dc1d'
const CANONICAL_REPOSITORY = 'LifeLoggerAI/urai-spatial'
const CANONICAL_WORKFLOW = 'URAI Canonical Production Release'
const FINGERPRINT_PATH = '/release-fingerprint.json'
const MAX_RESPONSE_BYTES = 64 * 1024
const LEGACY_HTML_MARKERS = [
  'Help us tune the Life Movie.',
  'Feedback capture is paused because Firebase isn’t configured in this environment.',
  'Build with us',
]

function requireFullSha(label, value) {
  if (!SHA_PATTERN.test(String(value || ''))) {
    throw new Error(`${label} must be a full lowercase 40-character commit SHA`)
  }
}

function requireExactOrigin(value) {
  const parsed = new URL(value)
  if (
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

function responseSummary({ status, contentType, body, responseUrl }) {
  return {
    status,
    contentType,
    responseUrl,
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  }
}

export function classifyLegacyFingerprintResponse({
  status,
  contentType = '',
  body = '',
  responseUrl = `${CANONICAL_ORIGIN}${FINGERPRINT_PATH}`,
}) {
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error(`Legacy fingerprint response exceeds ${MAX_RESPONSE_BYTES} bytes`)
  }

  const normalizedType = contentType.toLowerCase()
  const trimmed = body.trim()
  const summary = responseSummary({ status, contentType, body, responseUrl })

  if (status === 404 || status === 410) {
    return { kind: `missing-http-${status}`, markers: [], ...summary }
  }

  if (status !== 200) {
    throw new Error(`Legacy fingerprint endpoint returned unsupported HTTP ${status}`)
  }

  if (normalizedType.includes('application/json') || trimmed.startsWith('{')) {
    let parsed
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error('Legacy bootstrap refuses a malformed JSON fingerprint response')
    }
    if (parsed?.schemaVersion === 'urai-release-fingerprint-1') {
      throw new Error('Legacy bootstrap is forbidden because a valid release fingerprint already exists')
    }
    throw new Error('Legacy bootstrap refuses an unrecognized JSON fingerprint response')
  }

  if (!normalizedType.includes('text/html')) {
    throw new Error(`Legacy bootstrap requires a missing endpoint or recognized legacy HTML; received ${contentType || 'missing content type'}`)
  }

  const markers = LEGACY_HTML_MARKERS.filter((marker) => body.includes(marker))
  if (markers.length !== LEGACY_HTML_MARKERS.length) {
    throw new Error(`Legacy HTML response did not contain every required marker; found ${markers.length}/${LEGACY_HTML_MARKERS.length}`)
  }
  if (body.includes('urai-release-fingerprint-1')) {
    throw new Error('Legacy HTML unexpectedly contains a release fingerprint schema marker')
  }

  return { kind: 'recognized-legacy-html', markers, ...summary }
}

async function readBoundedBody(response) {
  const body = await response.text()
  if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error(`Legacy fingerprint response exceeds ${MAX_RESPONSE_BYTES} bytes`)
  }
  return body
}

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', shell: false })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`)
  }
  return (result.stdout || '').trim()
}

function validateExecutionBoundary(env) {
  if (env.GITHUB_ACTIONS !== 'true') throw new Error('Legacy bootstrap is allowed only inside GitHub Actions')
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch') throw new Error('Legacy bootstrap requires workflow_dispatch')
  if (env.GITHUB_JOB !== 'deploy') throw new Error('Legacy bootstrap is allowed only inside the protected deploy job')
  if (env.GITHUB_REF !== 'refs/heads/main') throw new Error('Legacy bootstrap requires refs/heads/main')
  if (env.GITHUB_WORKFLOW !== CANONICAL_WORKFLOW) throw new Error(`Legacy bootstrap requires workflow ${CANONICAL_WORKFLOW}`)
  if (env.GITHUB_REPOSITORY !== CANONICAL_REPOSITORY) throw new Error(`Legacy bootstrap requires repository ${CANONICAL_REPOSITORY}`)
  if (env.URAI_RELEASE_OPERATION !== 'deploy') throw new Error('Legacy bootstrap is valid only for a deploy operation')
  if (env.URAI_LEGACY_BOOTSTRAP !== '1') throw new Error('URAI_LEGACY_BOOTSTRAP=1 is required')
  if (env.URAI_LEGACY_BOOTSTRAP_CONFIRM !== 'BOOTSTRAP_LEGACY_URAI_APP') {
    throw new Error('Legacy bootstrap confirmation phrase mismatch')
  }
}

export async function verifyLegacyLiveBootstrap({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  evidenceDirectory = path.resolve('release-control-evidence'),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Global fetch is required to verify the legacy live state')
  validateExecutionBoundary(env)

  const targetSha = String(env.URAI_TARGET_SHA || env.NEXT_PUBLIC_URAI_BUILD_SHA || '').trim()
  const recoverySha = String(env.ROLLBACK_SHA || env.URAI_ROLLBACK_SHA || '').trim()
  const currentMainSha = String(env.CURRENT_MAIN_SHA || '').trim()
  const firebaseProject = String(env.FIREBASE_PROJECT_ID || '').trim()
  const expectedProject = String(env.URAI_EXPECTED_FIREBASE_PROJECT || CANONICAL_PROJECT).trim()
  const liveOrigin = requireExactOrigin(String(env.URAI_LIVE_BASE_URL || env.LIVE_URL || '').trim())

  requireFullSha('Target SHA', targetSha)
  requireFullSha('Recovery SHA', recoverySha)
  requireFullSha('Current main SHA', currentMainSha)
  if (targetSha !== currentMainSha) throw new Error('Legacy bootstrap target must equal current main')
  if (recoverySha === targetSha) throw new Error('Legacy bootstrap recovery SHA must be distinct from current main')
  if (firebaseProject !== CANONICAL_PROJECT || expectedProject !== CANONICAL_PROJECT) {
    throw new Error(`Legacy bootstrap project must equal ${CANONICAL_PROJECT}`)
  }

  const remoteMain = runGit(['ls-remote', '--exit-code', 'origin', 'refs/heads/main']).split(/\s+/)[0]
  if (remoteMain !== currentMainSha) {
    throw new Error(`Remote main changed before legacy bootstrap proof: expected ${currentMainSha}, found ${remoteMain || 'missing'}`)
  }
  runGit(['merge-base', '--is-ancestor', recoverySha, currentMainSha])

  const fingerprintUrl = new URL(FINGERPRINT_PATH, liveOrigin)
  fingerprintUrl.searchParams.set('urai_legacy_bootstrap_check', String(Date.now()))
  const first = await fetchImpl(fingerprintUrl, {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      accept: 'application/json,text/html;q=0.5',
      'cache-control': 'no-cache, no-store, max-age=0',
      pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(10_000),
  })

  let classification
  let redirect = null
  if (first.status >= 300 && first.status < 400) {
    const location = first.headers?.get?.('location') || ''
    if (!location) throw new Error(`Legacy fingerprint redirect ${first.status} did not include Location`)
    const target = new URL(location, fingerprintUrl)
    if (
      target.origin !== CANONICAL_ORIGIN ||
      !['/home', '/home/'].includes(target.pathname) ||
      target.search ||
      target.hash ||
      target.username ||
      target.password
    ) {
      throw new Error(`Legacy fingerprint redirected to an unauthorized location: ${target.toString()}`)
    }
    const second = await fetchImpl(target, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        accept: 'text/html',
        'cache-control': 'no-cache, no-store, max-age=0',
        pragma: 'no-cache',
      },
      signal: AbortSignal.timeout(10_000),
    })
    const body = await readBoundedBody(second)
    classification = classifyLegacyFingerprintResponse({
      status: second.status,
      contentType: second.headers?.get?.('content-type') || '',
      body,
      responseUrl: second.url || target.toString(),
    })
    if (classification.kind !== 'recognized-legacy-html') {
      throw new Error(`Legacy redirect target did not resolve to recognized legacy HTML: ${classification.kind}`)
    }
    redirect = {
      status: first.status,
      location: target.toString(),
    }
  } else {
    const body = await readBoundedBody(first)
    classification = classifyLegacyFingerprintResponse({
      status: first.status,
      contentType: first.headers?.get?.('content-type') || '',
      body,
      responseUrl: first.url || fingerprintUrl.toString(),
    })
  }

  mkdirSync(evidenceDirectory, { recursive: true })
  const report = {
    schemaVersion: 'urai-legacy-live-bootstrap-provenance-1',
    verifiedAt: now().toISOString(),
    mode: 'legacy-bootstrap',
    repository: CANONICAL_REPOSITORY,
    workflow: CANONICAL_WORKFLOW,
    targetSha,
    recoverySha,
    currentMainSha,
    firebaseProject,
    liveOrigin,
    fingerprintRequestUrl: fingerprintUrl.toString(),
    legacyCondition: classification.kind,
    response: classification,
    redirect,
    validFingerprintPresent: false,
    normalFingerprintDeployRequiredAfterBootstrap: true,
  }
  const reportPath = path.join(evidenceDirectory, 'live-rollback-provenance.json')
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w' })
  console.log(JSON.stringify(report, null, 2))
  return report
}

export function runLegacyLiveBootstrapSelfTest() {
  const html = LEGACY_HTML_MARKERS.join('\n')
  assert.equal(classifyLegacyFingerprintResponse({
    status: 404,
    contentType: 'text/html',
    body: 'not found',
  }).kind, 'missing-http-404')
  assert.equal(classifyLegacyFingerprintResponse({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: html,
  }).kind, 'recognized-legacy-html')
  assert.throws(() => classifyLegacyFingerprintResponse({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ schemaVersion: 'urai-release-fingerprint-1' }),
  }), /valid release fingerprint already exists/)
  assert.throws(() => classifyLegacyFingerprintResponse({
    status: 200,
    contentType: 'application/json',
    body: '{',
  }), /malformed JSON/)
  assert.throws(() => classifyLegacyFingerprintResponse({
    status: 200,
    contentType: 'text/html',
    body: 'generic page',
  }), /required marker/)
  console.log(JSON.stringify({
    schemaVersion: 'urai-legacy-live-bootstrap-self-test-1',
    ok: true,
  }, null, 2))
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedDirectly) {
  if (process.argv.includes('--self-test')) {
    runLegacyLiveBootstrapSelfTest()
  } else {
    await verifyLegacyLiveBootstrap()
  }
}
