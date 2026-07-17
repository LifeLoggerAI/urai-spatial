#!/usr/bin/env node

const expectedSha = process.env.URAI_EXPECTED_LIVE_SHA || process.env.GITHUB_SHA || ''
const hosts = ['https://urai.app', 'https://www.urai.app']
const routePaths = ['/', '/home', '/home/', '/ground', '/life-map', '/focus?memoryId=quiet-reset', '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread']
const forbidden = [
  /Source:\s*demo\s*\/\s*focused/i,
  /Build with us/i,
  /Help us tune the Life Movie/i,
  /Help us tune URAI/i,
  /We (?:are |['’]re )?shipping daily/i,
  /Feedback capture is paused because Firebase (?:isn['’]t|is not) configured/i,
  /Bug intake is paused here/i,
  /Genesis home preview/i,
  /Launch safety:\s*Home is a launch demo/i,
]

const requiredByRoute = new Map([
  ['/', [/Own your life\./i, /Step inside yourself\./i]],
  ['/home', [/Own your life\./i, /Step inside yourself\./i]],
  ['/ground', [/private workforce|reception|archive|ground/i]],
  ['/life-map', [/memory field|private stars|enter focus|life map/i]],
  ['/focus', [/selected memory chamber|quiet reset|enter replay/i]],
  ['/replay', [/replay|memory|film|thread/i]],
])

const normalizePath = (value) => {
  const normalized = value.replace(/\/+$/, '')
  return normalized || '/'
}

const failures = []
const receipts = []

for (const host of hosts) {
  for (const routePath of routePaths) {
    const requested = new URL(routePath, host)
    try {
      const response = await fetch(requested, {
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
        headers: {
          accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'user-agent': 'urai-production-host-parity/1.0',
        },
      })
      const body = await response.text()
      const finalUrl = new URL(response.url)
      const routeKey = normalizePath(requested.pathname)
      const canonicalKey = routeKey.startsWith('/focus') ? '/focus' : routeKey.startsWith('/replay') ? '/replay' : routeKey
      const missing = (requiredByRoute.get(canonicalKey) || []).filter((pattern) => !pattern.test(body))
      const legacy = forbidden.filter((pattern) => pattern.test(body))
      const pathMismatch = normalizePath(finalUrl.pathname) !== normalizePath(requested.pathname)
      const queryMismatch = [...requested.searchParams].filter(([key, value]) => finalUrl.searchParams.get(key) !== value)
      const embeddedSha = expectedSha ? body.includes(expectedSha) : false

      const receipt = {
        requestedUrl: requested.toString(),
        finalUrl: finalUrl.toString(),
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        cacheControl: response.headers.get('cache-control'),
        etag: response.headers.get('etag'),
        pathMismatch,
        queryMismatch,
        missingMarkers: missing.map((pattern) => pattern.source),
        forbiddenLegacyMarkers: legacy.map((pattern) => pattern.source),
        expectedSha: expectedSha || null,
        expectedShaEmbedded: expectedSha ? embeddedSha : null,
      }
      receipts.push(receipt)

      if (!response.ok || pathMismatch || queryMismatch.length || missing.length || legacy.length || (expectedSha && !embeddedSha)) {
        failures.push(JSON.stringify(receipt))
      }
    } catch (error) {
      const receipt = {
        requestedUrl: requested.toString(),
        error: error instanceof Error ? error.message : String(error),
      }
      receipts.push(receipt)
      failures.push(JSON.stringify(receipt))
    }
  }
}

const apexHome = receipts.find((item) => item.requestedUrl === 'https://urai.app/home')
const wwwHome = receipts.find((item) => item.requestedUrl === 'https://www.urai.app/home')
if (apexHome && wwwHome) {
  for (const key of ['status', 'expectedShaEmbedded']) {
    if (apexHome[key] !== wwwHome[key]) {
      failures.push(`Host parity mismatch for ${key}: apex=${apexHome[key]} www=${wwwHome[key]}`)
    }
  }
}

console.log(JSON.stringify({
  schemaVersion: 'urai-production-host-parity-1',
  checkedAt: new Date().toISOString(),
  expectedSha: expectedSha || null,
  hosts,
  routePaths,
  receipts,
  failures,
}, null, 2))

if (failures.length) {
  console.error(`URAI production host parity failed with ${failures.length} failure(s).`)
  process.exit(1)
}

console.log('URAI production host parity passed for apex and www hosts.')
