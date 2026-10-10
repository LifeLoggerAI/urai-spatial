import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const functions = fs.readFileSync(new URL('../../apps/functions/src/councilProviderFunctions.ts', import.meta.url), 'utf8')
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const registry = fs.readFileSync(new URL('../src/spatial/council/councilProviderRegistry.ts', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/spatial/council/councilClient.ts', import.meta.url), 'utf8')
const panel = fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx', import.meta.url), 'utf8')
const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))
const previewConfig = JSON.parse(fs.readFileSync(new URL('../../.github/firebase.preview.json', import.meta.url), 'utf8'))

test('Council adapters are server-only, authenticated, consent-bound and hard-off until explicitly enabled', () => {
  for (const provider of ['anthropic', 'gemini', 'xai', 'mistral']) {
    assert.match(functions, new RegExp(`defineSecret\\('${provider === 'xai' ? 'XAI' : provider.toUpperCase()}_API_KEY'\\)`))
    assert.match(functions, new RegExp(`URAI_COUNCIL_\\$\\{provider\\.toUpperCase\\(\\)\\}_ENABLED`))
    assert.match(registry, new RegExp(`NEXT_PUBLIC_URAI_COUNCIL_${provider === 'xai' ? 'XAI' : provider.toUpperCase()}_ENABLED`))
  }
  assert.match(functions, /verifyIdToken\([^,]+, true\)/)
  assert.match(functions, /privacyPolicy\/current/)
  assert.ok(functions.includes('providerConnections/${provider}'))
  assert.ok(functions.includes('providerRateLimits/${provider}-council'))
  assert.match(functions, /response\.on\('close', \(\) => \{ if \(!response\.writableEnded\) controller\.abort\(\) \}\)/)
  assert.doesNotMatch(client, /API_KEY/)
})

test('Council provider request formats match the governed provider families', () => {
  assert.match(functions, /api\.anthropic\.com\/v1\/messages/)
  assert.match(functions, /anthropic-version/)
  assert.match(functions, /generativelanguage\.googleapis\.com\/v1beta\/models/)
  assert.match(functions, /x-goog-api-key/)
  assert.match(functions, /api\.x\.ai\/v1\/chat\/completions/)
  assert.match(functions, /api\.mistral\.ai\/v1\/chat\/completions/)
  assert.ok(functions.includes('Authorization: `Bearer ${apiKey}`'))
  assert.match(functions, /COUNCIL_MODEL_NOT_CONFIGURED/)
})

test('Council request configuration is distinct from protected runtime acceptance', () => {
  assert.match(registry, /'source-ready'/)
  assert.match(registry, /providerRequestState/)
  assert.match(registry, /process\.env\.NEXT_PUBLIC_URAI_COUNCIL_ANTHROPIC_ENABLED === 'true'/)
  assert.match(registry, /process\.env\.NEXT_PUBLIC_URAI_COUNCIL_GEMINI_ENABLED === 'true'/)
  assert.match(registry, /process\.env\.NEXT_PUBLIC_URAI_COUNCIL_XAI_ENABLED === 'true'/)
  assert.match(registry, /process\.env\.NEXT_PUBLIC_URAI_COUNCIL_MISTRAL_ENABLED === 'true'/)
  assert.doesNotMatch(registry, /process\.env\[environmentKey\]/)
  assert.match(registry, /if \(!descriptor\.requestEnabled\)/)
  assert.match(registry, /REQUESTABLE_COUNCIL_PROVIDER_IDS/)
  assert.doesNotMatch(registry, /runtimeState: 'live'/)
  assert.match(registry, /PENDING_COUNCIL_PROVIDER_IDS/)
  assert.match(panel, /Council provider changed\. Prior provider context was cleared\./)
  assert.match(panel, /setHistory\(\[\]\)/)
  assert.ok(panel.includes('COUNCIL_PROVIDER_REGISTRY[providerId].label} processing for this Council message before sending.'))
  assert.doesNotMatch(panel, /Allow OpenAI processing for this Council message before sending\./)
})

test('Firebase hosting exposes only the protected server provider boundaries', () => {
  const required = [
    ['/api/urai/council/anthropic', 'anthropicCouncilProvider'],
    ['/api/urai/council/gemini', 'geminiCouncilProvider'],
    ['/api/urai/council/xai', 'xaiCouncilProvider'],
    ['/api/urai/council/mistral', 'mistralCouncilProvider'],
  ]
  for (const [source, functionId] of required) {
    for (const config of [firebaseConfig, previewConfig]) {
      assert.ok(config.hosting.rewrites.some((entry) =>
        entry.source === source &&
        entry.function?.functionId === functionId &&
        entry.function?.region === 'us-central1'
      ))
    }
  }
  for (const name of ['anthropicCouncilProvider', 'geminiCouncilProvider', 'xaiCouncilProvider', 'mistralCouncilProvider']) {
    assert.match(functionsIndex, new RegExp(name))
  }
})

test('Council fallback truth distinguishes pre-provider, definite provider attempt, and uncertain transport states', () => {
  assert.match(client, /PRE_EXTERNAL_FAILURE_CODES/)
  assert.match(client, /DEFINITE_EXTERNAL_FAILURE_CODES/)
  assert.match(client, /CouncilExternalProviderAttemptError/)
  assert.match(client, /CouncilExternalProviderAttemptUncertainError/)
  assert.match(client, /attemptedCouncilProviderFallback/)
  assert.match(client, /uncertainCouncilProviderFallback/)
  assert.match(client, /if \(PRE_EXTERNAL_FAILURE_CODES\.has\(code\)\) return null/)
  assert.match(panel, /error instanceof CouncilExternalProviderAttemptError/)
  assert.match(panel, /error instanceof CouncilExternalProviderAttemptUncertainError/)
  assert.match(panel, /attemptedCouncilProviderFallback\(trimmed, error\.provider\)/)
  assert.match(panel, /uncertainCouncilProviderFallback\(trimmed, error\.provider\)/)
})
