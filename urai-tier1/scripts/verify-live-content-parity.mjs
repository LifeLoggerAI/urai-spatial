#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const canonicalBaseUrl = 'https://urai.app'
const baseUrl = (process.env.URAI_LIVE_BASE_URL || canonicalBaseUrl).trim()
const expectedSha = (process.env.URAI_EXPECTED_DEPLOYED_SHA || '').trim()
const receiptPath = resolve(
  process.cwd(),
  process.env.URAI_LIVE_RECEIPT_PATH || 'artifacts/live-content-parity.json',
)

const routeContracts = [
  { route: '/', markers: ['Own your life.', 'Ground', 'Life Map'] },
  { route: '/home', markers: ['Home threshold', 'Own your life.'] },
  { route: '/ground', markers: ['URAI GROUND', 'Your private floor is open.'] },
  { route: '/life-map', markers: ['URAI Spatial · Life Map', 'Your memory constellation is online.'] },
  { route: '/focus?memoryId=quiet-reset', markers: ['Selected memory chamber', 'The Quiet Reset'] },
  { route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', markers: ['Cinematic memory film', 'Replay the thread.'] },
  { route: '/mirror', markers: ['URAI Mirror', 'See the pattern clearly.'] },
  { route: '/passport', markers: ['URAI Passport', 'Your life stays yours.'] },
  {
    route: '/privacy-controls',
    markers: ['URAI Privacy Controls', 'Choose what the world can hold.'],
    forbiddenMarkers: ['Home threshold'],
  },
  {
    route: '/status',
    markers: ['URAI Status · Evidence Control Room', 'Production certification pending.'],
    forbiddenMarkers: ['World online. Route matrix visible.'],
  },
]

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizePathname(pathname) {
  if (pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function validateAuthority() {
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
    throw new Error('URAI_EXPECTED_DEPLOYED_SHA must be a full lowercase 40-character SHA.')
  }
  const parsed = new URL(baseUrl)
  if (parsed.origin !== canonicalBaseUrl || normalizePathname(parsed.pathname) !== '/' || parsed.search || parsed.hash) {
    throw new Error(`Live certification is restricted to ${canonicalBaseUrl}.`)
  }
}

function routeVariants(route) {
  const parsed = new URL(route, canonicalBaseUrl)
  if (parsed.pathname === '/') return [parsed]

  const withoutSlash = new URL(parsed)
  withoutSlash.pathname = withoutSlash.pathname.replace(/\/$/, '')
  const withSlash = new URL(withoutSlash)
  withSlash.pathname = `${withoutSlash.pathname}/`
  return [withoutSlash, withSlash]
}

function readShaEvidence(response, html) {
  const header = response.headers.get('x-urai-commit-sha') || response.headers.get('x-deployed-sha')
  const meta = html.match(/(?:data-deployed-sha|name=["']urai-deployed-sha["']\s+content)=["']([0-9a-f]{40})["']/i)?.[1]
  return (header || meta || '').trim()
}

async function inspectVariant(contract, url) {
  const startedAt = new Date().toISOString()
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'user-agent': 'urai-live-content-parity/2.0',
        accept: 'text/html,application/xhtml+xml',
        'cache-control': 'no-cache',
      },
    })
    const html = await response.text()
    const finalUrl = new URL(response.url)
    const contentType = response.headers.get('content-type') || ''
    const missingMarkers = contract.markers.filter((marker) => !html.includes(marker))
    const forbiddenMarkers = (contract.forbiddenMarkers || []).filter((marker) => html.includes(marker))
    const deployedSha = readShaEvidence(response, html)
    const sameOrigin = finalUrl.origin === canonicalBaseUrl
    const pathPreserved = normalizePathname(finalUrl.pathname) === normalizePathname(url.pathname)
    const queryPreserved = finalUrl.search === url.search
    const htmlResponse = contentType.toLowerCase().includes('text/html')
    const shaMatches = deployedSha === expectedSha
    const passed =
      response.ok &&
      sameOrigin &&
      pathPreserved &&
      queryPreserved &&
      htmlResponse &&
      missingMarkers.length === 0 &&
      forbiddenMarkers.length === 0 &&
      shaMatches

    return {
      requestedUrl: url.toString(),
      finalUrl: response.url,
      status: response.status,
      contentType,
      startedAt,
      completedAt: new Date().toISOString(),
      contentSha256: sha256(html),
      bytes: Buffer.byteLength(html),
      requiredMarkers: contract.markers,
      missingMarkers,
      forbiddenMarkers,
      sameOrigin,
      pathPreserved,
      queryPreserved,
      htmlResponse,
      deployedSha: deployedSha || null,
      expectedSha,
      shaMatches,
      passed,
    }
  } catch (error) {
    return {
      requestedUrl: url.toString(),
      startedAt,
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      expectedSha,
      passed: false,
    }
  }
}

async function main() {
  validateAuthority()

  const routeResults = []
  for (const contract of routeContracts) {
    const variants = []
    for (const url of routeVariants(contract.route)) {
      variants.push(await inspectVariant(contract, url))
    }
    routeResults.push({ route: contract.route, variants, passed: variants.every((item) => item.passed) })
  }

  const passed = routeResults.every((item) => item.passed)
  const receipt = {
    schemaVersion: 'urai-live-content-parity-2',
    generatedAt: new Date().toISOString(),
    classification: passed ? 'VERIFIED LIVE' : 'BLOCKED',
    baseUrl: canonicalBaseUrl,
    expectedDeployedSha: expectedSha,
    exactShaRequired: true,
    routeCount: routeResults.length,
    variantCount: routeResults.reduce((sum, item) => sum + item.variants.length, 0),
    passed,
    routes: routeResults,
    caveat: passed
      ? 'Canonical content, origin, path, query, HTML, and deployed-SHA parity passed.'
      : 'One or more canonical content, redirect, query, HTML, or deployed-SHA checks failed.',
  }

  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(receipt, null, 2))

  if (!passed) process.exitCode = 1
}

await main()
