import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/lib/body-biometric-contract.ts', import.meta.url), 'utf8')
const flat = source.replace(/\s+/g, ' ')

const requiredSources = [
  'mock',
  'live-device',
  'passive-inference',
  'healthkit',
  'google-fit',
  'wearable',
]

const requiredReadings = [
  'heartRateBpm',
  'hrvMs',
  'respiratoryRatePerMin',
  'sleepDebtHours',
  'focusLoadPercent',
  'deviceStrainPercent',
  'movementPercent',
]

test('body biometric contract exposes all required provider kinds', () => {
  assert.match(source, /export type BodyBiometricSource =/)
  assert.match(source, /export const AVAILABLE_BODY_BIOMETRIC_SOURCES/)
  for (const provider of requiredSources) {
    assert.ok(source.includes(`"${provider}"`), `missing biometric provider: ${provider}`)
  }
})

test('body biometric contract returns normalized wellness readings', () => {
  assert.match(source, /export type NormalizedBiometricReadings = \{/)
  assert.match(source, /readings: NormalizedBiometricReadings/)
  for (const reading of requiredReadings) {
    assert.ok(source.includes(reading), `missing normalized biometric reading: ${reading}`)
  }
})

test('body biometric provider fallbacks stay permissioned and non-diagnostic', () => {
  assert.ok(flat.includes('AVAILABLE_BODY_BIOMETRIC_SOURCES.includes(source as BodyBiometricSource)'), 'source normalization must use the provider allowlist')
  assert.ok(source.includes('HealthKit provider seam requires user permission'), 'HealthKit fallback must mention permission requirement')
  assert.ok(source.includes('Google Fit provider seam requires user permission'), 'Google Fit fallback must mention permission requirement')
  assert.ok(source.includes('Wearable provider seam requires user permission'), 'wearable fallback must mention permission requirement')
  assert.ok(source.includes('Not medical telemetry.'), 'torso signal copy must avoid diagnostic framing')
  assert.ok(source.includes('not a clinical sleep assessment'), 'sleep copy must avoid diagnostic framing')
})

test('body biometric treats client user ids as public demo labels only', () => {
  assert.ok(source.includes('identityMode: "public-demo"'), 'body response must declare public-demo identity mode')
  assert.ok(source.includes('userIdSource: "default-demo" | "client-demo"'), 'body response must expose identity source')
  assert.ok(source.includes('PUBLIC_DEMO_USER_ID_PATTERN'), 'body response must validate public demo user ids')
  assert.ok(source.includes('isDemoFallback: identity.userIdSource === "default-demo"'), 'fallback identity must be derived from normalized identity source')
})
