import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const page = fs.readFileSync(new URL('../src/app/ground/page.tsx', import.meta.url), 'utf8')
const boundary = fs.readFileSync(new URL('../src/app/ground/GroundPersonalizationBoundary.tsx', import.meta.url), 'utf8')
const bridge = fs.readFileSync(new URL('../src/app/ground/GroundGeographicLivedWorldBridge.tsx', import.meta.url), 'utf8')

test('Ground mounts one fail-closed personalization boundary without resurrecting retired compass/checkpoint owners', () => {
  assert.match(page, /GroundGeographicLivedWorldBridge/)
  assert.match(page, /GroundPersonalizationBoundary/)
  assert.match(page, /GroundSemanticReturnBridge/)
  assert.match(page, /data-ground-personalization="personal-lived-world-with-non-personal-fallback"/)
  assert.doesNotMatch(page, /GroundCheckpointRestoreSignal|GroundFocusContainment|ground-focus-containment\.css/)
})

test('Ground personalization remains explicitly non-autobiographical when authorized source-backed data is unavailable', () => {
  assert.match(boundary, /data-ground-demo-substitution="forbidden"/)
  assert.match(boundary, /data-ground-unknown-is-first-class="true"/)
  assert.match(boundary, /No authorized personal reconstruction is mounted\. Ground is using a non-personal environmental fallback\./)
  assert.match(boundary, /validateLivedWorldGraph/)
  assert.match(boundary, /revokeDependentPersonalization/)
})

test('saved geographic pins seed only private partial C3 place anchors and never request new location or infer home or work', () => {
  assert.match(bridge, /It performs no location request/)
  assert.match(bridge, /sourceType: 'device-location'/)
  assert.match(bridge, /placeType: 'other'/)
  assert.match(bridge, /fidelity: 'partial'/)
  assert.match(bridge, /requiredPurposes: \['location\.context'\]/)
  assert.match(bridge, /consentTiers: \['C3'\]/)
  assert.match(bridge, /visibility: 'private'/)
  assert.match(bridge, /publicContributionAllowed: false/)
  assert.match(bridge, /policy\.domains\.location\.mode !== 'denied'/)
  assert.match(bridge, /policy\.domains\.location\.mode !== 'paused'/)
  assert.match(bridge, /clearBridgeGraph\(\)/)
  assert.doesNotMatch(bridge, /navigator\.geolocation/)
  assert.doesNotMatch(bridge, /placeType: 'home'|placeType: 'workplace'/)
  assert.doesNotMatch(bridge, /fidelity: 'confirmed'/)
})
