import assert from 'node:assert/strict'
import test from 'node:test'
import { applyPrecision, createPin, exportPins, geolocationErrorState, isValidCoordinate, parsePins } from '../src/spatial/places/geographicLocationVault.ts'

// Final exact-head trigger for the combined Mirror + geography stack.
test('validates coordinate bounds and malformed values', () => {
  assert.equal(isValidCoordinate({ latitude: 32.5, longitude: -94.7, accuracyMeters: 12 }), true)
  assert.equal(isValidCoordinate({ latitude: 91, longitude: 0 }), false)
  assert.equal(isValidCoordinate({ latitude: 0, longitude: -181 }), false)
  assert.equal(isValidCoordinate({ latitude: Number.NaN, longitude: 0 }), false)
  assert.equal(isValidCoordinate({ latitude: 0, longitude: 0, accuracyMeters: -1 }), false)
})

test('reduces precision before storage', () => {
  const coordinate = { latitude: 32.512345, longitude: -94.712345, accuracyMeters: 10 }
  assert.deepEqual(applyPrecision(coordinate, 'city'), { latitude: 32.51, longitude: -94.71, accuracyMeters: 10 })
  assert.deepEqual(applyPrecision(coordinate, 'approximate'), { latitude: 32.512, longitude: -94.712, accuracyMeters: 10 })
  assert.deepEqual(applyPrecision(coordinate, 'exact-private'), coordinate)
})

test('creates, parses, exports, and rejects malformed pins', () => {
  const pin = createPin({ id: 'pin-1', now: '2026-08-01T00:00:00.000Z', title: 'Home area', readablePlace: 'Longview', precision: 'city', coordinate: { latitude: 32.512345, longitude: -94.712345 } })
  assert.equal(pin.coordinate.latitude, 32.51)
  assert.equal(parsePins(JSON.stringify([pin, { broken: true }])).length, 1)
  assert.deepEqual(parsePins('{bad'), [])
  assert.equal(exportPins([pin], '2026-08-01T01:00:00.000Z').pins.length, 1)
})

test('maps browser permission failures to truthful states', () => {
  assert.equal(geolocationErrorState(1), 'denied')
  assert.equal(geolocationErrorState(2), 'unavailable')
  assert.equal(geolocationErrorState(3), 'timeout')
  assert.equal(geolocationErrorState(99), 'error')
})
