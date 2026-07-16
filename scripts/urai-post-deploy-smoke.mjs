#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const baseUrl = (process.env.URAI_DEPLOY_URL || '').trim().replace(/\/$/, '')
const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
const expectedRollbackSha = (process.env.URAI_EXPECTED_ROLLBACK_SHA || process.env.ROLLBACK_SHA || '').trim()
const expectedAuthoritySha = (process.env.URAI_EXPECTED_AUTHORITY_SHA || process.env.CURRENT_MAIN_SHA || '').trim()
const receiptPath = process.env.URAI_LIVE_RECEIPT_PATH || 'deployment-receipt/live-content-parity.json'

if (!baseUrl) throw new Error('URAI_DEPLOY_URL is required')
const canonicalOrigin = new URL(baseUrl).origin
if (canonicalOrigin !== 'https://urai.app') throw new Error('Live certification is restricted to https://urai.app')
if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('URAI_EXPECTED_DEPLOYED_SHA must be a full lowercase SHA')
if (!/^[0-9a-f]{40}$/.test(expectedRollbackSha)) throw new Error('URAI_EXPECTED_ROLLBACK_SHA must be a full lowercase SHA')
if (!/^[0-9a-f]{40}$/.test(expectedAuthoritySha)) throw new Error('URAI_EXPECTED_AUTHORITY_SHA or CURRENT_MAIN_SHA must be a full lowercase SHA')
if (expectedRollbackSha === expectedSha) throw new Error('Rollback SHA must be distinct from deployed SHA')

const contracts = [
  ['/', ['aaa-final-home-sky-ground-orb-body-portals', 'Own your life.', 'Ground', 'Life Map'], []],
  ['/home', ['aaa-final-home-sky-ground-orb-body-portals', 'Own your life.'], []],
  ['/ground', ['walkable-first-person-ground-layer', 'Your private workforce.', 'Six chambers active · private by default'], ['Street-level city world']],
  ['/life-map', ['urai-r3f-canonical-lifemap', 'URAI canonical spatial Life Map'], []],
  ['/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', ['urai-final-focus-chamber', 'Selected memory chamber.'], ['Focus loading']],
  ['/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', ['replay-route-launch-fingerprint', 'Replay the thread. Film beats. Cinematic memory camera film.'], []],
  ['/mirror', ['urai-final-mirror-realm', 'See the pattern clearly.'], []],
  ['/passport', ['urai-final-passport-vault', 'Your life stays yours.'], []],
  ['/privacy-controls', ['privacy-consent-console', 'Choose what the world can hold.'], ['Home threshold']],
  ['/location-map', ['premium-emotional-weather-atlas'], []],
  ['/status', ['urai-final-status-control-room', 'Launch locked. Proof before expansion.', 'Pending proof'], ['World online. Route matrix visible.']],
]

function normalizePath(value) {
  return value === '/' ? '/' : value.replace(/\/+$/, '') || '/'
}

function variants(route) {
  const original = new URL(route, baseUrl)
  if (original.pathname === '/') return [original]
  const withoutSlash = new URL(original)
  withoutSlash.pathname = normalizePath(withoutSlash.pathname)
  const withSlash = new URL(withoutSlash)
  withSlash.pathname = `${withoutSlash.pathname}/`
  return [withoutSlash, withSlash]
}

function deployedSha(response, html) {
  const header = response.headers.get('x-urai-commit-sha') || response.headers.get('x-deployed-sha')
  const bodyMarker = html.match(/data-deployed-sha=["']([0-9a-f]{40})["']/i)?.[1]
  const metaMarker = html.match(/name=["']urai-deployed-sha["'][^>]*content=["']([0-9a-f]{40})["']/i)?.[1]
  return (header || bodyMarker || metaMarker || '').trim()
}

async function fetchFingerprint() {
  const url = new URL('/release-fingerprint.json', `${baseUrl}/`)
  const response = await fetch(url, {
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
    headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-static-release-verifier/2.2' },
  })
  const finalUrl = new URL(response.url)
  const text = await response.text()
  let payload = null
  try { payload = JSON.parse(text) } catch {}
  const passed = response.ok
    && response.headers.get('content-type')?.toLowerCase().includes('application/json')
    && finalUrl.origin === canonicalOrigin
    && normalizePath(finalUrl.pathname) === '/release-fingerprint.json'
    && finalUrl.search === ''
    && payload?.schemaVersion === 'urai-release-fingerprint-1'
    && payload?.releaseSha === expectedSha
    && payload?.rollbackSha === expectedRollbackSha
    && payload?.authoritySha === expectedAuthoritySha
    && payload?.firebaseProject === 'urai-4dc1d'
    && payload?.liveUrl === 'https://urai.app'
    && payload?.deploymentScope === 'hosting-only'
  return {
    requestedUrl: url.toString(),
    finalUrl: response.url,
    status: response.status,
    contentSha256: createHash('sha256').update(text).digest('hex'),
    payload,
    passed,
  }
}

const results = []
for (const [route, required, forbidden] of contracts) {
  for (const requested of variants(route)) {
    const startedAt = new Date().toISOString()
    try {
      const response = await fetch(requested, {
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
        headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-static-release-verifier/2.2' },
      })
      const html = await response.text()
      const finalUrl = new URL(response.url)
      const sha = deployedSha(response, html)
      const missing = required.filter((marker) => !html.includes(marker))
      const stale = forbidden.filter((marker) => html.includes(marker))
      const passed = response.ok
        && response.headers.get('content-type')?.toLowerCase().includes('text/html')
        && finalUrl.origin === canonicalOrigin
        && normalizePath(finalUrl.pathname) === normalizePath(requested.pathname)
        && finalUrl.search === requested.search
        && sha === expectedSha
        && missing.length === 0
        && stale.length === 0

      results.push({
        route,
        requestedUrl: requested.toString(),
        finalUrl: response.url,
        status: response.status,
        startedAt,
        completedAt: new Date().toISOString(),
        contentSha256: createHash('sha256').update(html).digest('hex'),
        bytes: Buffer.byteLength(html),
        deployedSha: sha || null,
        expectedSha,
        missingMarkers: missing,
        forbiddenMarkers: stale,
        passed,
      })
    } catch (error) {
      results.push({
        route,
        requestedUrl: requested.toString(),
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        expectedSha,
        passed: false,
      })
    }
  }
}

let fingerprint
try {
  fingerprint = await fetchFingerprint()
} catch (error) {
  fingerprint = { error: error instanceof Error ? error.message : String(error), passed: false }
}

const passed = results.every((result) => result.passed) && fingerprint.passed
const receipt = {
  schemaVersion: 'urai-live-content-parity-3',
  generatedAt: new Date().toISOString(),
  baseUrl,
  expectedDeployedSha: expectedSha,
  expectedRollbackSha,
  expectedAuthoritySha,
  routeContracts: contracts.length,
  checkedVariants: results.length,
  hydratedIdentityProof: 'scripts/urai-release-control-smoke.mjs',
  fingerprint,
  passed,
  results,
}

mkdirSync(path.dirname(receiptPath), { recursive: true })
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
if (!passed) process.exitCode = 1
