import assert from 'node:assert/strict'
import test from 'node:test'
import { assertExactHomeOrbOpenTransportFailure } from './lib/home-orb-reconciliation-signature.mjs'

const exactHead = '9ff97275f08f6b8e41f2fe92510659767d296d26'
const predicate = `TimeoutError: locator.click: Timeout 30000ms exceeded.\nCall log:\n  - waiting for getByRole('button', { name: 'Open UrAi Orb companion' }).first()\n    - locator resolved to <button data-testid="home-semantic-orb">Open UrAi Orb companion</button>\n  - attempting click action\n    - waiting for element to be visible, enabled and stable\n    - element is visible, enabled and stable`

function fixture(overrides = {}) {
  return {
    exactHead,
    failedPredicate: predicate,
    failingRecord: {
      id: 'orb-lifecycle-production-ui',
      pageErrors: [],
      providerBoundaryRequests: [],
    },
    ...overrides,
  }
}

test('accepts the retained exact Orb-open pointer transport signature from current Playwright', () => {
  assert.equal(assertExactHomeOrbOpenTransportFailure({ failure: fixture(), exactHead }), true)
})

test('accepts the equivalent legacy Playwright click-dispatch wording', () => {
  const legacy = fixture({ failedPredicate: predicate.replace('attempting click action', 'performing click action') })
  assert.equal(assertExactHomeOrbOpenTransportFailure({ failure: legacy, exactHead }), true)
})

for (const [name, mutate] of [
  ['wrong SHA', (value) => ({ ...value, exactHead: 'predecessor' })],
  ['wrong lifecycle', (value) => ({ ...value, failingRecord: { ...value.failingRecord, id: 'other' } })],
  ['page error', (value) => ({ ...value, failingRecord: { ...value.failingRecord, pageErrors: ['boom'] } })],
  ['provider request', (value) => ({ ...value, failingRecord: { ...value.failingRecord, providerBoundaryRequests: [{}] } })],
  ['checkbox timeout', (value) => ({ ...value, failedPredicate: value.failedPredicate.replace('locator.click', 'locator.check') })],
  ['wrong control', (value) => ({ ...value, failedPredicate: value.failedPredicate.replaceAll('Open UrAi Orb companion', 'Other') })],
  ['missing canonical test id', (value) => ({ ...value, failedPredicate: value.failedPredicate.replace('data-testid="home-semantic-orb"', 'data-testid="other"') })],
  ['missing actionability', (value) => ({ ...value, failedPredicate: value.failedPredicate.replace('element is visible, enabled and stable', '') })],
  ['missing dispatch', (value) => ({ ...value, failedPredicate: value.failedPredicate.replace('attempting click action', '') })],
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => assertExactHomeOrbOpenTransportFailure({ failure: mutate(fixture()), exactHead }))
  })
}
