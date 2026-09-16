import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const graphSource = fs.readFileSync(new URL('../src/spatial/lived-world/livedWorldGraph.ts', import.meta.url), 'utf8')
const policySource = fs.readFileSync(new URL('../src/spatial/lived-world/reconstructionPolicy.ts', import.meta.url), 'utf8')
const fieldSource = fs.readFileSync(new URL('../src/spatial/lived-world/globalEmotionalField.ts', import.meta.url), 'utf8')
const contextSource = fs.readFileSync(new URL('../src/spatial/lived-world/groundMemoryContext.ts', import.meta.url), 'utf8')
const boundarySource = fs.readFileSync(new URL('../src/app/ground/GroundPersonalizationBoundary.tsx', import.meta.url), 'utf8')
const groundPage = fs.readFileSync(new URL('../src/app/ground/page.tsx', import.meta.url), 'utf8')
const worldTypes = fs.readFileSync(new URL('../src/spatial/world/worldTypes.ts', import.meta.url), 'utf8')
const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const passportPage = fs.readFileSync(new URL('../src/app/passport/page.tsx', import.meta.url), 'utf8')
const publicGoodCard = fs.readFileSync(new URL('../src/app/passport/GlobalEmotionalFieldConsentCard.tsx', import.meta.url), 'utf8')
const privacyClient = fs.readFileSync(new URL('../src/lib/privacy/operationalPrivacyClient.ts', import.meta.url), 'utf8')
const publicGoodFunctions = fs.readFileSync(new URL('../../apps/functions/src/publicGoodConsent.ts', import.meta.url), 'utf8')
const functionIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const authority = fs.readFileSync(new URL('../../docs/URAI_PERSONALIZED_LIVED_WORLD_AUTHORITY_V1.md', import.meta.url), 'utf8')

test('Lived World Graph is provenance-first and covers terrestrial life entities', () => {
  for (const marker of ['place', 'building', 'room', 'vehicle-place', 'route', 'object', 'person-presence', 'memory', 'event', 'era', 'environment', 'emotional-association']) {
    assert.ok(graphSource.includes(`'${marker}'`), `missing lived-world entity ${marker}`)
  }
  for (const marker of ['confirmed', 'partial', 'unknown', 'sourceIds', 'confidence', 'userCorrectionRevision', 'autonomousDialogueAllowed: false']) assert.ok(graphSource.includes(marker))
  assert.ok(graphSource.includes('CONFIRMED_WITHOUT_SOURCE'))
  assert.ok(graphSource.includes('SENSITIVE_INFERENCE_REQUIRES_C4'))
})

test('personal reconstruction fails closed on consent, uncertainty and third-party identity', () => {
  for (const marker of ["granted(consent, 'location.context')", "granted(consent, 'inference.sensitive')", 'generic-fallback', 'UNKNOWN_AUTOBIOGRAPHICAL_FIDELITY', 'PERSON_PRESENCE_AUTHORITY_UNAVAILABLE', 'PARTIAL_RECONSTRUCTION_MUST_REMAIN_VISIBLY_BOUNDED']) assert.ok(policySource.includes(marker))
  assert.ok(policySource.includes('entity.thirdParty'))
  assert.ok(policySource.includes('entity.minorOrDependent'))
  assert.ok(policySource.includes('entity.griefOrLegacySensitive'))
})

test('Global Emotional Field is cohort aggregate only and suppresses unsafe location or sensitive cells', () => {
  assert.ok(fieldSource.includes('GLOBAL_EMOTIONAL_FIELD_DEFAULT_MINIMUM_COHORT = 100'))
  assert.ok(fieldSource.includes("tier: 'C8'"))
  assert.ok(fieldSource.includes('HIGHER_SENSITIVE_COHORT_THRESHOLD_REQUIRED'))
  assert.ok(fieldSource.includes("'country' | 'multi-region' | 'coarse-region'"))
  assert.ok(fieldSource.includes("purpose: 'inference.sensitive'"))
  assert.ok(fieldSource.includes("tier !== 'C4'"))
})

