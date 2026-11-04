import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultConsentPolicy, isConsentPolicy } from '../src/app/privacy-controls/consentModel.ts'

const owner = 'owner-verified-test'
const base = () => defaultConsentPolicy(owner)

const invalidCases = [
  ['missing enforcement state', (p) => ({ ...p, enforcement: {} })],
  ['missing affected targets', (p) => ({ ...p, enforcement: { state: 'fully-enforced', jobId: null, providerState: 'complete' } })],
  ['wrong enforcement state', (p) => ({ ...p, enforcement: { ...p.enforcement, state: 'invented' } })],
  ['wrong provider state', (p) => ({ ...p, enforcement: { ...p.enforcement, providerState: 'invented' } })],
  ['non-array affected targets', (p) => ({ ...p, enforcement: { ...p.enforcement, affectedTargets: 'storage' } })],
  ['bad affected target entry', (p) => ({ ...p, enforcement: { ...p.enforcement, affectedTargets: [44] } })],
  ['non-null invalid job identifier', (p) => ({ ...p, enforcement: { ...p.enforcement, jobId: {} } })],
  ['negative revision', (p) => ({ ...p, revision: -1 })],
  ['fractional revision', (p) => ({ ...p, revision: 0.5 })],
  ['NaN revision', (p) => ({ ...p, revision: NaN })],
  ['wrong owner', (p) => ({ ...p, ownerId: 'other-owner' })],
  ['missing domain control fields', (p) => ({ ...p, domains: { ...p.domains, memory: { mode: 'granted' } } })],
  ['wrong boolean control type', (p) => ({ ...p, domains: { ...p.domains, location: { ...p.domains.location, precise: 'yes' } } })],
  ['missing one domain', (p) => { const { workforce, ...domains } = p.domains; return { ...p, domains } }],
  ['negative retention', (p) => ({ ...p, domains: { ...p.domains, memory: { ...p.domains.memory, retentionDays: -1 } } })],
]

test('original default full-shape owner policy remains structurally valid', () => {
  assert.equal(isConsentPolicy(base(), owner), true)
})

test('valid persisted pending policy remains valid', () => {
  const p = base()
  p.revision = 11
  p.enforcement = { state: 'pending', providerState: 'pending', jobId: 'review-job-11', affectedTargets: ['storage-broker'] }
  assert.equal(isConsentPolicy(p, owner), true)
})

for (const [label, mutate] of invalidCases) {
  test('malformed policy rejected: ' + label, () => {
    assert.equal(isConsentPolicy(mutate(base()), owner), false)
  })
}
