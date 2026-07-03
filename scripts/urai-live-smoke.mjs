#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL
const requireLiveCommitSha = process.env.REQUIRE_LIVE_COMMIT_SHA === 'true'

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://your-hosting-url.web.app')
  process.exit(1)
}

const normalizedBase = baseUrl.replace(/\/$/, '')
const routes = [
  {
    route: '/',
    markers: [/Own your life\./i, /Step inside yourself\./i, /Ground below · memory above/i],
  },
  {
    route: '/home',
    markers: [/Home threshold/i, /Ground route/i, /Sky route/i, /Orb companion/i],
  },
  {
    route: '/ground',
    markers: [/Your private floor is open\./i, /Private operations floor/i, /Consent vault/i],
  },
  { route: '/ascent', markers: [/Ascent|Life Map|Portal/i, /URAI/i] },
  {
    route: '/life-map',
    markers: [/Inside your memory field\./i, /Thirty-four private stars/i, /Double click \/ Enter Focus/i],
  },
  {
    route: '/focus?memoryId=quiet-reset',
    markers: [/Selected memory chamber/i, /The Quiet Reset/i, /Enter Replay/i],
  },
  {
    route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
    markers: [/Cinematic memory film/i, /Replay the thread\./i, /Film beats/i],
  },
  { route: '/unwind', markers: [/Unwind|return/i, /URAI|Life Map/i] },
  {
    route: '/mirror',
    markers: [/See the pattern clearly\./i, /Mirror is the reflection realm/i, /Orb reflection/i],
  },
  {
    route: '/passport',
    markers: [/Your life stays yours\./i, /ownership vault/i, /private by default/i],
  },
  {
    route: '/privacy-controls',
    markers: [/URAI Privacy Controls/i, /Choose what the world can hold\./i, /Human approval before real-world action/i],
    forbidden: [/Home threshold/i, /Ground route Real-life world/i],
  },
  {
    route: '/location-map',
    markers: [/Emotional weather over private places\./i, /symbolic atlas/i, /Global emotional weather legend/i],
  },
  {
    route: '/spatial/ar-vr',
    markers: [/AR|VR|XR|Quest|spatial/i, /Life Map|device|browser|fallback/i],
  },
  {
    route: '/status',
    markers: [/World online\. Route matrix visible\./i, /Launch spine/i, /Trust and place/i],
  },
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

for (const { route, markers, forbidden = [] } of routes) {
  const url = `${normalizedBase}${route}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'urai-live-smoke/3.0',
        accept: 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    const body = await response.text()
    const hasExpectedContent = /<html|<body|__next|URAI|Urai|urai-spatial-deploy-proof/i.test(body)
    const stale = staleFallbackPatterns.find((pattern) => pattern.test(body))
    const missingMarker = markers.find((pattern) => !pattern.test(body))
    const forbiddenMarker = forbidden.find((pattern) => pattern.test(body))
    const liveCommitShaMissing =
      route === '/api/system/deploy-proof' &&
      requireLiveCommitSha &&
      /"commitSha"\s*:\s*"unknown"/i.test(body)

    if (!response.ok || !hasExpectedContent || stale || missingMarker || forbiddenMarker || liveCommitShaMissing) {
      failures.push(
        `${url} returned ${response.status} finalUrl=${response.url} expectedContent=${hasExpectedContent} ` +
          `stale=${stale?.source ?? 'no'} missing=${missingMarker?.source ?? 'none'} ` +
          `forbidden=${forbiddenMarker?.source ?? 'none'} liveCommitShaMissing=${liveCommitShaMissing}`,
      )
    } else {
      console.log(`OK ${response.status} ${url} -> ${response.url}`)
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

console.log(`URAI live smoke passed with route-specific fingerprints and deploy proof marker. requireLiveCommitSha=${requireLiveCommitSha}`)
