import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyPrecision,
  createPin,
  exportPins,
  isValidCoordinate,
  parsePins,
} from '../src/spatial/places/geographicLocationVault.ts'

test('validates granted coordinates and rejects malformed values', () => {
  assert.equal(isValidCoordinate({ latitude: 32.5007, longitude: -94.7405, accuracyMeters: 18 }), true)
  assert.equal(isValidCoordinate({ latitude: 91, longitude: 0 }), false)
  assert.equal(isValidCoordinate({ latitude: 0, longitude: -181 }), false)
  assert.equal(isValidCoordinate({ latitude: Number.NaN, longitude: 0 }), false)
})

test('limits retained precision before storage', () => {
  const source = { latitude: 32.500712, longitude: -94.740523, accuracyMeters: 15 }
  assert.deepEqual(applyPrecision(source, 'city'), { latitude: 32.5, longitude: -94.74, accuracyMeters: 15 })
  assert.deepEqual(applyPrecision(source, 'approximate'), { latitude: 32.501, longitude: -94.741, accuracyMeters: 15 })
  assert.deepEqual(applyPrecision(source, 'exact-private'), source)
})

test('creates, exports, parses, and deletes location records without analytics payloads', () => {
  const pin = createPin({
    id: 'place-test',
    title: 'Current place',
    coordinate: { latitude: 32.500712, longitude: -94.740523 },
    readablePlace: 'Longview, Texas',
    precision: 'approximate',
    now: '2026-08-01T12:00:00.000Z',
  })
  assert.deepEqual(pin.coordinate, { latitude: 32.501, longitude: -94.741, accuracyMeters: undefined })
  const parsed = parsePins(JSON.stringify([pin]))
  assert.equal(parsed.length, 1)
  const exported = exportPins(parsed, '2026-08-01T12:01:00.000Z')
  assert.equal(exported.schemaVersion, 'urai-location-vault-1')
  assert.equal(exported.pins[0].readablePlace, 'Longview, Texas')
  assert.equal(JSON.stringify(exported).includes('analytics'), false)
  assert.deepEqual(parsePins('malformed'), [])
  assert.deepEqual(parsePins(JSON.stringify([])), [])
})
