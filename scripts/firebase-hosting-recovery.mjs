#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const apiRoot = 'https://firebasehosting.googleapis.com/v1beta1'
const expectedSiteId = 'urai-4dc1d'
const restoreConfirmation = 'RESTORE_EXACT_HOSTING_VERSION'
const canonicalRepository = 'LifeLoggerAI/urai-spatial'
const canonicalWorkflow = 'URAI Canonical Production Release'
const captureWorkflow = 'Capture legacy Firebase Hosting recovery'

function requireString(label, value) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${label} is required`)
  return normalized
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function resolveRunnerTemp() {
  const runnerTemp = requireString('RUNNER_TEMP', process.env.RUNNER_TEMP)
  mkdirSync(runnerTemp, { recursive: true })
  return realpathSync(runnerTemp)
}

function assertPathInsideRunnerTemp(label, requestedPath) {
  const runnerTemp = resolveRunnerTemp()
  const resolved = path.resolve(requestedPath)
  if (resolved !== runnerTemp && !resolved.startsWith(`${runnerTemp}${path.sep}`)) {
    if (label === 'Hosting recovery receipt') {
      throw new Error('Hosting recovery receipt must remain inside RUNNER_TEMP')
    }
    throw new Error(`${label} must remain inside RUNNER_TEMP`)
  }
  return resolved
}

function assertFederatedEnvironment({ allowCapture = false } = {}) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is forbidden in the production Hosting recovery path')
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GOOGLE_CREDENTIALS_JSON) {
    throw new Error('Raw Google credential JSON is forbidden in the production Hosting recovery path')
  }
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Hosting recovery requires GitHub Actions')
  if (process.env.GITHUB_REPOSITORY !== canonicalRepository) throw new Error(`Hosting recovery requires repository ${canonicalRepository}`)
  if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Hosting recovery requires refs/heads/main')
  const canonicalDeploy = process.env.GITHUB_WORKFLOW === canonicalWorkflow && process.env.GITHUB_JOB === 'deploy'
  const protectedCapture = allowCapture && process.env.GITHUB_WORKFLOW === captureWorkflow && process.env.GITHUB_JOB === 'capture'
  if (!canonicalDeploy && !protectedCapture) {
    throw new Error(`Hosting recovery requires the protected ${canonicalWorkflow} deploy job${allowCapture ? ' or protected recovery-capture job' : ''}`)
  }

  const provider = requireString('GCP_WIF_PROVIDER', process.env.GCP_WIF_PROVIDER)
  const expectedAccount = requireString('GCP_DEPLOY_SERVICE_ACCOUNT', process.env.GCP_DEPLOY_SERVICE_ACCOUNT)
  const credentialsPath = requireString('GOOGLE_APPLICATION_CREDENTIALS', process.env.GOOGLE_APPLICATION_CREDENTIALS)
  const ghaCredentialsPath = requireString('GOOGLE_GHA_CREDS_PATH', process.env.GOOGLE_GHA_CREDS_PATH)
  if (path.resolve(credentialsPath) !== path.resolve(ghaCredentialsPath)) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS must equal the google-github-actions/auth credential path')
  }
  if (!existsSync(credentialsPath)) throw new Error('Federated Application Default Credentials file is missing')
  const stats = lstatSync(credentialsPath)
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('Federated Application Default Credentials must be a regular non-symlinked file')
  const configSource = readFileSync(credentialsPath, 'utf8')
  let config
  try {
    config = JSON.parse(configSource)
  } catch {
    throw new Error('Federated Application Default Credentials file must contain valid JSON')
  }
  if (config?.type !== 'external_account') throw new Error('Production credentials must use external_account Workload Identity Federation')
  if (String(config?.audience || '') !== `//iam.googleapis.com/${provider}` && String(config?.audience || '') !== provider) {
    throw new Error('Federated credential audience does not match GCP_WIF_PROVIDER')
  }
  const serialized = JSON.stringify(config)
  if (/private_key|client_secret|credentials_json/i.test(serialized)) {
    throw new Error('Federated credential configuration contains forbidden long-lived credential material')
  }
  if (!String(config?.service_account_impersonation_url || '').includes(encodeURIComponent(expectedAccount)) &&
      !String(config?.service_account_impersonation_url || '').includes(expectedAccount)) {
    throw new Error('Federated credential configuration does not target the dedicated production service account')
  }
  return { provider, expectedAccount, credentialsPath }
}

