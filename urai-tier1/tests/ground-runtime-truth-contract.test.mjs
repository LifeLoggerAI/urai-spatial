import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const page = fs.readFileSync(new URL('../src/app/ground/page.tsx', import.meta.url), 'utf8')
const truthBridge = fs.readFileSync(new URL('../src/app/ground/GroundRuntimeTruthBridge.tsx', import.meta.url), 'utf8')
const geographicBridge = fs.readFileSync(new URL('../src/app/ground/GroundGeographicLivedWorldBridge.tsx', import.meta.url), 'utf8')
const privacyManifest = fs.readFileSync(new URL('../../privacy/feature-manifests/personalized-lived-world.privacy.yaml', import.meta.url), 'utf8')

test('Ground active DOM truth tracks authorized partial place anchors without exposing graph content', () => {
  assert.ok(page.includes('GroundRuntimeTruthBridge'))
  assert.ok(truthBridge.includes("GRAPH_SESSION_KEY = 'urai:lived-world:graph:v1'"))
  assert.ok(truthBridge.includes("BRIDGE_POLICY_PREFIX = 'geographic-vault:'"))
  assert.ok(truthBridge.includes("'partial-place-anchors'"))
  assert.ok(truthBridge.includes("'data-ground-private-location-mounted'"))
  assert.ok(truthBridge.includes("window.addEventListener('urai:lived-world-graph-changed', sync)"))
  assert.equal(truthBridge.includes('latitude'), false)
  assert.equal(truthBridge.includes('longitude'), false)
})

test('Ground runtime never announces a physical follower Orb', () => {
  assert.ok(truthBridge.includes("'semantic-only-no-follower-model'"))
  assert.ok(truthBridge.includes('no follower Orb model is mounted'))
  assert.ok(truthBridge.includes("'data-ground-orb-presence'"))
})

test('active geographic producer remains an existing-C3 local bridge, not a new collector', () => {
  assert.ok(geographicBridge.includes('It performs no location request'))
  assert.equal(geographicBridge.includes('navigator.geolocation'), false)
  assert.ok(privacyManifest.includes('active_fail_closed_bridge'))
  assert.ok(privacyManifest.includes('performs_no_new_geolocation_request'))
  assert.ok(privacyManifest.includes('never_infers_home_or_workplace_from_coordinate_or_label'))
  assert.ok(privacyManifest.includes('never_promotes_pin_only_evidence_to_confirmed_geometry'))
  assert.ok(privacyManifest.includes('photo/scan geometry producer'))
  assert.ok(privacyManifest.includes('person likeness pipeline'))
})
