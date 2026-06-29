#!/usr/bin/env node
const baseUrl = (process.env.URAI_DEPLOY_URL || process.env.LIVE_URL || 'https://urai-4dc1d.web.app').replace(/\/$/, '')

const endpoints = [
  '/',
  '/home',
  '/spatial',
  '/spatial/ar-vr',
  '/api/system/urai-spatial-lock',
]

const results = []
const failures = []

for (const endpoint of endpoints) {
  const url = `${baseUrl}${endpoint}`
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'urai-home-xr-live-deploy-proof/1.0',
        accept: 'text/html,application/json,*/*;q=0.8',
      },
    })
    const body = await response.text()
    const hasUraiMarker = /urai|spatial|life map|xr|home/i.test(body)
    results.push({ endpoint, status: response.status, ok: response.ok, hasUraiMarker })
    if (!response.ok || !hasUraiMarker) {
      failures.push(`${url} status=${response.status} marker=${hasUraiMarker}`)
    }
  } catch (error) {
    failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error('[check-home-xr-live-deploy-proof] failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-home-xr-live-deploy-proof',
  baseUrl,
  results,
}, null, 2))