test('Passport has dedicated fail-closed C8 public-good consent without activating publication', () => {
  assert.ok(passportPage.includes('GlobalEmotionalFieldConsentCard'))
  assert.ok(publicGoodCard.includes("(['off', 'limited', 'on'] as const)"))
  assert.ok(publicGoodCard.includes('Default is <strong>Off</strong>'))
  assert.ok(publicGoodCard.includes('Absolute privacy floor: {snapshot.minimumCohortFloor} users'))
  assert.ok(publicGoodCard.includes('Location/sensitive cohorts require a separately approved higher threshold'))
  assert.ok(publicGoodCard.includes('What never contributes'))
  assert.ok(privacyClient.includes("callOperationalPrivacyFunction('getGlobalEmotionalFieldConsent')"))
  assert.ok(privacyClient.includes("callOperationalPrivacyFunction('applyGlobalEmotionalFieldConsent'"))
  assert.ok(functionIndex.includes('applyGlobalEmotionalFieldConsent'))
  assert.ok(functionIndex.includes('getGlobalEmotionalFieldConsent'))
  assert.ok(publicGoodFunctions.includes("mode: 'off'"))
  assert.ok(publicGoodFunctions.includes("consentTier: 'C8'"))
  assert.ok(publicGoodFunctions.includes("purpose: 'data.public-good.emotional-field'"))
  assert.ok(publicGoodFunctions.includes("providerState: 'not-activated'"))
  assert.ok(publicGoodFunctions.includes("publicationState: 'blocked-pending-governance-and-aggregate-provider'"))
  assert.ok(publicGoodFunctions.includes("minimumCohortFloor: 100"))
  for (const forbidden of ['individual emotion', 'exact location', 'raw voice', 'raw transcript', 'raw memory', 'movement trail', 'identifiable social graph', 'biometric template']) {
    assert.ok(publicGoodFunctions.includes(`'${forbidden}'`) || publicGoodFunctions.includes(forbidden), `missing forbidden contribution ${forbidden}`)
  }
})

test('Ground memory handoff preserves place, memory, provenance, fidelity and exact return origin', () => {
  for (const marker of ['placeId', 'memoryId', 'eraId', 'personPresenceIds', 'sourceIds', 'privacyPurposes', 'reconstructionFidelity', 'camera', 'returnToken']) assert.ok(contextSource.includes(marker))
  assert.ok(contextSource.includes('CONFIRMED_MEMORY_REQUIRES_SOURCE'))
  for (const marker of ['originRealm', 'returnToken', 'reconstructionFidelity', 'eraId']) assert.ok(worldTypes.includes(marker), `world context missing ${marker}`)
  assert.ok(worldEvents.includes("target.searchParams.set('originRealm', context.originRealm)"))
  assert.ok(worldEvents.includes("target.searchParams.set('returnToken', context.returnToken)"))
  assert.ok(worldEvents.includes("target.searchParams.set('fidelity', context.reconstructionFidelity)"))
})

test('Ground route mounts the fail-closed personalization boundary and retires stale compass/checkpoint owners', () => {
  assert.ok(groundPage.includes('GroundPersonalizationBoundary'))
  assert.ok(groundPage.includes('personal-lived-world-with-non-personal-fallback'))
  assert.equal(groundPage.includes('GroundCheckpointRestoreSignal'), false)
  assert.equal(groundPage.includes('GroundFocusContainment'), false)
  assert.ok(boundarySource.includes('data-ground-demo-substitution="forbidden"'))
  assert.ok(boundarySource.includes('data-ground-unknown-is-first-class="true"'))
  assert.ok(boundarySource.includes('No authorized personal reconstruction is mounted'))
})

test('founder-locked lived-world authority rejects invented autobiography and preserves privacy truth', () => {
  for (const marker of [
    "Ground is the user's terrestrial lived world",
    'Generated detail must never be presented as observed autobiographical fact',
    'People are memory-presences, not autonomous NPCs',
    'Global Emotional Field is a cohort-level public-good aggregate',
    'Replay -> Focus -> Ground',
    'Real source authority wins over symbolism',
  ]) assert.ok(authority.includes(marker), marker)
})
