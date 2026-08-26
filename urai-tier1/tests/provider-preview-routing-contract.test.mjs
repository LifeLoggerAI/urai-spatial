import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const previewConfig = JSON.parse(fs.readFileSync(new URL('../../.github/firebase.preview.json', import.meta.url), 'utf8'))

const requiredProviderRewrites = [
  { source: '/api/urai/orb/openai', function: { functionId: 'openAiOrbProvider', region: 'us-central1' } },
  { source: '/api/urai/narrator/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
  { source: '/api/voice/elevenlabs', function: { functionId: 'elevenLabsVoiceProvider', region: 'us-central1' } },
]

function hasRewrite(candidate) {
  return previewConfig.hosting.rewrites?.some((rewrite) => (
    rewrite.source === candidate.source
    && rewrite.function?.functionId === candidate.function.functionId
    && rewrite.function?.region === candidate.function.region
  ))
}

test('governed Firebase preview routes every live Orb and voice provider request to Functions', () => {
  assert.equal(previewConfig.hosting.public, 'urai-tier1/out')
  for (const rewrite of requiredProviderRewrites) {
    assert.ok(hasRewrite(rewrite), `preview missing provider rewrite: ${rewrite.source}`)
  }
})

test('provider preview routing remains same-origin and contains no direct provider URL', () => {
  const serialized = JSON.stringify(previewConfig)
  assert.doesNotMatch(serialized, /api\.openai\.com/i)
  assert.doesNotMatch(serialized, /api\.elevenlabs\.io/i)
})
