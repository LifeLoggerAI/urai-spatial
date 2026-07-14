#!/usr/bin/env node

import { createSign } from 'node:crypto'
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
const hostingScope = 'https://www.googleapis.com/auth/firebase.hosting'
const expectedSiteId = 'urai-4dc1d'
const restoreConfirmation = 'RESTORE_EXACT_HOSTING_VERSION'
const managedCredentialFilename = 'urai-firebase-service-account.json'

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

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function createServiceAccountAssertion(serviceAccount, nowSeconds = Math.floor(Date.now() / 1000)) {
  const clientEmail = requireString('service account client_email', serviceAccount?.client_email)
  const privateKey = requireString('service account private_key', serviceAccount?.private_key)
  const tokenUri = requireString('service account token_uri', serviceAccount?.token_uri)
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' })
  const claims = base64UrlJson({
    iss: clientEmail,
    scope: hostingScope,
    aud: tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  })
  const unsigned = `${header}.${claims}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  return {
    assertion: `${unsigned}.${signer.sign(privateKey).toString('base64url')}`,
    tokenUri,
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

async function accessTokenFromServiceAccount(serviceAccount) {
  const { assertion, tokenUri } = createServiceAccountAssertion(serviceAccount)
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const token = await requestJson(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  return requireString('OAuth access_token', token.access_token)
}

function parseServiceAccount(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Firebase service-account material must contain valid JSON')
  }
  if (parsed.project_id !== expectedSiteId) {
    throw new Error(`Service-account project mismatch: ${parsed.project_id || 'missing'}`)
  }
  return parsed
}

function managedCredentialPath() {
  const runnerTemp = resolveRunnerTemp()
  const requested = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()
    || path.join(runnerTemp, managedCredentialFilename)
  const resolved = assertPathInsideRunnerTemp('Managed Firebase credential path', requested)
  if (path.basename(resolved) !== managedCredentialFilename) {
    throw new Error(`Managed Firebase credential path must use ${managedCredentialFilename}`)
  }
  return resolved
}

function serviceAccountFromEnvironment() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim()
  if (raw) return parseServiceAccount(raw)

  const credentialPath = managedCredentialPath()
  if (!existsSync(credentialPath)) {
    throw new Error(`Managed Firebase credential file is missing: ${credentialPath}`)
  }
  const stats = lstatSync(credentialPath)
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error('Managed Firebase credential must be a regular non-symlinked file')
  }
  return parseServiceAccount(readFileSync(credentialPath, 'utf8'))
}

function resolveReceiptPath() {
  const runnerTemp = resolveRunnerTemp()
  const requested = process.env.URAI_HOSTING_RECOVERY_RECEIPT?.trim()
    || path.join(runnerTemp, 'hosting-recovery', 'legacy-live-release.json')
  return assertPathInsideRunnerTemp('Hosting recovery receipt', requested)
}

function readRecoveryReceipt() {
  const receiptPath = resolveReceiptPath()
  if (!existsSync(receiptPath)) throw new Error(`Hosting recovery receipt is missing: ${receiptPath}`)
  const stats = lstatSync(receiptPath)
  if (!stats.isFile() || stats.isSymbolicLink()) throw new Error('Hosting recovery receipt must be a regular non-symlinked file')
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
  if (receipt.schemaVersion !== 'urai-firebase-hosting-recovery-1') throw new Error('Unsupported Hosting recovery receipt schema')
  const siteId = assertSiteId(receipt.siteId)
  const versionName = assertVersionName(receipt.versionName, siteId)
  if (!new RegExp(`^sites/${escapeRegExp(siteId)}/releases/[^/]+$`).test(String(receipt.releaseName || ''))) {
    throw new Error('Recovery receipt does not identify a live-channel release')
  }
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

async function currentLiveRelease(serviceAccount, siteId) {
  const accessToken = await accessTokenFromServiceAccount(serviceAccount)
  const release = selectCurrentLiveRelease(await listAllReleases(accessToken, siteId), siteId)
  return { accessToken, release }
}

export async function discoverCurrentLiveRelease() {
  const siteId = assertSiteId(process.env.FIREBASE_SITE_ID || expectedSiteId)
  const serviceAccount = serviceAccountFromEnvironment()
  const { release } = await currentLiveRelease(serviceAccount, siteId)
  const receiptPath = resolveReceiptPath()
  mkdirSync(path.dirname(receiptPath), { recursive: true })
  const receipt = {
    schemaVersion: 'urai-firebase-hosting-recovery-1',
    discoveredAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-spatial',
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    authoritySha: process.env.GITHUB_SHA || null,
    siteId,
    releaseName: release.name,
    versionName: release.versionName,
    releaseTime: release.releaseTime,
    releaseType: release.type || 'TYPE_UNSPECIFIED',
    sourceApi: 'firebasehosting.googleapis.com/v1beta1/sites.releases.list',
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
  const serviceAccount = serviceAccountFromEnvironment()
  const accessToken = await accessTokenFromServiceAccount(serviceAccount)
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
  const serviceAccount = serviceAccountFromEnvironment()
  let observed = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { release } = await currentLiveRelease(serviceAccount, siteId)
    observed = release
    if (release.versionName === versionName) {
      const resultPath = path.join(path.dirname(receiptPath), 'restore-verification.json')
      const result = {
        schemaVersion: 'urai-firebase-hosting-restore-verification-1',
        verifiedAt: new Date().toISOString(),
        repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-spatial',
        workflowRunId: process.env.GITHUB_RUN_ID || null,
        authoritySha: process.env.GITHUB_SHA || null,
        siteId,
        expectedVersionName: versionName,
        observedReleaseName: release.name,
        observedVersionName: release.versionName,
        attemptsUsed: attempt,
        restored: true,
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
  console.log(JSON.stringify({ ok: true, action: 'self-test', selected: selected.name, versionName: selected.versionName }, null, 2))
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
