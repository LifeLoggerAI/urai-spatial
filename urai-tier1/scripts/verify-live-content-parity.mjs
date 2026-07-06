#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const baseUrl = 'https://urai.app'
const expectedSha = process.env.URAI_EXPECTED_DEPLOYED_SHA || ''
const receiptPath = resolve(process.cwd(), process.env.URAI_LIVE_RECEIPT_PATH || 'artifacts/live-content-parity.json')
const contracts = [
  ['/', ['Own your life.']],
  ['/ground/', ['Your private floor is open.']],
  ['/life-map/', ['Your memory constellation is online.']],
  ['/focus/?memoryId=quiet-reset', ['Selected memory chamber', 'The Quiet Reset']],
  ['/replay/?memoryId=quiet-reset&manifestId=replay-recovery-thread', ['Cinematic memory film']],
  ['/mirror/', ['URAI Mirror']],
  ['/passport/', ['URAI Passport']],
  ['/privacy-controls/', ['URAI Privacy Controls', 'Choose what the world can hold.']],
  ['/status/', ['URAI Status · Evidence Control Room', 'Production certification pending.']],
]

if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('Expected deployed SHA must be a full lowercase commit SHA')

const results = []
for (const [route, markers] of contracts) {
  const response = await fetch(`${baseUrl}${route}`, {
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
    headers: { 'cache-control': 'no-cache', 'user-agent': 'urai-live-parity/3' },
  })
  const html = await response.text()
  const markerMatch = html.match(/data-deployed-sha=["']([0-9a-f]{40})["']/i)
  const metaMatch = html.match(/name=["']urai-deployed-sha["'][^>]*content=["']([0-9a-f]{40})["']/i)
  const deployedSha = response.headers.get('x-urai-commit-sha') || response.headers.get('x-deployed-sha') || markerMatch?.[1] || metaMatch?.[1] || null
  const missingMarkers = markers.filter((marker) => !html.includes(marker))
  const passed = response.ok && response.url.startsWith(baseUrl) && missingMarkers.length === 0 && deployedSha === expectedSha
  results.push({ route, status: response.status, finalUrl: response.url, deployedSha, missingMarkers, passed })
}

const passed = results.every((result) => result.passed)
const receipt = {
  schemaVersion: 'urai-live-content-parity-3',
  generatedAt: new Date().toISOString(),
  classification: passed ? 'VERIFIED LIVE' : 'BLOCKED',
  expectedDeployedSha: expectedSha,
  results,
  passed,
}
await mkdir(dirname(receiptPath), { recursive: true })
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(receipt, null, 2))
if (!passed) process.exitCode = 1
