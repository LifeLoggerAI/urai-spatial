const host = process.env.HOST ?? 'http://127.0.0.1:3000'

const LOCK_VERSION = '2026-05-09.urai-spatial.locked.v1'

export const launchHtmlRoutes = ['/home', '/life-map', '/replay']
export const launchJsonRoutes = [['/life-map/health', { method: 'GET' }]]
export const routeSurfaceTODO = [
  '/',
  '/u/adamclamp',
  '/homeview',
  '/council',
  '/login',
  '/demo/life-map',
  '/privacy',
  '/terms',
  '/spatial',
]

const htmlRoutes = launchHtmlRoutes
const apiRoutes = [
  ...launchJsonRoutes,
  ['/api/system/health', { method: 'GET' }],
  ['/api/system/manifest', { method: 'GET' }],
  ['/api/system/capabilities', { method: 'GET' }],
  ['/api/system/integration-contract', { method: 'GET', requiredIntegrationLock: true, required3DWorld: true }],
  ['/api/system/urai-spatial-lock', { method: 'GET', requiredLockVersion: LOCK_VERSION }],
  ['/api/system/urai-spatial-3d-world', { method: 'GET', requiredStandalone3DWorld: true }],
  ['/api/system/launch-boundary', { method: 'GET', optional: true }],
  ['/api/system/tier2', { method: 'GET', requiredTier: 'Tier-2' }],
  [
    '/api/body-biometric',
    {
      method: 'POST',
      body: JSON.stringify({
        userId: 'adamclamp',
        portal: 'chest-heart',
        source: 'live-device',
      }),
    },
  ],
  [
    '/api/body-biometric',
    {
      method: 'POST',
      body: JSON.stringify({
        portal: 'brain-synapses',
        source: 'mock',
      }),
    },
  ],
  [
    '/api/orb-companion',
    {
      method: 'POST',
      body: JSON.stringify({
        message: '',
      }),
    },
  ],
]

const protectedApiRoutes = [
  ['/api/entitlement', { method: 'GET', expectedStatus: 401 }],
  [
    '/api/stripe/create-checkout-session',
    {
      method: 'POST',
      expectedStatus: 401,
      body: JSON.stringify({ planId: 'pro' }),
    },
  ],
]

const webhookRoutes = [
  ['/api/stripe/webhook', { method: 'POST', expectedStatus: 400, body: '{}' }],
  ['/api/stripe/webhook-v2', { method: 'POST', expectedStatus: 400, body: '{}' }],
]

