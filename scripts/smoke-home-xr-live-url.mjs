#!/usr/bin/env node
const baseUrl = (process.env.URAI_DEPLOY_URL || process.env.LIVE_URL || 'https://urai-4dc1d.web.app').replace(/\/$/, '')

const checks = [
  { route: '/', markers: [/URAI|Urai/i] },
  { route: '/home', markers: [/URAI|Urai|Life Map|Home/i] },
  { route: '/spatial', markers: [/URAI|Urai|Spatial|Life Map/i] },
  { route: '/spatial/v1', markers: [/URAI|Urai|Spatial|World|Life Map/i] },
  { route: '/spatial/ar-vr', markers: [/URAI|Urai|XR|AR|VR|Spatial|fallback/i] },
  { route: '/api/system/urai-spatial-lock', markers: [/urai|spatial|lock|ok/i] },
  { route: '/api/system/urai-spatial-3d-world', markers: [/urai|spatial|world|ok/i] },
]

const failures = []

for (const check of checks) {
  const url = `${baseUrl}${check.route}`
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'urai-spatial-live-smoke/1.0',
        accept: 'text/html,application/json,*/*;q=0.8',
      },
    })
    const body = await response.text()
    const missingMarker = check.markers.find((marker) => !marker.test(body))
    if (!response.ok || missingMarker) {
      failures.push(`${url} status=${response.status} missing=${missingMarker?.source || 'none'}`)
      continue
    }
    console.log(`OK ${response.status} ${url}`)
  } catch (error) {
    failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error('[smoke:home-xr:live] failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-spatial-live-smoke',
  baseUrl,
  checkedRoutes: checks.length,
}, null, 2))
