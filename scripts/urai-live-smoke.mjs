#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL
const requireLiveCommitSha = process.env.REQUIRE_LIVE_COMMIT_SHA === 'true'

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://your-hosting-url.web.app')
  process.exit(1)
}

const normalizedBase = baseUrl.replace(/\/$/, '')
const routes = [
  { route: '/', markers: [/URAI/i, /Life Map|Step inside|Own your life/i] },
  { route: '/home', markers: [/URAI/i, /Life Map|Step inside|Own your life/i] },
  { route: '/ground', markers: [/Ground|real-life|operating/i, /Privacy|Schedule|Wellness|Life Map/i] },
  { route: '/ascent', markers: [/Ascent|Life Map|Portal/i, /URAI/i] },
  { route: '/life-map', markers: [/Life Map/i, /Focus|constellation|memory/i] },
  { route: '/focus?memoryId=quiet-reset', markers: [/URAI Focus|Focus/i, /memory|Replay|quiet/i] },
  { route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', markers: [/URAI Replay|Replay/i, /memory|Pause|Restart|cinematic/i] },
  { route: '/unwind', markers: [/Unwind|return/i, /URAI|Life Map/i] },
  { route: '/mirror', markers: [/Mirror/i, /Life Map|Focus|Replay/i] },
  { route: '/passport', markers: [/Passport/i, /Privacy|Life Map|identity/i] },
  { route: '/privacy-controls', markers: [/Privacy|Choose what the world can hold/i, /Passport|Life Map/i] },
  { route: '/location-map', markers: [/Location|Places|atlas|map/i, /Life Map|Home|place/i] },
  { route: '/status', markers: [/Status/i, /Life Map|Home|Routes/i] },
  {
    route: '/api/system/deploy-proof',
    markers: [
      /urai-spatial-deploy-proof/i,
      /urai-spatial-public-surface-2026-06-29-homeworldproduction/i,
      /urai-spatial-deploy-proof-v2-2026-06-30/i,
      /commitShaKnown/i,
    ],
  },
]

const staleFallbackPatterns = [
  /Launch build is compiling successfully/i,
  /Full app deployment is being finalized/i,
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
        'user-agent': 'urai-live-smoke/2.3',
        accept: 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const body = await response.text()
    const hasExpectedContent = /<html|<body|__next|URAI|Urai|urai-spatial-deploy-proof/i.test(body)
    const stale = staleFallbackPatterns.find((pattern) => pattern.test(body))
    const missingMarker = markers.find((pattern) => !pattern.test(body))
    const liveCommitShaMissing =
      route === '/api/system/deploy-proof' &&
      requireLiveCommitSha &&
      /"commitSha"\s*:\s*"unknown"/i.test(body)

    if (!response.ok || !hasExpectedContent || stale || missingMarker || liveCommitShaMissing) {
      failures.push(`${url} returned ${response.status} expectedContent=${hasExpectedContent} stale=${stale?.source ?? 'no'} missing=${missingMarker?.source ?? 'none'} liveCommitShaMissing=${liveCommitShaMissing}`)
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

console.log(`URAI live smoke passed with deploy proof marker. requireLiveCommitSha=${requireLiveCommitSha}`)
