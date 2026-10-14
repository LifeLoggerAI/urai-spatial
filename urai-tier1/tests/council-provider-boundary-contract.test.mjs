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

test('Council graph handoff never trusts a browser supplied evidence packet', () => {
  const graphSource = fs.readFileSync(new URL('../../apps/functions/src/councilGraphEvidenceAuthority.ts', import.meta.url), 'utf8')
  assert.ok(functions.includes('readCouncilGraphEvidence(db, uid, graphRequest)'))
  assert.ok(functions.includes('body.graphSelection'))
  assert.ok(functions.includes('UNTRUSTED REFERENCE DATA'))
  assert.equal(functions.includes('body.graphEvidence'), false)
  for (const required of ['requireLifeItemSources(db, tx, uid', 'lifeItemDigest(item)', 'lifeAuthorityDigest(bindings)', 'isCanonicalStoredPolicy(p, uid)']) {
    assert.ok(graphSource.includes(required), required)
  }
})

test('graph disclosure requires a separate user choice and server revalidation', () => {
  assert.ok(functions.includes('COUNCIL_GRAPH_DISCLOSURE_CONSENT_REQUIRED'))
  assert.ok(functions.includes('body.graphShareConsent !== true'))
  assert.ok(functions.includes('await recheckGraph()'))
  assert.ok(functions.includes('COUNCIL_GRAPH_CHANGED'))
  assert.ok(client.includes('graphShareConsent: true'))
  assert.ok(client.includes('if ((input.graphSelection || input.memorySelection) && input.graphShareConsent !== true) return null'))
  assert.ok(registry.includes('if (input.graphSelection || input.memorySelection) return null'), 'OpenAI Orb must reject ungoverned graph and memory selection')
  assert.ok(panel.includes('setGraphShareConsent(false)'))
  assert.ok(panel.includes('graphShareConsent: true'))
  assert.ok(panel.includes('Use the selected Memory Star'), 'Council must expose selected-memory consent without trusting browser evidence')
  assert.ok(panel.includes('graphRequested || reviewableProviderIds.length === 0'))
})

test('Memory Star Council route requires server-owned SceneTruth and graph authority', () => {
  const graph = fs.readFileSync(new URL('../../apps/functions/src/councilGraphEvidenceAuthority.ts', import.meta.url),'utf8')
  const focus = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url),'utf8')
  assert.ok(graph.includes('resolveCouncilMemoryGraph'))
  assert.ok(graph.includes('sceneTruthPackets/'))
  assert.ok(graph.includes('lifeGraphSnapshots/'))
  assert.ok(graph.includes('readCouncilGraphEvidence(db, uid'))
  assert.ok(functions.includes('body.memorySelection'))
  assert.ok(functions.includes('COUNCIL_GRAPH_DISCLOSURE_CONSENT_REQUIRED'))
  assert.ok(functions.includes('await recheckMemory()'))
  assert.ok(registry.includes('input.memorySelection'))
  assert.ok(client.includes('memorySelection: input.memorySelection'), 'Selected memory ID must reach the governed provider request')
  assert.ok(client.includes('input.memorySelection'))
  assert.ok(panel.includes('Use the selected Memory Star'))
  assert.ok(focus.includes('Ask Council about this memory'))
  assert.ok(focus.includes('/council?memoryId='))
})