function gcloud(args) {
  const result = spawnSync('gcloud', args, {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, FIREBASE_SERVICE_ACCOUNT_JSON: undefined },
  })
  if (result.status !== 0) {
    const detail = String(result.stderr || '').trim()
    throw new Error(`gcloud ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`)
  }
  return String(result.stdout || '').trim()
}

function accessTokenFromFederatedAdc(options = {}) {
  const { expectedAccount } = assertFederatedEnvironment(options)
  const project = gcloud(['config', 'get-value', 'project'])
  if (project !== expectedSiteId) throw new Error(`Active gcloud project mismatch: ${project || 'missing'}`)
  const activeAccount = gcloud(['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)'])
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)[0]
  if (activeAccount !== expectedAccount) throw new Error('Active gcloud account does not match the dedicated production service account')
  return requireString('Federated OAuth access token', gcloud(['auth', 'print-access-token']))
}

export function assertSiteId(value) {
  const siteId = requireString('Firebase Hosting site ID', value)
  if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(siteId)) throw new Error(`Invalid Firebase Hosting site ID: ${siteId}`)
  if (siteId !== expectedSiteId) throw new Error(`Refusing Firebase Hosting site ${siteId}; expected ${expectedSiteId}`)
  return siteId
}

export function assertVersionName(value, siteId = expectedSiteId) {
  const versionName = requireString('Firebase Hosting version name', value)
  const pattern = new RegExp(`^sites/${escapeRegExp(siteId)}/versions/[A-Za-z0-9_-]+$`)
  if (!pattern.test(versionName)) throw new Error(`Invalid Firebase Hosting version name: ${versionName}`)
  return versionName
}

export function assertRestorableVersion(version, expectedVersionName) {
  if (!version || typeof version !== 'object') throw new Error('Firebase Hosting recovery version response is missing')
  const versionName = assertVersionName(version.name)
  if (versionName !== expectedVersionName) {
    throw new Error(`Firebase Hosting recovery version mismatch: expected ${expectedVersionName}, observed ${versionName}`)
  }
  const status = requireString('Firebase Hosting recovery version status', version.status)
  if (status !== 'FINALIZED') {
    throw new Error(`Firebase Hosting recovery version ${versionName} is not restorable; status is ${status}`)
  }
  return { versionName, status }
}

export function selectCurrentLiveRelease(releases, siteId = expectedSiteId) {
  if (!Array.isArray(releases)) throw new Error('Firebase Hosting releases response must contain an array')
  const liveNamePattern = new RegExp(`^sites/${escapeRegExp(siteId)}/releases/[^/]+$`)
  const candidates = releases
    .filter((release) => release && typeof release === 'object')
    .filter((release) => liveNamePattern.test(String(release.name || '')))
    .filter((release) => release.type !== 'SITE_DISABLE')
    .map((release) => {
      const releaseTimeMs = Date.parse(String(release.releaseTime || ''))
      if (!Number.isFinite(releaseTimeMs)) {
        throw new Error(`Invalid releaseTime for live Firebase Hosting release: ${release.name}`)
      }
      return { ...release, releaseTimeMs }
    })
    .sort((left, right) => right.releaseTimeMs - left.releaseTimeMs)

  if (!candidates.length) throw new Error(`No active live Firebase Hosting release found for ${siteId}`)
  const selected = candidates[0]
  return {
    ...selected,
    versionName: assertVersionName(selected.version?.name, siteId),
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let body = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      throw new Error(`Firebase Hosting API returned non-JSON status ${response.status}`)
    }
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.error || text || response.statusText
    throw new Error(`Firebase Hosting API ${response.status}: ${message}`)
  }
  return body
}

function resolveReceiptPath() {
  const runnerTemp = resolveRunnerTemp()
  const requested = process.env.URAI_HOSTING_RECOVERY_RECEIPT?.trim()
    || path.join(runnerTemp, 'hosting-recovery', 'legacy-live-release.json')
  return assertPathInsideRunnerTemp('Hosting recovery receipt', requested)
}

export function validateRecoveryReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') throw new Error('Hosting recovery receipt must contain an object')
  if (receipt.schemaVersion !== 'urai-firebase-hosting-recovery-2') throw new Error('Unsupported Hosting recovery receipt schema')
  if (receipt.authMode !== 'wif' || receipt.credentialClass !== 'github-oidc-wif') {
    throw new Error('Hosting recovery receipt must prove WIF authentication')
  }
  const siteId = assertSiteId(receipt.siteId)
  const versionName = assertVersionName(receipt.versionName, siteId)
  if (receipt.versionStatus !== undefined && receipt.versionStatus !== 'FINALIZED') {
    throw new Error(`Recovery receipt records a non-restorable Firebase Hosting version status: ${receipt.versionStatus}`)
  }
  if (!new RegExp(`^sites/${escapeRegExp(siteId)}/releases/[^/]+$`).test(String(receipt.releaseName || ''))) {
    throw new Error('Recovery receipt does not identify a live-channel release')
  }
  return { siteId, versionName }
}

