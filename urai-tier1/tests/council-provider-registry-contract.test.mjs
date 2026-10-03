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
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].runtimeState, 'source-ready')
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].externalProcessing, true)
    assert.equal(COUNCIL_PROVIDER_REGISTRY[id].modelVersionRequiredForCertification, true)
  }
})

test('source-ready Council providers fail closed until runtime-admitted', async () => {
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

  assert.ok(panel.includes("useState<Exclude<CouncilProviderId, 'local-fallback'>>(liveProviderIds[0] ?? 'openai')"))
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
