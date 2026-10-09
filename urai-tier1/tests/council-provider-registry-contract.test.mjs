import assert from 'node:assert/strict'
import fs from 'node:fs'
import test, { after, before } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Fictional public Firebase configuration permits the actual clients to run.
// Every HTTP request is intercepted before the SDK or provider modules load.
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'synthetic-council-api-key'
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'synthetic-council.invalid'
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'synthetic-council'
process.env.NEXT_PUBLIC_URAI_API_ORIGIN = ''
const providers = ['anthropic', 'gemini', 'xai', 'mistral']
const allProviders = ['openai', ...providers]
const originalFetch = globalThis.fetch
const originalReact = globalThis.React
globalThis.React = React
let requests = []
let responseFor
globalThis.fetch = async (url, init) => {
  const endpoint = String(url)
  assert.ok(endpoint === '/api/urai/orb/openai' || /^\/api\/urai\/council\/(anthropic|gemini|xai|mistral)$/.test(endpoint), 'unexpected SDK/network request')
  requests.push({ endpoint, init, body: JSON.parse(init.body) })
  assert.ok(responseFor, 'HTTP is denied outside a synthetic response case')
  return responseFor(endpoint)
}

let sequence = 0
async function registryFor(value = 'false') {
  for (const provider of providers) process.env[`NEXT_PUBLIC_URAI_COUNCIL_${provider.toUpperCase()}_ENABLED`] = value
  return import(`../src/spatial/council/councilProviderRegistry.ts?fixture=${sequence++}`)
}
const defaultRegistry = await registryFor()
const { getAuth } = await import('firebase/auth')
const { deleteApp } = await import('firebase/app')
const { app } = await import('../src/lib/firebase/client.ts')
const auth = getAuth(app)
const syntheticUser = { uid: 'synthetic-council-owner', getIdToken: async () => 'synthetic-council-id-token' }
before(async () => {
  await auth.authStateReady()
  Object.defineProperty(auth, 'currentUser', { configurable: true, writable: true, value: syntheticUser })
})
after(async () => {
  await deleteApp(app)
  globalThis.fetch = originalFetch
  globalThis.React = originalReact
})

function input(provider, overrides = {}) {
  return {
    provider,
    message: 'Fictional bounded Council question',
    context: Array.from({ length: 12 }, (_, i) => ({ role: 'user', content: `Fictional context ${i}` })),
    aiProcessingConsent: true,
    signal: new AbortController().signal,
    ...overrides,
  }
}
function success(endpoint) {
  const provider = endpoint.split('/').at(-1)
  const result = { provider, message: `Synthetic ${provider} answer`, caption: 'Synthetic answer', disclosure: 'Synthetic in-process transport only.', suggestedActions: [], model: `synthetic-${provider}-model`, locale: 'en' }
  return provider === 'openai'
    ? new Response(`${JSON.stringify({ type: 'done', ...result })}\n`, { headers: { 'Content-Type': 'application/x-ndjson' } })
    : Response.json(result)
}
function assertUnverified(registry) {
  assert.deepEqual(registry.LIVE_COUNCIL_PROVIDER_IDS, [])
  for (const provider of allProviders) assert.notEqual(registry.COUNCIL_PROVIDER_REGISTRY[provider].runtimeState, 'live')
}

test('the default OpenAI request route has no live runtime acceptance claim', () => {
  const { COUNCIL_PROVIDER_REGISTRY, REQUESTABLE_COUNCIL_PROVIDER_IDS, PENDING_COUNCIL_PROVIDER_IDS } = defaultRegistry
  assertUnverified(defaultRegistry)
  assert.deepEqual(REQUESTABLE_COUNCIL_PROVIDER_IDS, ['openai'])
  assert.deepEqual(PENDING_COUNCIL_PROVIDER_IDS, providers)
  assert.equal(COUNCIL_PROVIDER_REGISTRY.openai.runtimeState, 'unverified')
  assert.equal(COUNCIL_PROVIDER_REGISTRY.openai.requestEnabled, true)
  assert.equal(COUNCIL_PROVIDER_REGISTRY['local-fallback'].runtimeState, 'local-fallback')

  for (const id of ['anthropic', 'gemini', 'xai', 'mistral']) {
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].runtimeState, 'source-ready')
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].externalProcessing, true)
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].modelVersionRequiredForCertification, true)
  }
})

test('public configuration permits requests without becoming runtime acceptance', async () => {
  const configured = await registryFor('true')
  assert.deepEqual(configured.REQUESTABLE_COUNCIL_PROVIDER_IDS, allProviders)
  assert.deepEqual(configured.PENDING_COUNCIL_PROVIDER_IDS, [])
  assertUnverified(configured)
  for (const provider of allProviders) assert.equal(configured.COUNCIL_PROVIDER_REGISTRY[provider].runtimeState, 'unverified')
  const invalid = await registryFor('TRUE')
  assert.deepEqual(invalid.REQUESTABLE_COUNCIL_PROVIDER_IDS, ['openai'])
  assertUnverified(invalid)
})

test('disabled providers fail closed before any client HTTP request', async () => {
  requests = []
  for (const provider of providers) {
    await assert.rejects(
      defaultRegistry.requestCouncilProvider(input(provider)),
      (error) => error instanceof defaultRegistry.CouncilProviderNotConnectedError && error.provider === provider,
    )
  }
  assert.equal(requests.length, 0)
  assertUnverified(defaultRegistry)
})