function readRecoveryReceipt() {
  const receiptPath = resolveReceiptPath()
  if (!existsSync(receiptPath)) throw new Error(`Hosting recovery receipt is missing: ${receiptPath}`)
  const stats = lstatSync(receiptPath)
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('Hosting recovery receipt must be a regular non-symlinked file')
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  const { siteId, versionName } = validateRecoveryReceipt(receipt)
  return { receiptPath, receipt, siteId, versionName }
}

async function listAllReleases(accessToken, siteId) {
  const releases = []
  let pageToken = ''
  for (let page = 0; page < 100; page += 1) {
    const url = new URL(`${apiRoot}/sites/${siteId}/releases`)
    url.searchParams.set('pageSize', '100')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const body = await requestJson(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    if (body.releases !== undefined && !Array.isArray(body.releases)) {
      throw new Error('Firebase Hosting releases response has an invalid releases field')
    }
    releases.push(...(body.releases || []))
    pageToken = String(body.nextPageToken || '')
    if (!pageToken) return releases
  }
  throw new Error('Firebase Hosting release pagination exceeded the fail-closed limit')
}

async function fetchVersion(accessToken, versionName) {
  return requestJson(`${apiRoot}/${versionName}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
}

async function currentLiveRelease(siteId) {
  const accessToken = accessTokenFromFederatedAdc({ allowCapture: true })
  const release = selectCurrentLiveRelease(await listAllReleases(accessToken, siteId), siteId)
  return { accessToken, release }
}

export async function discoverCurrentLiveRelease() {
  const siteId = assertSiteId(process.env.FIREBASE_SITE_ID || expectedSiteId)
  const { accessToken, release } = await currentLiveRelease(siteId)
  const version = await fetchVersion(accessToken, release.versionName)
  const restorable = assertRestorableVersion(version, release.versionName)
  const receiptPath = resolveReceiptPath()
  mkdirSync(path.dirname(receiptPath), { recursive: true })
  const receipt = {
    schemaVersion: 'urai-firebase-hosting-recovery-2',
    discoveredAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || canonicalRepository,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    authoritySha: process.env.GITHUB_SHA || null,
    siteId,
    releaseName: release.name,
    versionName: release.versionName,
    versionStatus: restorable.status,
    releaseTime: release.releaseTime,
    releaseType: release.type || 'TYPE_UNSPECIFIED',
    sourceApi: 'firebasehosting.googleapis.com/v1beta1/sites.releases.list+sites.versions.get',
    authMode: 'wif',
    credentialClass: 'github-oidc-wif',
    principalClass: 'dedicated-production-service-account',
    longLivedServiceAccountKeyUsed: false,
    deployment: false,
  }
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify({ ok: true, action: 'discover', receiptPath, ...receipt }, null, 2))
  return { receiptPath, receipt }
}

export async function restoreDiscoveredVersion() {
  if (process.env.URAI_HOSTING_RESTORE_CONFIRM !== restoreConfirmation) {
    throw new Error(`Restore requires URAI_HOSTING_RESTORE_CONFIRM=${restoreConfirmation}`)
  }
  const { receiptPath, receipt, siteId, versionName } = readRecoveryReceipt()
  const accessToken = accessTokenFromFederatedAdc()
  assertRestorableVersion(await fetchVersion(accessToken, versionName), versionName)
  const url = new URL(`${apiRoot}/sites/${siteId}/releases`)
  url.searchParams.set('versionName', versionName)
  const restored = await requestJson(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: `URAI exact Hosting recovery from workflow ${process.env.GITHUB_RUN_ID || 'unknown'}`,
    }),
  })
  if (restored?.version?.name !== versionName) throw new Error('Firebase Hosting restore response version does not match the recovery receipt')
  const resultPath = path.join(path.dirname(receiptPath), 'restore-result.json')
  writeFileSync(resultPath, `${JSON.stringify({ restoredAt: new Date().toISOString(), receipt, restored }, null, 2)}\n`, { mode: 0o600 })
  console.log(JSON.stringify({ ok: true, action: 'restore', versionName, releaseName: restored.name, resultPath }, null, 2))
  return { resultPath, restored }
}

export async function verifyRestoredVersion({ attempts = 12, delayMs = 1000 } = {}) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 60) throw new Error('Restore verification attempts must be between 1 and 60')
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 10_000) throw new Error('Restore verification delay must be between 0 and 10000 ms')

  const { receiptPath, receipt, siteId, versionName } = readRecoveryReceipt()
  const accessToken = accessTokenFromFederatedAdc()
  let observed = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const release = selectCurrentLiveRelease(await listAllReleases(accessToken, siteId), siteId)
    observed = release
    if (release.versionName === versionName) {
      const resultPath = path.join(path.dirname(receiptPath), 'restore-verification.json')
      const result = {
        schemaVersion: 'urai-firebase-hosting-restore-verification-2',
        verifiedAt: new Date().toISOString(),
        repository: process.env.GITHUB_REPOSITORY || canonicalRepository,
        workflowRunId: process.env.GITHUB_RUN_ID || null,
        authoritySha: process.env.GITHUB_SHA || null,
        siteId,
        expectedVersionName: versionName,
        observedReleaseName: release.name,
        observedVersionName: release.versionName,
        attemptsUsed: attempt,
        restored: true,
        authMode: 'wif',
        longLivedServiceAccountKeyUsed: false,
        sourceReceipt: receipt,
      }
      writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 })
      console.log(JSON.stringify({ ok: true, action: 'verify-restored', resultPath, ...result }, null, 2))
      return { resultPath, result }
    }
    if (attempt < attempts) await sleep(delayMs)
  }
  throw new Error(`Firebase Hosting restore verification failed: expected ${versionName}, observed ${observed?.versionName || 'none'}`)
}

export function selfTest() {
  const releases = [
    {
      name: 'sites/urai-4dc1d/channels/preview/releases/preview-newer',
      version: { name: 'sites/urai-4dc1d/versions/preview-v2' },
      releaseTime: '2026-07-14T18:00:00Z',
      type: 'DEPLOY',
    },
    {
      name: 'sites/urai-4dc1d/releases/live-disabled',
      version: { name: 'sites/urai-4dc1d/versions/disabled-v1' },
      releaseTime: '2026-07-14T17:00:00Z',
      type: 'SITE_DISABLE',
    },
    {
      name: 'sites/urai-4dc1d/releases/live-current',
      version: { name: 'sites/urai-4dc1d/versions/live-v1' },
      releaseTime: '2026-07-14T16:00:00Z',
      type: 'DEPLOY',
    },
  ]
  const selected = selectCurrentLiveRelease(releases)
  if (selected.name !== 'sites/urai-4dc1d/releases/live-current') throw new Error('Self-test selected the wrong live release')
  if (selected.versionName !== 'sites/urai-4dc1d/versions/live-v1') throw new Error('Self-test selected the wrong live version')
  const restorable = assertRestorableVersion({ name: selected.versionName, status: 'FINALIZED' }, selected.versionName)
  if (restorable.status !== 'FINALIZED') throw new Error('Self-test failed to accept a finalized recovery version')

  const receipt = {
    schemaVersion: 'urai-firebase-hosting-recovery-2',
    authMode: 'wif',
    credentialClass: 'github-oidc-wif',
    siteId: expectedSiteId,
    releaseName: 'sites/urai-4dc1d/releases/live-current',
    versionName: selected.versionName,
    versionStatus: 'FINALIZED',
  }
  const validated = validateRecoveryReceipt(receipt)
  if (validated.versionName !== selected.versionName) throw new Error('Self-test failed to validate WIF recovery receipt')

  let expiredRejected = false
  try {
    assertRestorableVersion({ name: selected.versionName, status: 'EXPIRED' }, selected.versionName)
  } catch {
    expiredRejected = true
  }
  if (!expiredRejected) throw new Error('Self-test failed to reject an expired recovery version')
  console.log(JSON.stringify({
    ok: true,
    action: 'self-test',
    selected: selected.name,
    versionName: selected.versionName,
    versionStatus: restorable.status,
    wifReceiptAccepted: true,
    expiredRejected: true,
  }, null, 2))
}

const invokedPath = path.resolve(process.argv[1] || '')
if (fileURLToPath(import.meta.url) === invokedPath) {
  const command = process.argv[2]
  if (command === '--self-test') selfTest()
  else if (command === 'discover') await discoverCurrentLiveRelease()
  else if (command === 'restore') await restoreDiscoveredVersion()
  else if (command === 'verify-restored') await verifyRestoredVersion()
  else throw new Error('Usage: firebase-hosting-recovery.mjs --self-test|discover|restore|verify-restored')
}
