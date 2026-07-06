#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const canonicalOrigin = 'https://urai.app'
const expectedSha = process.env.URAI_EXPECTED_DEPLOYED_SHA || ''
const receiptPath = resolve(process.cwd(), process.env.URAI_LIVE_RECEIPT_PATH || 'artifacts/live-content-parity.json')
const contracts = [
  { route: '/', markers: ['Own your life.'] },
  { route: '/home', markers: ['Home threshold', 'Own your life.'] },
  { route: '/ground', markers: ['Your private floor is open.'] },
  { route: '/life-map', markers: ['Your memory constellation is online.'] },
  { route: '/focus?memoryId=quiet-reset', markers: ['Selected memory chamber', 'The Quiet Reset'] },
  { route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', markers: ['Cinematic memory film', 'Replay the thread.'] },
  { route: '/mirror', markers: ['URAI Mirror'] },
  { route: '/passport', markers: ['URAI Passport'] },
  { route: '/privacy-controls', markers: ['URAI Privacy Controls', 'Choose what the world can hold.'], forbidden: ['Home threshold'] },
  { route: '/status', markers: ['URAI Status · Evidence Control Room', 'Production certification pending.'], forbidden: ['World online. Route matrix visible.'] },
]

if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('Expected deployed SHA must be a full lowercase commit SHA')

function normalizedPath(pathname) {
  return pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
}

function variants(route) {
  const source = new URL(route, canonicalOrigin)
  if (source.pathname === '/') return [source]
  const withoutSlash = new URL(source)
  withoutSlash.pathname = withoutSlash.pathname.replace(/\/$/, '')
  const withSlash = new URL(withoutSlash)
  withSlash.pathname = `${withoutSlash.pathname}/`
  return [withoutSlash, withSlash]
}

function embeddedSha(response, html) {
  const marker = html.match(/data-deployed-sha=["']([0-9a-f]{40})["']/i)
  const meta = html.match(/name=["']urai-deployed-sha["'][^>]*content=["']([0-9a-f]{40})["']/i)
  return response.headers.get('x-urai-commit-sha') || response.headers.get('x-deployed-sha') || marker?.[1] || meta?.[1] || null
}

const results = []
for (const contract of contracts) {
  for (const requested of variants(contract.route)) {
    const response = await fetch(requested, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-live-parity/4' },
    })
    const html = await response.text()
    const finalUrl = new URL(response.url)
    const deployedSha = embeddedSha(response, html)
    const missingMarkers = contract.markers.filter((marker) => !html.includes(marker))
    const forbiddenMarkers = (contract.forbidden || []).filter((marker) => html.includes(marker))
    const originPreserved = finalUrl.origin === canonicalOrigin
    const pathPreserved = normalizedPath(finalUrl.pathname) === normalizedPath(requested.pathname)
    const queryPreserved = finalUrl.search === requested.search
    const htmlResponse = (response.headers.get('content-type') || '').toLowerCase().includes('text/html')
    const passed = response.ok && originPreserved && pathPreserved && queryPreserved && htmlResponse && missingMarkers.length === 0 && forbiddenMarkers.length === 0 && deployedSha === expectedSha
    results.push({
      route: contract.route,
      requestedUrl: requested.toString(),
      finalUrl: response.url,
      status: response.status,
      deployedSha,
      missingMarkers,
      forbiddenMarkers,
      originPreserved,
      pathPreserved,
      queryPreserved,
      htmlResponse,
      passed,
    })
  }
}

const passed = results.every((result) => result.passed)
const receipt = {
  schemaVersion: 'urai-live-content-parity-4',
  generatedAt: new Date().toISOString(),
  classification: passed ? 'VERIFIED LIVE' : 'BLOCKED',
  canonicalOrigin,
  expectedDeployedSha: expectedSha,
  exactShaRequired: true,
  results,
  passed,
}
await mkdir(dirname(receiptPath), { recursive: true })
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(receipt, null, 2))
if (!passed) process.exitCode = 1
