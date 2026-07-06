#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const baseUrl = (process.env.URAI_DEPLOY_URL || '').trim().replace(/\/$/, '')
const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
const receiptPath = process.env.URAI_LIVE_RECEIPT_PATH || 'deployment-receipt/live-content-parity.json'

if (!baseUrl) throw new Error('URAI_DEPLOY_URL is required')
if (new URL(baseUrl).origin !== 'https://urai.app') throw new Error('Live certification is restricted to https://urai.app')
if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('URAI_EXPECTED_DEPLOYED_SHA must be a full lowercase SHA')

const contracts = [
  ['/', ['Own your life.', 'Ground', 'Life Map'], []],
  ['/home', ['Own your life.'], []],
  ['/ground', ['URAI GROUND', 'Your private floor is open.'], []],
  ['/life-map', ['Your memory constellation is online.'], []],
  ['/focus?memoryId=quiet-reset', ['Selected memory chamber', 'The Quiet Reset'], []],
  ['/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', ['Cinematic memory film', 'Replay the thread.'], []],
  ['/mirror', ['URAI Mirror', 'See the pattern clearly.'], []],
  ['/passport', ['URAI Passport', 'Your life stays yours.'], []],
  ['/privacy-controls', ['URAI Privacy Controls', 'Choose what the world can hold.'], ['Home threshold']],
  ['/status', ['URAI Status · Evidence Control Room', 'Production certification pending.'], ['World online. Route matrix visible.']],
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

const results = []
for (const [route, required, forbidden] of contracts) {
  for (const requested of variants(route)) {
    const startedAt = new Date().toISOString()
    try {
      const response = await fetch(requested, {
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
        headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-static-release-verifier/1.0' },
      })
      const html = await response.text()
      const finalUrl = new URL(response.url)
      const sha = deployedSha(response, html)
      const missing = required.filter((marker) => !html.includes(marker))
      const stale = forbidden.filter((marker) => html.includes(marker))
      const passed = response.ok
        && response.headers.get('content-type')?.toLowerCase().includes('text/html')
        && finalUrl.origin === new URL(baseUrl).origin
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

const passed = results.every((result) => result.passed)
const receipt = {
  schemaVersion: 'urai-live-content-parity-1',
  generatedAt: new Date().toISOString(),
  baseUrl,
  expectedDeployedSha: expectedSha,
  routeContracts: contracts.length,
  checkedVariants: results.length,
  passed,
  results,
}

mkdirSync(path.dirname(receiptPath), { recursive: true })
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
if (!passed) process.exitCode = 1