const forbiddenVisibleText = ['TODO', 'lorem ipsum', 'coming soon', 'undefined', '[object Object]']
const forbiddenHtmlTokens = ['TODO', 'lorem ipsum', 'coming soon', '[object Object]']
const forbiddenResponseTokens = ['stack', 'PRIVATE_KEY', '[object Object]']

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function visibleHtml(body) {
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function isConnectionRefused(error) {
  return error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED'
}

function devServerHint(route, status, body) {
  const snippet = body.replace(/\s+/g, ' ').slice(0, 260)
  return `${route} returned ${status}. Smoke is checking ${host}. If Next dev moved to another port, re-run with HOST=http://127.0.0.1:<port> pnpm smoke. If the response mentions routes-manifest.json or ENOSPC, stop dev, run pnpm clean:next, free disk space, then restart with pnpm dev:3001. Response: ${snippet}`
}

function assert3DWorldPayload(payload, route) {
  const world = payload.world3D ?? payload
  assert(world.worldLayer === '3d', `${route} missing 3D worldLayer`)
  assert(world.domRole === 'accessible-control-overlay', `${route} missing DOM overlay role`)
  assert(world.starsHave3DPositions === true, `${route} missing 3D star position assertion`)
  assert(world.pathsUse3DPositions === true, `${route} missing 3D path assertion`)
  assert(world.replayPathExists === true, `${route} missing 3D replay path assertion`)
  assert(Array.isArray(world.cameraPresets) || payload.cameraPresets, `${route} missing camera presets`)
  if (payload.lockVersion) assert(payload.lockVersion === LOCK_VERSION, `${route} 3D lock version mismatch`)
  if (payload.stars) {
    assert(payload.stars.length >= 5, `${route} expected at least five 3D stars`)
    for (const star of payload.stars) {
      assert(Number.isFinite(star.position?.x), `${route} star ${star.id} missing x`)
      assert(Number.isFinite(star.position?.y), `${route} star ${star.id} missing y`)
      assert(Number.isFinite(star.position?.z), `${route} star ${star.id} missing z`)
    }
  }
  if (payload.paths) {
    assert(payload.paths.some((path) => path.kind === 'replay' && path.points.length >= 3), `${route} missing replay path with 3D points`)
  }
}

async function request(route, init) {
  try {
    return await fetch(`${host}${route}`, init)
  } catch (error) {
    if (isConnectionRefused(error)) {
      throw new Error(
        `Smoke server is not reachable at ${host}. Start the app before running smoke. For Cloud Workstations, use pnpm dev:3001 then HOST=http://127.0.0.1:3001 pnpm smoke.`,
      )
    }

    throw error
  }
}

async function checkHtml(route) {
  const response = await request(route)
  const body = await response.text()
  const visible = visibleHtml(body)

  assert(response.status === 200, devServerHint(route, response.status, body))
  assert(body.trim().length > 0, `${route} returned an empty body`)
  assert(/<title[^>]*>/.test(body), `${route} is missing a title`)
  assert(/name=["']viewport["']/.test(body), `${route} is missing viewport meta`)
  assert(/_next\/static\/chunks/.test(body), `${route} is missing Next.js app chunks`)

  for (const token of forbiddenVisibleText) {
    assert(!visible.includes(token), `${route} includes visible placeholder token ${token}`)
  }

  for (const token of forbiddenHtmlTokens) {
    assert(!body.includes(token), `${route} includes placeholder token ${token}`)
  }

  if (route === '/home') {
    assert(
      body.includes('data-urai-home-spatial-shell') || body.includes('urai-home-shell') || body.includes('urai-scene-stage'),
      '/home missing URAI home marker',
    )
  }

  if (route === '/life-map') {
    assert(
      body.includes('lifeGalaxy') || body.includes('urai-spatial-stage') || body.includes('lifemap-starfield') || body.includes('urai-scene-stage'),
      `${route} missing canonical Life Map marker`,
    )
  }

  if (route === '/replay') {
    assert(
      body.includes('Replay') || body.includes('urai-scene-stage') || body.includes('urai-focus-action-panel'),
      `${route} missing replay marker`,
    )
  }
}

async function checkJson(route, init) {
  const headers = init.method === 'POST' ? { 'content-type': 'application/json' } : undefined
  const response = await request(route, { ...init, headers })
  const text = await response.text()

  if (!response.ok && init.optional) {
    console.warn(`URAI Spatial smoke warning: optional route ${route} returned ${response.status}`)
    return
  }

  assert(response.ok, `${route} returned ${response.status}: ${text.slice(0, 120)}`)

  for (const token of forbiddenResponseTokens) {
    assert(!text.includes(token), `${route} returned unsafe debug output: ${token}`)
  }

  const payload = JSON.parse(text)

  assert(payload.service === 'urai-spatial' || payload.ok === true, `${route} missing service/ok contract`)

  if (init.requiredIntegrationLock) {
    const lock = payload.locks?.uraiSpatial
    assert(lock, `${route} missing locks.uraiSpatial`)
    assert(lock.status === 'locked', `${route} lock status is not locked`)
    assert(lock.done === true, `${route} lock done is not true`)
    assert(lock.lockVersion === LOCK_VERSION, `${route} lock version mismatch`)
    assert(lock.tierCount === 5, `${route} lock tier count mismatch`)
    assert(lock.route === '/api/system/urai-spatial-lock', `${route} lock route mismatch`)
  }

  if (init.required3DWorld || init.requiredStandalone3DWorld) {
    assert3DWorldPayload(payload, route)
  }

  if (init.requiredTier) {
    assert(payload.tier === init.requiredTier, `${route} missing required tier ${init.requiredTier}`)
    assert(Array.isArray(payload.systems) && payload.systems.length >= 6, `${route} missing Tier-2 systems`)
  }

  if (init.requiredLockVersion) {
    assert(payload.status === 'locked', `${route} missing locked status`)
    assert(payload.done === true, `${route} missing done=true`)
    assert(payload.version === init.requiredLockVersion, `${route} missing lock version ${init.requiredLockVersion}`)
    assert(payload.assertions?.tiersComplete === true, `${route} missing tiersComplete assertion`)
    assert(payload.assertions?.versionLocked === true, `${route} missing versionLocked assertion`)
    assert(payload.assertions?.acceptancePresent === true, `${route} missing acceptancePresent assertion`)
    assert(payload.assertions?.testsPresent === true, `${route} missing testsPresent assertion`)
    assert(Array.isArray(payload.tiers) && payload.tiers.length === 5, `${route} missing five tier locks`)
    for (const tier of payload.tiers) {
      assert(tier.status === 'locked', `${route} tier ${tier.id} is not locked`)
      assert(tier.done === true, `${route} tier ${tier.id} is not done`)
      assert(Array.isArray(tier.assertions) && tier.assertions.length > 0, `${route} tier ${tier.id} missing assertions`)
      assert(Array.isArray(tier.tests) && tier.tests.length > 0, `${route} tier ${tier.id} missing tests`)
    }
  }

  if (route.includes('body-biometric')) {
    assert(payload.providerStatus, `${route} missing providerStatus`)
    assert(payload.snapshot, `${route} missing snapshot`)
  }

  if (route.includes('orb-companion')) {
    assert(payload.mode, `${route} missing mode`)
  }
}

async function checkExpectedStatus(route, init) {
  const headers = init.method === 'POST' ? { 'content-type': 'application/json' } : undefined
  const response = await request(route, { ...init, headers })
  const text = await response.text()

  assert(
    response.status === init.expectedStatus,
    `${route} returned ${response.status}, expected ${init.expectedStatus}: ${text.slice(0, 120)}`,
  )

  for (const token of forbiddenResponseTokens) {
    assert(!text.includes(token), `${route} returned unsafe debug output: ${token}`)
  }
}

console.log(`URAI Spatial launch smoke routes: ${htmlRoutes.join(', ')}`)
console.log(`URAI Spatial future route surface TODO: ${routeSurfaceTODO.join(', ')}`)

for (const route of htmlRoutes) {
  await checkHtml(route)
}

for (const [route, init] of apiRoutes) {
  await checkJson(route, init)
}

for (const [route, init] of protectedApiRoutes) {
  await checkExpectedStatus(route, init)
}

for (const [route, init] of webhookRoutes) {
  await checkExpectedStatus(route, init)
}

console.log(
  `URAI Spatial smoke passed for ${htmlRoutes.length} launch HTML routes, ${apiRoutes.length} public API checks, ${protectedApiRoutes.length} protected API checks, and ${webhookRoutes.length} webhook checks at ${host}`,
)