test('configured providers retain their actual authenticated consented adapters', async () => {
  const configured = await registryFor('true')
  requests = []
  responseFor = success
  for (const provider of allProviders) {
    const events = []
    const request = input(provider, { onEvent: (event) => events.push(event) })
    const result = await configured.requestCouncilProvider(request)
    assert.equal(result.provider, provider)
    assert.equal(result.message, `Synthetic ${provider} answer`)
    const sent = requests.at(-1)
    assert.equal(sent.endpoint, provider === 'openai' ? '/api/urai/orb/openai' : `/api/urai/council/${provider}`)
    assert.equal(sent.init.headers.Authorization, 'Bearer synthetic-council-id-token')
    // The actor boundary owns a private signal and disposes it after the reply;
    // it must not abort a caller-owned controller.
    assert.notEqual(sent.init.signal, request.signal)
    assert.equal(sent.init.signal.aborted, true)
    assert.equal(request.signal.aborted, false)
    assert.equal(sent.init.cache, 'no-store')
    assert.equal(sent.body.aiProcessingConsent, true)
    assert.equal(sent.body.context.length, 8)
    assert.match(sent.body.requestId, /^[a-f0-9]{64}$/)
    if (provider === 'openai') assert.equal(events.at(-1).type, 'done')
    assertUnverified(configured)
  }
  assert.equal(requests.length, 5)
})

test('denied consent, missing authentication and aborted requests send no HTTP', async () => {
  const configured = await registryFor('true')
  requests = []
  responseFor = success
  for (const provider of allProviders) {
    assert.equal(await configured.requestCouncilProvider(input(provider, { aiProcessingConsent: false })), null)
    const controller = new AbortController()
    controller.abort()
    assert.equal(await configured.requestCouncilProvider(input(provider, { signal: controller.signal })), null)
  }
  auth.currentUser = null
  try {
    for (const provider of allProviders) assert.equal(await configured.requestCouncilProvider(input(provider)), null)
  } finally { auth.currentUser = syntheticUser }
  assert.equal(requests.length, 0)
  assertUnverified(configured)
})

test('provider failure and uncertain processing never mutate runtime acceptance', async () => {
  const configured = await registryFor('true')
  requests = []
  responseFor = endpoint => Response.json({ error: endpoint.endsWith('/openai') ? 'PROVIDER_UNCONFIGURED' : 'COUNCIL_PROVIDER_DISABLED' }, { status: 503 })
  for (const provider of allProviders) assert.equal(await configured.requestCouncilProvider(input(provider)), null)
  assert.equal(requests.length, 5)
  assertUnverified(configured)
  // A Council-only code from the Orb route is unknown, so it cannot certify
  // that OpenAI was never reached or turn the registry into runtime acceptance.
  responseFor = () => Response.json({ error: 'COUNCIL_PROVIDER_DISABLED' }, { status: 503 })
  await assert.rejects(configured.requestCouncilProvider(input('openai')), /uncertain|confirmed/)
  assertUnverified(configured)
  responseFor = () => { throw new Error('Synthetic transport failure') }
  for (const provider of allProviders) await assert.rejects(configured.requestCouncilProvider(input(provider)), /uncertain|confirmed/)
  assert.equal(requests.length, 11)
  assertUnverified(configured)
})

test('the rendered Council and Scenario selectors offer attempts without live claims', async () => {
  for (const provider of providers) process.env[`NEXT_PUBLIC_URAI_COUNCIL_${provider.toUpperCase()}_ENABLED`] = 'false'
  requests = []
  const { default: CouncilConversationPanel } = await import('../src/spatial/council/CouncilConversationPanel.tsx')
  const { ScenarioCouncilPanel } = await import('../src/spatial/scenario/ScenarioCouncilPanel.tsx')
  const agent = { id: 'synthetic-guardian', name: 'Synthetic Guardian', role: 'guardian', focus: 'Fictional permissions', tone: 'clear' }
  const council = renderToStaticMarkup(React.createElement(CouncilConversationPanel, { agent }))
  const scenario = renderToStaticMarkup(React.createElement(ScenarioCouncilPanel, { scenarioId: 'synthetic-scenario' }))
  assert.match(council, /aria-label="Council conversation"/)
  assert.match(council, /data-live-council-providers=""/)
  assert.match(council, /data-requestable-council-providers="openai"/)
  for (const html of [council, scenario]) {
    assert.match(html, /<option value="openai" selected="">OpenAI<\/option>/)
    assert.match(html, /Provider availability is checked when you ask/)
    assert.doesNotMatch(html, /Live Council|live provider/)
  }
  assert.equal(requests.length, 0)
})

test('Council UI uses the existing provider dispatcher and clears prior provider context', () => {
  const panel = fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url), 'utf8')
  const registry = fs.readFileSync(new URL('../src/spatial/council/councilProviderRegistry.ts', import.meta.url), 'utf8')

  assert.ok(panel.includes("useState<Exclude<CouncilProviderId, 'local-fallback'>>(requestableProviderIds[0] ?? 'openai')"))
  assert.ok(panel.includes('requestCouncilProvider({'))
  assert.ok(panel.includes('provider: providerId'))
  assert.ok(panel.includes('data-live-council-providers='))
  assert.ok(panel.includes('data-pending-council-providers='))
  assert.ok(panel.includes('COUNCIL_PROVIDER_REGISTRY[providerId].label'))
  assert.equal(panel.includes('requestOpenAIOrb('), false)

  assert.ok(registry.includes("if (input.provider === 'openai')"))
  assert.ok(registry.includes('requestOpenAIOrb({'))
  for (const id of ['anthropic', 'gemini', 'xai', 'mistral']) {
    assert.equal(registry.includes(`case '${id}':`), false)
  }
})
