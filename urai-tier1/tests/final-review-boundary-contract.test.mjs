import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const providerFunctions = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')
const captureScript = fs.readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
const portalWrapper = fs.readFileSync(new URL('../../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs', import.meta.url), 'utf8')

test('Orb moderation covers every bounded context item and the current message before upstream processing', () => {
  assert.match(providerFunctions, /const moderationInput = \[/)
  assert.match(providerFunctions, /\.\.\.context\.map\(/)
  assert.match(providerFunctions, /Current user message: \$\{message\}/)
  assert.match(providerFunctions, /input: moderationInput/)
  assert.match(providerFunctions, /moderationResult\.results\.length !== moderationInput\.length/)
  assert.match(providerFunctions, /moderationResult\.results\.some\(\(result\) => result\.flagged === true\)/)
})

test('portal diagnostics classify failed requests and ignore only the exact document GET navigation abort', () => {
  assert.match(captureScript, /method: request\.method\(\)/)
  assert.match(captureScript, /resourceType: request\.resourceType\(\)/)
  assert.match(captureScript, /isNavigationRequest: request\.isNavigationRequest\(\)/)
  assert.match(portalWrapper, /request\.method === 'GET'/)
  assert.match(portalWrapper, /request\.resourceType === 'document'/)
  assert.match(portalWrapper, /request\.isNavigationRequest === true/)
  assert.match(portalWrapper, /requestUrl\.href === routeEvidence\.href/)
  assert.match(portalWrapper, /routeEvidence\?\.lifecycleObserved/)
})
