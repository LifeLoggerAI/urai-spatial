import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  COUNCIL_PROVIDER_REGISTRY,
  LIVE_COUNCIL_PROVIDER_IDS,
  PENDING_COUNCIL_PROVIDER_IDS,
  CouncilProviderNotConnectedError,
  requestCouncilProvider,
} from '../src/spatial/council/councilProviderRegistry.ts'

test('Council provider registry truthfully exposes only OpenAI as live external text provider', () => {
  assert.deepEqual(LIVE_COUNCIL_PROVIDER_IDS, ['openai'])
  assert.deepEqual(PENDING_COUNCIL_PROVIDER_IDS, ['anthropic', 'gemini', 'xai', 'mistral'])
  assert.equal(COUNCIL_PROVIDER_REGISTRY.openai.runtimeState, 'live')
  assert.equal(COUNCIL_PROVIDER_REGISTRY['local-fallback'].runtimeState, 'local-fallback')

  for (const id of ['anthropic', 'gemini', 'xai', 'mistral']) {
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].runtimeState, 'not-connected')
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].externalProcessing, true)
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].modelVersionRequiredForCertification, true)
  }
})

test('unconnected Council providers fail closed before any provider request can be used', async () => {
  const controller = new AbortController()
  for (const provider of ['anthropic', 'gemini', 'xai', 'mistral']) {
    await assert.rejects(
      requestCouncilProvider({
        provider,
        message: 'test',
        context: [],
        aiProcessingConsent: true,
        signal: controller.signal,
      }),
      (error) => error instanceof CouncilProviderNotConnectedError && error.provider === provider,
    )
  }
})

test('Council UI routes through provider-neutral dispatcher and publishes live/pending attribution', () => {
  const panel = fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url), 'utf8')
  const registry = fs.readFileSync(new URL('../src/spatial/council/councilProviderRegistry.ts', import.meta.url), 'utf8')

  assert.match(panel, /ACTIVE_COUNCIL_PROVIDER = 'openai'/)
  assert.match(panel, /requestCouncilProvider({[sS]*provider: ACTIVE_COUNCIL_PROVIDER/)
  assert.match(panel, /data-live-council-providers=/)
  assert.match(panel, /data-pending-council-providers=/)
  assert.match(panel, /COUNCIL_PROVIDER_REGISTRY[ACTIVE_COUNCIL_PROVIDER].label/)
  assert.doesNotMatch(panel, /requestOpenAIOrb(/)

  assert.match(registry, /case 'openai':[sS]*requestOpenAIOrb/)
  assert.doesNotMatch(registry, /case 'anthropic':[sS]*requestOpenAIOrb/)
  assert.doesNotMatch(registry, /case 'gemini':[sS]*requestOpenAIOrb/)
  assert.doesNotMatch(registry, /case 'xai':[sS]*requestOpenAIOrb/)
  assert.doesNotMatch(registry, /case 'mistral':[sS]*requestOpenAIOrb/)
})
