#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://your-hosting-url.web.app')
  process.exit(1)
}

const normalizedBase = baseUrl.replace(/\/$/, '')
const routes = [
  { route: '/', markers: [/URAI/i, /Life Map|Step inside|Own your life/i] },
  { route: '/home', markers: [/URAI/i, /Life Map|Step inside|Own your life/i] },
  { route: '/ascent', markers: [/Ascent|Life Map|Portal/i, /URAI/i] },
  { route: '/life-map', markers: [/Life Map/i, /Focus|constellation|memory/i] },
  { route: '/focus?memoryId=quiet-reset', markers: [/URAI Focus|Focus/i, /memory|Replay|quiet/i] },
  { route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', markers: [/URAI Replay|Replay/i, /memory|Pause|Restart|cinematic/i] },
  { route: '/unwind', markers: [/Unwind|return/i, /URAI|Life Map/i] },
  { route: '/mirror', markers: [/Mirror/i, /Life Map|Focus|Replay/i] },
  { route: '/passport', markers: [/Passport/i, /Privacy|Life Map|identity/i] },
  { route: '/status', markers: [/Status/i, /Life Map|Home|Routes/i] },
  { route: '/privacy-controls', markers: [/Privacy|Choose what the world can hold/i, /Passport|Life Map/i] },
]

const staleFallbackPatterns = [
  /Opening your spatial field/i,
  /Preparing the scene/i,
  /bullshit|prototype|placeholder/i,
]

const failures = []

for (const { route, markers } of routes) {
  const url = `${normalizedBase}${route}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'urai-live-smoke/2.0',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const body = await response.text()
    const hasHtml = /<html|<body|__next|URAI|Urai/i.test(body)
    const stale = staleFallbackPatterns.find((pattern) => pattern.test(body))
    const missingMarker = markers.find((pattern) => !pattern.test(body))

    if (!response.ok || !hasHtml || stale || missingMarker) {
      failures.push(`${url} returned ${response.status} html=${hasHtml} stale=${stale?.source ?? 'no'} missing=${missingMarker?.source ?? 'none'}`)
    } else {
      console.log(`OK ${response.status} ${url}`)
    }
  } catch (error) {
    failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error('URAI live smoke failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('URAI live smoke passed.')
