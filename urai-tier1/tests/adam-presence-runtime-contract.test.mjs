import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const layout = fs.readFileSync(new URL('src/app/layout.tsx', root), 'utf8')
const runtime = fs.readFileSync(new URL('src/spatial/adam/AdamPresenceRuntime.tsx', root), 'utf8')
const adamStyles = fs.readFileSync(new URL('src/spatial/adam/AdamPresenceRuntime.module.css', root), 'utf8')
const client = fs.readFileSync(new URL('src/spatial/adam/adamClient.ts', root), 'utf8')
const surfaces = fs.readFileSync(new URL('src/spatial/adam/adamSurfaceContext.ts', root), 'utf8')
const adamRoute = fs.readFileSync(new URL('src/app/adam/page.tsx', root), 'utf8')
const functions = fs.readFileSync(new URL('../../apps/functions/src/adamPresenceFunctions.ts', import.meta.url), 'utf8')
const functionsIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const firebaseConfig = JSON.parse(fs.readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'))
const previewConfig = JSON.parse(fs.readFileSync(new URL('../../.github/firebase.preview.json', import.meta.url), 'utf8'))
const routeManifest = JSON.parse(fs.readFileSync(new URL('../../release/route-manifest.json', import.meta.url), 'utf8'))

test('Adam is one governed runtime mounted at the product shell', () => {
  assert.match(layout, /AdamPresenceRuntime/)
  assert.match(layout, /Suspense/)
  assert.match(runtime, /data-urai-adam-presence="runtime-v1"/)
  assert.match(runtime, /Adam is UrAi’s digital Founder presence/)
  assert.match(runtime, /Human founder required/)
  assert.match(surfaces, /'home'/)
  assert.match(surfaces, /'council'/)
  assert.match(surfaces, /'support'/)
  assert.match(surfaces, /'onboarding'/)
  assert.match(surfaces, /'institutional-demo'/)
  assert.match(adamRoute, /data-urai-adam-route="canonical"/)
  assert.match(runtime, /pathname === '\/adam'/)
})

test('Adam conversation and Founder voice use dedicated protected server boundaries', () => {
  assert.match(client, /\/api\/urai\/adam\/conversation/)
  assert.match(client, /\/api\/urai\/adam\/voice/)
  assert.match(functionsIndex, /adamPresenceProvider/)
  assert.match(functionsIndex, /adamFounderVoiceProvider/)
  assert.match(functions, /verifyIdToken\([^,]+, true\)/)
  assert.match(functions, /privacyPolicy\/current/)
  assert.match(functions, /providerRateLimits/)
  assert.match(functions, /store: false/)
  assert.match(functions, /ADAM_PRESENCE_ENABLED/)
  assert.match(functions, /FOUNDER_VOICE_ENABLED/)
  assert.match(functions, /FOUNDER_ELEVENLABS_VOICE_ID/)
  assert.doesNotMatch(functions, /pNInz6obpgDQGcFmaJgB/)
  assert.match(functions, /not the live human Adam/)
  assert.match(functions, /requiresHumanFounder/)
  assert.doesNotMatch(functions, /request\.on\('close', \(\) => controller\.abort\(\)\)/)
  assert.equal((functions.match(/response\.on\('close', \(\) => \{ if \(!response\.writableEnded\) controller\.abort\(\) \}\)/g) ?? []).length, 2)
})

test('Founder voice cannot silently fall back to a stock identity', () => {
  assert.match(functions, /FOUNDER_VOICE_NOT_READY/)
  assert.match(functions, /FOUNDER_VOICE_ID_MISSING/)
  assert.match(client, /FOUNDER_VOICE_UNAVAILABLE|FOUNDER_VOICE_NOT_READY/)
  assert.match(runtime, /accepted private Founder voice/)
  assert.doesNotMatch(runtime, /speechSynthesis/)
})

test('Adam streams provider text before the structured response is fully complete', () => {
  assert.match(functions, /partialJsonStringField\(output, 'message'\)/)
  assert.match(functions, /status: 'streaming'/)
  assert.match(functions, /response\.write\(.*type: 'delta'/s)
  assert.doesNotMatch(functions, /for \(let offset = 0; offset < result\.message\.length; offset \+= 96\)/)
  assert.match(functions, /type: 'error', code: boundary\.code/)
})

test('Adam runtime includes interruption, voice input, captions and text fallback behavior', () => {
  assert.match(runtime, /SpeechRecognition/)
  assert.match(runtime, /stopVoice/)
  assert.match(runtime, /conversationAborter/)
  assert.match(runtime, /requestAdamFounderVoice/)
  assert.match(runtime, /result\.caption/)
  assert.match(runtime, /role="log"/)
  assert.match(runtime, /aria-live="polite"/)
})

test('Hosting and preview route Adam APIs only to secret-bound functions', () => {
  const required = [
    { source: '/api/urai/adam/conversation', function: { functionId: 'adamPresenceProvider', region: 'us-central1' } },
    { source: '/api/urai/adam/voice', function: { functionId: 'adamFounderVoiceProvider', region: 'us-central1' } },
  ]
  for (const expected of required) {
    assert.ok(firebaseConfig.hosting.rewrites.some((entry) => JSON.stringify(entry) === JSON.stringify(expected)))
    assert.ok(previewConfig.hosting.rewrites.some((entry) => JSON.stringify(entry) === JSON.stringify(expected)))
  }
})


test('Adam route authority remains explicit and unknown routes stay fail-closed', () => {
  assert.ok(routeManifest.criticalRoutes.includes('/adam'))
  assert.ok(routeManifest.classification.publicExact.includes('/adam'))
  assert.equal(routeManifest.unknownRoutePolicy, 'fail-release')
})

test('Adam launcher vacates canonical bottom-right control ownership across spatial routes', () => {
  assert.match(adamStyles, /\.launcher\s*\{[\s\S]*top:\s*50%[\s\S]*bottom:\s*auto[\s\S]*transform:\s*translateY\(-50%\)/)
  assert.doesNotMatch(adamStyles, /:global\(html\.urai-route-life-map\) \.launcher/)
})
