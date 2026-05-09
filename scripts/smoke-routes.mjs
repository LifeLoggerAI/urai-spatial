const host = process.env.HOST ?? 'http://127.0.0.1:3000'

const htmlRoutes = ['/', '/life-map', '/privacy', '/terms', '/spatial']
const apiRoutes = [
  ['/api/system/health', { method: 'GET' }],
  ['/api/system/manifest', { method: 'GET' }],
  ['/api/system/capabilities', { method: 'GET' }],
  ['/api/system/integration-contract', { method: 'GET' }],
  ['/api/system/launch-boundary', { method: 'GET', allowFallbackToCapabilities: true }],
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

const forbiddenHtmlTokens = ['TODO', 'lorem ipsum', 'coming soon', '[object Object]']
const forbiddenResponseTokens = ['stack', 'PRIVATE_KEY', '[object Object]']

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

async function readJson(route) {
  const response = await request(route, { method: 'GET' })
  const text = await response.text()
  assert(response.ok, `${route} returned ${response.status}: ${text.slice(0, 120)}`)
  return JSON.parse(text)
}

async function checkHtml(route) {
  const response = await request(route)
  const body = await response.text()
  assert(response.status === 200, `${route} returned ${response.status}`)
  assert(body.trim().length > 0, `${route} returned an empty body`)
  assert(/<title[^>]*>/.test(body), `${route} is missing a title`)
  assert(/name=["']viewport["']/.test(body), `${route} is missing viewport meta`)
  assert(/_next\/static\/chunks/.test(body), `${route} is missing Next.js app chunks`)
  for (const token of forbiddenHtmlTokens) assert(!body.includes(token), `${route} includes placeholder token ${token}`)
}

function assertLaunchBoundaryPayload(route, payload) {
  assert(payload.launchBoundary, `${route} missing launchBoundary`)
  assert(payload.launchBoundary.liveProviderConnected === false, `${route} must report liveProviderConnected=false in fallback mode`)
  assert(payload.launchBoundary.userConsentRequiredBeforeLiveProviders === true, `${route} must require consent before live providers`)
  assert(Array.isArray(payload.deferredCapabilities), `${route} missing deferredCapabilities array`)
  assert(payload.deferredCapabilities.includes('live-ar-webxr-session'), `${route} missing live-ar-webxr-session deferred capability`)
  assert(Array.isArray(payload.requirementsBeforeLiveProviders), `${route} missing requirementsBeforeLiveProviders array`)
}

async function readLaunchBoundaryFallback() {
  const capabilities = await readJson('/api/system/capabilities')
  if (capabilities.launchBoundary) return { route: '/api/system/capabilities', payload: capabilities }
  const integrationContract = await readJson('/api/system/integration-contract')
  return { route: '/api/system/integration-contract', payload: integrationContract }
}

async function checkJson(route, init) {
  const headers = init.method === 'POST' ? { 'content-type': 'application/json' } : undefined
  const response = await request(route, { ...init, headers })
  const text = await response.text()
  if (!response.ok && route.includes('launch-boundary') && init.allowFallbackToCapabilities) {
    const fallback = await readLaunchBoundaryFallback()
    assertLaunchBoundaryPayload(fallback.route, fallback.payload)
    return
  }
  assert(response.ok, `${route} returned ${response.status}: ${text.slice(0, 120)}`)
  for (const token of forbiddenResponseTokens) assert(!text.includes(token), `${route} returned unsafe debug output: ${token}`)
  const payload = JSON.parse(text)
  assert(payload.service === 'urai-spatial' || payload.ok === true, `${route} missing service/ok contract`)
  if (route.includes('body-biometric')) {
    assert(payload.providerStatus, `${route} missing providerStatus`)
    assert(payload.snapshot, `${route} missing snapshot`)
  }
  if (route.includes('orb-companion')) assert(payload.mode, `${route} missing mode`)
  if (route.includes('launch-boundary')) assertLaunchBoundaryPayload(route, payload)
}

async function checkExpectedStatus(route, init) {
  const headers = init.method === 'POST' ? { 'content-type': 'application/json' } : undefined
  const response = await request(route, { ...init, headers })
  const text = await response.text()
  assert(response.status === init.expectedStatus, `${route} returned ${response.status}, expected ${init.expectedStatus}: ${text.slice(0, 120)}`)
  for (const token of forbiddenResponseTokens) assert(!text.includes(token), `${route} returned unsafe debug output: ${token}`)
}

for (const route of htmlRoutes) await checkHtml(route)
for (const [route, init] of apiRoutes) await checkJson(route, init)
for (const [route, init] of protectedApiRoutes) await checkExpectedStatus(route, init)
for (const [route, init] of webhookRoutes) await checkExpectedStatus(route, init)
console.log(`URAI Spatial smoke passed for ${htmlRoutes.length} HTML routes, ${apiRoutes.length} public API checks, ${protectedApiRoutes.length} protected API checks, and ${webhookRoutes.length} webhook checks at ${host}`)
