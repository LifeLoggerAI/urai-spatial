const host = process.env.HOST ?? 'http://127.0.0.1:3000'

const htmlRoutes = ['/', '/life-map', '/privacy', '/terms', '/spatial']
const redirectRoutes = [['/u/adamclamp', '/demo/life-map']]

const apiRoutes = [
  ['/api/system/health', { method: 'GET' }],
  ['/api/system/manifest', { method: 'GET' }],
  ['/api/system/capabilities', { method: 'GET' }],
  ['/api/system/integration-contract', { method: 'GET' }],
  ['/api/system/launch-boundary', { method: 'GET', optional: true }],
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
}

function isConnectionRefused(error) {
  return error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED'
}

async function request(route, init) {
  try {
    return await fetch(`${host}${route}`, init)
  } catch (error) {
    if (isConnectionRefused(error)) {
      throw new Error(
        `Smoke server is not reachable at ${host}. Start the app before running smoke, for example: pnpm start, then HOST=${host} pnpm smoke.`,
      )
    }

    throw error
  }
}

async function checkHtml(route) {
  const response = await request(route)
  const body = await response.text()
  const visible = visibleHtml(body)

  assert(response.status === 200, `${route} returned ${response.status}`)
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

  if (route === '/') {
    assert(
      body.includes('data-urai-home-spatial-shell') || body.includes('urai-home-shell'),
      '/ missing URAI home marker',
    )
  }

  if (route === '/life-map') {
    assert(
      body.includes('urai-spatial-stage') || body.includes('lifemap-starfield'),
      '/life-map missing LifeMap marker',
    )
  }
}

async function checkRedirect(route, expectedDestination) {
  const response = await request(route, { redirect: 'manual' })
  const location = response.headers.get('location') ?? ''

  assert(
    [307, 308].includes(response.status),
    `${route} returned ${response.status}, expected a Next.js redirect`,
  )
  assert(
    location === expectedDestination || location.endsWith(expectedDestination),
    `${route} redirects to ${location || '<missing location>'}, expected ${expectedDestination}`,
  )
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

for (const route of htmlRoutes) {
  await checkHtml(route)
}

for (const [route, expectedDestination] of redirectRoutes) {
  await checkRedirect(route, expectedDestination)
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
  `URAI Spatial smoke passed for ${htmlRoutes.length} HTML routes, ${redirectRoutes.length} redirect routes, ${apiRoutes.length} public API checks, ${protectedApiRoutes.length} protected API checks, and ${webhookRoutes.length} webhook checks at ${host}`,
)
