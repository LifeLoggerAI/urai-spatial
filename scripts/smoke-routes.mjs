const host = process.env.HOST ?? 'http://127.0.0.1:3000'

const htmlRoutes = ['/', '/life-map', '/privacy', '/terms', '/spatial']
const apiRoutes = [
  ['/api/system/health', { method: 'GET' }],
  ['/api/system/manifest', { method: 'GET' }],
  ['/api/system/capabilities', { method: 'GET' }],
  ['/api/system/integration-contract', { method: 'GET' }],
  ['/api/system/launch-boundary', { method: 'GET' }],
  ['/api/body-biometric', { method: 'POST', body: JSON.stringify({ userId: 'adamclamp', portal: 'chest-heart', source: 'live-device' }) }],
  ['/api/body-biometric', { method: 'POST', body: JSON.stringify({ portal: 'brain-synapses', source: 'mock' }) }],
  ['/api/orb-companion', { method: 'POST', body: JSON.stringify({ message: '' }) }],
]

const protectedApiRoutes = [
  ['/api/entitlement', { method: 'GET', expectedStatus: 401 }],
  ['/api/stripe/create-checkout-session', { method: 'POST', expectedStatus: 401, body: JSON.stringify({ planId: 'pro' }) }],
]

const webhookRoutes = [
  ['/api/stripe/webhook', { method: 'POST', expectedStatus: 400, body: '{}' }],
  ['/api/stripe/webhook-v2', { method: 'POST', expectedStatus: 400, body: '{}' }],
]

const forbidden = ['TODO', 'lorem ipsum', 'coming soon', 'undefined', '[object Object]']

function assert(condition, message) {
  if (!condition) throw new Error(message)
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
  assert(response.status === 200, `${route} returned ${response.status}`)
  assert(body.trim().length > 0, `${route} returned an empty body`)
  assert(/<title[^>]*>/.test(body), `${route} is missing a title`)
  assert(/name=["']viewport["']/.test(body), `${route} is missing viewport meta`)
  for (const token of forbidden) assert(!body.includes(token), `${route} includes placeholder token ${token}`)
  if (route === '/') assert(body.includes('data-urai-home-spatial-shell') || body.includes('urai-home-shell'), '/ missing URAI home marker')
  if (route === '/life-map') assert(body.includes('urai-spatial-stage') || body.includes('lifemap-starfield'), '/life-map missing LifeMap marker')
}

async function checkJson(route, init) {
  const headers = init.method === 'POST' ? { 'content-type': 'application/json' } : undefined
  const response = await request(route, { ...init, headers })
  const text = await response.text()
  assert(response.ok, `${route} returned ${response.status}: ${text.slice(0, 120)}`)
  assert(!text.includes('stack') && !text.includes('PRIVATE_KEY'), `${route} returned unsafe debug output`)
  const payload = JSON.parse(text)
  assert(payload.service === 'urai-spatial' || payload.ok === true, `${route} missing service/ok contract`)
  if (route.includes('body-biometric')) {
    assert(payload.providerStatus, `${route} missing providerStatus`)
    assert(payload.snapshot, `${route} missing snapshot`)
  }
  if (route.includes('orb-companion')) assert(payload.mode, `${route} missing mode`)
  if (route.includes('launch-boundary')) {
    assert(payload.launchBoundary, `${route} missing launchBoundary`)
    assert(payload.launchBoundary.liveProviderConnected === false, `${route} must report liveProviderConnected=false in fallback mode`)
    assert(payload.launchBoundary.userConsentRequiredBeforeLiveProviders === true, `${route} must require consent before live providers`)
    assert(Array.isArray(payload.deferredCapabilities), `${route} missing deferredCapabilities array`)
    assert(payload.deferredCapabilities.includes('live-ar-webxr-session'), `${route} missing live-ar-webxr-session deferred capability`)
    assert(Array.isArray(payload.requirementsBeforeLiveProviders), `${route} missing requirementsBeforeLiveProviders array`)
  }
}

async function checkExpectedStatus(route, init) {
  const headers = init.method === 'POST' ? { 'content-type': 'application/json' } : undefined
  const response = await request(route, { ...init, headers })
  const text = await response.text()
  assert(response.status === init.expectedStatus, `${route} returned ${response.status}, expected ${init.expectedStatus}: ${text.slice(0, 120)}`)
  assert(!text.includes('stack') && !text.includes('PRIVATE_KEY'), `${route} returned unsafe debug output`)
}

for (const route of htmlRoutes) await checkHtml(route)
for (const [route, init] of apiRoutes) await checkJson(route, init)
for (const [route, init] of protectedApiRoutes) await checkExpectedStatus(route, init)
for (const [route, init] of webhookRoutes) await checkExpectedStatus(route, init)
console.log(`URAI Spatial smoke passed for ${htmlRoutes.length} HTML routes, ${apiRoutes.length} public API checks, ${protectedApiRoutes.length} protected API checks, and ${webhookRoutes.length} webhook checks at ${host}`)
