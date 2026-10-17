import assert from 'node:assert/strict'
import test from 'node:test'
import { createGeographicLocationRequest } from '../src/spatial/places/geographicLocationRequest.ts'

const position = { coords: { latitude: 41.123456, longitude: -72.987654, accuracy: 12 } }
function fixture(overrides = {}) {
  let authority = { mounted: true, online: true, storageAvailable: true, ownerId: 'owner-a', currentAuthOwnerId: 'owner-a', state: 'ready', mode: 'granted', revision: 3, precise: true, ...overrides }
  const calls = [], accepted = [], errors = []
  let requested = 0, retained = 0, invalid = 0, storageFailed = 0
  const request = createGeographicLocationRequest(() => authority, {
    requested: () => requested++, retainConsent: () => retained++,
    accepted: (coordinate, precise) => accepted.push({ coordinate, precise }),
    invalid: () => invalid++, failed: code => errors.push(code), storageFailed: () => storageFailed++,
  })
  const geolocation = { getCurrentPosition: (success, error, options) => calls.push({ success, error, options }) }
  return { request, geolocation, calls, accepted, errors, change: patch => { authority = { ...authority, ...patch } }, counters: () => ({ requested, retained, invalid, storageFailed }) }
}

test('a current precise grant accepts one bounded foreground result and suppresses duplicate callbacks', () => {
  const f = fixture()
  assert.equal(f.request.request(f.geolocation), true)
  assert.deepEqual(f.calls[0].options, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 })
  f.calls[0].success(position)
  f.calls[0].success(position); f.calls[0].error({ code: 1 })
  assert.deepEqual(f.accepted, [{ coordinate: { latitude: 41.123456, longitude: -72.987654, accuracyMeters: 12 }, precise: true }])
  assert.equal(f.counters().retained, 1)
  assert.deepEqual(f.errors, [])
})

test('signed-out local use stays approximate and never publishes the raw coordinate', () => {
  const f = fixture({ ownerId: null, currentAuthOwnerId: null, state: 'signed-out', mode: 'limited', revision: 0, precise: false })
  assert.equal(f.request.request(f.geolocation), true)
  f.calls[0].success(position)
  assert.equal(f.accepted[0].precise, false)
  assert.notEqual(f.accepted[0].coordinate.latitude, position.coords.latitude)
  assert.notEqual(f.accepted[0].coordinate.longitude, position.coords.longitude)
})

for (const [label, change] of Object.entries({
  'sign-out': { currentAuthOwnerId: null }, 'owner replacement': { currentAuthOwnerId: 'owner-b' },
  'policy loading': { state: 'loading' }, 'policy read failure': { state: 'unavailable' },
  'policy denial': { mode: 'denied' }, 'policy pause': { mode: 'paused' },
  'policy revision': { revision: 4 }, 'precise grant revocation': { precise: false },
  'private storage failure': { storageAvailable: false }, 'offline transition': { online: false },
  'unmount': { mounted: false },
})) test(`a delayed success and error cannot publish after ${label}`, () => {
  const f = fixture()
  f.request.request(f.geolocation)
  f.change(change)
  f.calls[0].success(position); f.calls[0].error({ code: 3 })
  assert.deepEqual(f.accepted, [])
  assert.deepEqual(f.errors, [])
  assert.equal(f.counters().retained, 0)
})

test('blocked or mismatched authority never requests device location', () => {
  for (const change of [{ mounted: false }, { online: false }, { storageAvailable: false }, { currentAuthOwnerId: 'other' }, { state: 'loading' }, { state: 'unavailable' }, { mode: 'denied' }, { mode: 'paused' }, { revision: -1 }, { revision: 0.5 }, { state: 'ready', ownerId: null, currentAuthOwnerId: null }]) {
    const f = fixture(change)
    assert.equal(f.request.request(f.geolocation), false)
    assert.equal(f.calls.length, 0)
    assert.equal(f.counters().requested, 0)
  }
})

test('a cancellation before the device call or while retaining consent suppresses publication', () => {
  let mounted = true, requested = 0, accepted = 0, callbacks
  const authority = () => ({ mounted, online: true, storageAvailable: true, ownerId: null, currentAuthOwnerId: null, state: 'signed-out', mode: 'limited', revision: 0, precise: false })
  const before = createGeographicLocationRequest(authority, { requested: () => { mounted = false }, retainConsent: () => {}, accepted: () => accepted++, invalid: () => {}, failed: () => {}, storageFailed: () => {} })
  assert.equal(before.request({ getCurrentPosition: () => requested++ }), false)
  assert.equal(requested, 0)
  mounted = true
  const during = createGeographicLocationRequest(authority, { requested: () => {}, retainConsent: () => { mounted = false }, accepted: () => accepted++, invalid: () => {}, failed: () => {}, storageFailed: () => {} })
  during.request({ getCurrentPosition: success => { callbacks = success } })
  callbacks(position)
  assert.equal(accepted, 0)
})

test('immediate revocation, deletion, permission change or lifecycle cancellation cannot be undone by an old callback', () => {
  for (const boundary of ['revoke', 'delete', 'storage clear', 'browser permission', 'policy observer', 'auth observer', 'unmount']) {
    const f = fixture()
    f.request.request(f.geolocation)
    assert.equal(f.request.cancel(), true, boundary)
    assert.equal(f.request.cancel(), false, boundary)
    f.request.request(f.geolocation)
    f.calls[0].success(position); f.calls[0].error({ code: 1 })
    assert.equal(f.counters().retained, 0, boundary)
    assert.deepEqual(f.accepted, [], boundary)
    f.calls[1].success(position)
    assert.equal(f.counters().retained, 1, boundary)
    assert.equal(f.accepted.length, 1, boundary)
    assert.deepEqual(f.errors, [], boundary)
  }
})

test('restoring the same grant after an observed revocation does not resurrect its old request', () => {
  const f = fixture()
  f.request.request(f.geolocation)
  f.change({ mode: 'denied' }); f.request.cancel(); f.change({ mode: 'granted' })
  f.calls[0].success(position)
  assert.equal(f.counters().retained, 0)
  assert.deepEqual(f.accepted, [])
})

test('invalid coordinates and current device errors never retain a consent flag', () => {
  const f = fixture()
  f.request.request(f.geolocation)
  f.calls[0].success({ coords: { latitude: Infinity, longitude: 0, accuracy: 0 } })
  assert.equal(f.counters().invalid, 1); assert.equal(f.counters().retained, 0)
  assert.deepEqual(f.accepted, [])
  f.request.request(f.geolocation); f.calls[1].error({ code: 1 })
  assert.deepEqual(f.errors, [1]); assert.equal(f.counters().retained, 0)
})

test('storage retention failure and synchronous device failure remain closed', () => {
  const authority = { mounted: true, online: true, storageAvailable: true, ownerId: null, currentAuthOwnerId: null, state: 'signed-out', mode: 'limited', revision: 0, precise: false }
  let success, accepted = 0, storageFailed = 0
  const errors = []
  const request = createGeographicLocationRequest(() => authority, { requested: () => {}, retainConsent: () => { throw new Error('storage unavailable') }, accepted: () => accepted++, invalid: () => {}, failed: code => errors.push(code), storageFailed: () => storageFailed++ })
  request.request({ getCurrentPosition: callback => { success = callback } })
  success(position); success(position)
  assert.equal(accepted, 0); assert.equal(storageFailed, 1)
  request.request({ getCurrentPosition: () => { throw new Error('device unavailable') } })
  assert.deepEqual(errors, [2])
})
