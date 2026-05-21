import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const gateSource = read('src/spatial/xr/xrBetaGate.ts')

test('Phase 7 XR beta gate defines explicit status and fallback contract', () => {
  for (const snippet of [
    'export type XrBetaGateInput',
    'export type XrBetaGateStatus',
    'export type XrBetaGateResult',
    "'disabled'",
    "'unsupported'",
    "'consent-required'",
    "'entitlement-required'",
    "'beta-ready'",
    "fallbackMode: 'spatial-web'",
    'canRequestSession: boolean',
  ]) {
    assert.ok(gateSource.includes(snippet), `XR beta gate missing ${snippet}`)
  }
})

test('Phase 7 XR beta gate is flag first and non-blocking for V1 web', () => {
  assert.match(gateSource, /NEXT_PUBLIC_SPATIAL_XR_ENABLED/)
  assert.match(gateSource, /if \(!input\.flagEnabled\)/)
  assert.match(gateSource, /status: 'disabled'/)
  assert.match(gateSource, /canRequestSession: false/)
  assert.match(gateSource, /fallbackMode: 'spatial-web'/)
})

test('Phase 7 XR beta gate checks secure context and browser support before consent', () => {
  assert.match(gateSource, /if \(!input\.secureContext\)/)
  assert.match(gateSource, /XR requires a secure browser context/)
  assert.match(gateSource, /if \(!input\.hasNavigatorXr \|\| \(!input\.immersiveArSupported && !input\.immersiveVrSupported\)\)/)
  assert.match(gateSource, /does not expose a supported immersive XR session/)
})

test('Phase 7 XR beta gate requires consent and private beta entitlement', () => {
  assert.match(gateSource, /if \(!input\.consentGranted\)/)
  assert.match(gateSource, /XR requires explicit session consent/)
  assert.match(gateSource, /if \(input\.betaEntitled === false\)/)
  assert.match(gateSource, /private beta entitlement group/)
})

test('Phase 7 browser support detector only inspects navigator.xr support', () => {
  assert.match(gateSource, /detectBrowserXrSupport/)
  assert.match(gateSource, /isSessionSupported\('immersive-ar'\)/)
  assert.match(gateSource, /isSessionSupported\('immersive-vr'\)/)
  assert.doesNotMatch(gateSource, /requestSession\(/)
  assert.doesNotMatch(gateSource, /getUserMedia\(/)
})
