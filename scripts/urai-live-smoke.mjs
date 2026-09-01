#!/usr/bin/env node
const baseUrl = process.env.URAI_DEPLOY_URL
const requireLiveCommitSha = process.env.REQUIRE_LIVE_COMMIT_SHA === 'true'
const requireCustomDomain = process.env.REQUIRE_CUSTOM_DOMAIN === 'true'

if (!baseUrl) {
  console.error('URAI_DEPLOY_URL is required, for example https://urai.app')
  process.exit(1)
}

const normalizedBase = baseUrl.replace(/\/$/, '')
const parsedBase = new URL(normalizedBase)

if (requireCustomDomain && !['urai.app', 'www.urai.app'].includes(parsedBase.hostname)) {
  console.error(`REQUIRE_CUSTOM_DOMAIN=true requires urai.app or www.urai.app, received ${parsedBase.hostname}`)
  process.exit(1)
}

const routes = [
  {
    paths: ['/'],
    markers: [/Own your life\./i, /Step inside yourself\./i, /Ground below · memory above/i],
  },
  {
    paths: ['/home', '/home/'],
    markers: [/Home threshold|Own your life|Step inside yourself|URAI/i, /Sky route|Orb companion|memory|life/i],
  },
  {
    paths: ['/ground', '/ground/'],
    markers: [/Ground|private|operations|consent|URAI/i],
  },
  { paths: ['/ascent', '/ascent/'], markers: [/Ascent|Life Map|Portal/i, /URAI/i] },
  {
    paths: ['/life-map', '/life-map/'],
    markers: [/DISCLOSED SAMPLE · NOT YOUR MEMORIES/i, /No private memory data is mounted/i, /Open disclosed sample/i],
  },
  {
    paths: ['/focus?memoryId=quiet-reset', '/focus/?memoryId=quiet-reset'],
    markers: [/Selected memory chamber/i, /Opening selected memory|Memory unavailable|Neutral observatory/i, /Return to Life Map/i],
  },
  {
    paths: [
      '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread',
      '/replay/?memoryId=quiet-reset&manifestId=replay-recovery-thread',
    ],
    markers: [/Replay|memory|thread|film|URAI/i],
  },
  { paths: ['/unwind', '/unwind/'], markers: [/Unwind|return/i, /URAI|Life Map/i] },
  {
    paths: ['/mirror', '/mirror/'],
    markers: [/See the pattern clearly\./i, /Mirror is the reflection realm/i, /Orb reflection/i],
  },
  {
    paths: ['/passport', '/passport/'],
    markers: [/URAI PASSPORT/i, /Your life remains in your possession\./i, /Ownership services are not configured|Sign in to open your private Ownership Vault|Owner-scoped records loaded/i],
  },
  {
    paths: ['/privacy-controls', '/privacy-controls/'],
    markers: [/URAI CONSENT SANCTUARY/i, /Choose what the world may hold\./i, /permission service is not configured|Sign in to inspect or change private consent state|Enforcement/i],
    forbidden: [/Home threshold/i, /Ground route Real-life world/i],
  },
  {
    paths: ['/location-map', '/location-map/'],
    markers: [/URAI · Private emotional geography/i, /Your places stay closed until you open them\./i, /disclosed sample atlas/i],
  },
  {
    paths: ['/spatial/ar-vr', '/spatial/ar-vr/'],
    markers: [/AR|VR|XR|Quest|spatial/i, /Life Map|device|browser|fallback/i],
  },
  {
    paths: ['/status', '/status/'],
    markers: [/Production certification remains hidden until the protected fingerprint is validated\./i, /Launch spine/i, /Certification boundary/i],
  },
  {
    paths: ['/api/system/deploy-proof'],
    markers: [
      /urai-spatial-deploy-proof/i,
      /urai-spatial-public-surface-2026-06-29-homeworldproduction/i,
      /urai-spatial-deploy-proof-v2-2026-06-30/i,
      /commitShaKnown/i,
    ],
  },
]

const staleFallbackPatterns = [
  /Full app deployment is being finalized/i,
  /Opening your spatial field/i,
  /Preparing the scene/i,
]

const legacyRuntimePatterns = [
  /Loading URAI/i,
  /Help us tune the Life Movie/i,
  /Feedback capture is paused because Firebase (?:isn['’]t|is not) configured/i,
]

const failures = []
let checkCount = 0

const normalizePath = (pathname) => {
  const value = pathname.replace(/\/+$/, '')
  return value || '/'
}

for (const { paths, markers, forbidden = [] } of routes) {
  for (const path of paths) {
    checkCount += 1
    const url = `${normalizedBase}${path}`
    try {
      const requestedUrl = new URL(url)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'user-agent': 'urai-live-smoke/4.1',
          accept: 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      })

      const body = await response.text()
      const finalUrl = new URL(response.url)
      const hasExpectedContent = /<html|<body|__next|URAI|Urai|urai-spatial-deploy-proof/i.test(body)
      const stale = staleFallbackPatterns.find((pattern) => pattern.test(body))
      const legacyRuntime = legacyRuntimePatterns.find((pattern) => pattern.test(body))
      const missingMarker = markers.find((pattern) => !pattern.test(body))
      const forbiddenMarker = forbidden.find((pattern) => pattern.test(body))
      const pathMismatch = normalizePath(finalUrl.pathname) !== normalizePath(requestedUrl.pathname)
      const missingQuery = [...requestedUrl.searchParams.entries()].find(
        ([key, value]) => finalUrl.searchParams.get(key) !== value,
      )
      const liveCommitShaMissing =
        requestedUrl.pathname.replace(/\/$/, '') === '/api/system/deploy-proof' &&
        requireLiveCommitSha &&
        /"commitSha"\s*:\s*"unknown"/i.test(body)

      if (
        !response.ok ||
        !hasExpectedContent ||
        stale ||
        legacyRuntime ||
        missingMarker ||
        forbiddenMarker ||
        pathMismatch ||
        missingQuery ||
        liveCommitShaMissing
      ) {
        failures.push(
          `${url} returned ${response.status} finalUrl=${response.url} expectedContent=${hasExpectedContent} ` +
            `stale=${stale?.source ?? 'no'} legacyRuntime=${legacyRuntime?.source ?? 'no'} ` +
            `missing=${missingMarker?.source ?? 'none'} forbidden=${forbiddenMarker?.source ?? 'none'} ` +
            `pathMismatch=${pathMismatch} missingQuery=${missingQuery ? missingQuery.join('=') : 'none'} ` +
            `liveCommitShaMissing=${liveCommitShaMissing}`,
        )
      } else {
        console.log(`OK ${response.status} ${url} -> ${response.url}`)
      }
    } catch (error) {
      failures.push(`${url} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

if (failures.length > 0) {
  console.error('URAI live smoke failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `URAI live smoke passed ${checkCount} custom-route checks with slash parity, route-specific fingerprints, legacy-runtime rejection, and deploy proof. requireLiveCommitSha=${requireLiveCommitSha} requireCustomDomain=${requireCustomDomain}`,
)
