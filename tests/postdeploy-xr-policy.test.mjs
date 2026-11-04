import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  conditionalXrRoutes,
  expectedConditionalXrStatus,
  inspectConditionalXrResponse,
  inspectXrDeployProof,
  readXrReleaseAuthority,
} from '../scripts/lib/xr-release-authority.mjs'

const postdeploy = readFileSync(new URL('../scripts/urai-post-deploy-smoke.mjs', import.meta.url), 'utf8')
const boundary = readFileSync(new URL('../urai-tier1/src/lib/spatial-launch-boundaries.ts', import.meta.url), 'utf8')
const authority = readXrReleaseAuthority(boundary)
const disabledPreview = '<main data-xr-release-state="technical-preview" data-xr-immersive-authority="disabled">URAI AR / VR / XR entry chamber. Live WebXR headset sessions remain disabled.</main>'
const response = (pathname, status, origin = 'https://urai.app') => ({ url: origin + pathname, status })
const proof = () => ({
  publicRoutes: ['/home', '/login'],
  requiredSmokeRoutes: ['/home', '/login'],
  conditionalRoutes: conditionalXrRoutes.map(route => ({
    route, enabled: false, expectedStatus: expectedConditionalXrStatus(route, authority),
    previewOnly: route === '/spatial/ar-vr',
  })),
  claimBoundaries: { webxr: authority.claim, questBrowser: 'unverified-until-device-proof' },
})

test('actual canonical XR source remains disabled until independent release proof', () => {
  assert.equal(authority.enabled, false)
  assert.equal(authority.expectedStatus, 404)
})
test('post-deploy script does not claim either XR route as ordinary 200 HTML', () => {
  const ordinaryRoutes = postdeploy.split('const contracts = [')[1].split('const serverContracts = [')[0]
  assert.ok(!ordinaryRoutes.includes("['/xr',"))
  assert.ok(!ordinaryRoutes.includes("['/spatial/ar-vr',"))
})
test('post-deploy loop actually checks source-governed XR plus exact preview SHA', () => {
  assert.match(postdeploy, /for \(const route of conditionalXrRoutes\)/)
  assert.match(postdeploy, /inspectConditionalXrResponse\(response, requested\.toString\(\), xrAuthority, html\)/)
  assert.match(postdeploy, /response\.status !== 200 \|\| sha === expectedSha/)
})
test('post-deploy overall success requires all XR checks and a valid fingerprint', () => {
  assert.match(postdeploy, /xrResults\.every\(\(result\) => result\.passed\)/)
  assert.match(postdeploy, /&& fingerprint\.passed/)
  assert.match(postdeploy, /xrResults,\s+systemProofResults/)
})
test('deploy proof is checked against exact governed XR routes and claim', () => {
  assert.match(postdeploy, /inspectXrDeployProof\(payload, xrAuthority\)/)
  assert.equal(inspectXrDeployProof(proof(), authority), true)
})
test('source-governed disabled /xr 404 passes as denial, not broken availability', () => {
  assert.equal(inspectConditionalXrResponse(response('/xr/', 404), 'https://urai.app/xr', authority, ''), true)
})
test('enabled immersive /xr 200 cannot be accepted while disabled', () => {
  assert.equal(inspectConditionalXrResponse(response('/xr/', 200), 'https://urai.app/xr', authority, 'URAI XR World'), false)
})
test('nonimmersive 200 preview is accepted only with all explicit status markers', () => {
  assert.equal(inspectConditionalXrResponse(response('/spatial/ar-vr/', 200), 'https://urai.app/spatial/ar-vr', authority, disabledPreview), true)
})
test('preview without disabled immersive marker is rejected', () => {
  assert.equal(inspectConditionalXrResponse(response('/spatial/ar-vr/', 200), 'https://urai.app/spatial/ar-vr', authority, disabledPreview.replace('data-xr-immersive-authority="disabled"', '')), false)
})
test('foreign-origin XR redirect is rejected', () => {
  assert.equal(inspectConditionalXrResponse(response('/xr', 404, 'https://evil.invalid'), 'https://urai.app/xr', authority, ''), false)
})
test('wrong XR path and status are rejected even when body claims preview', () => {
  assert.equal(inspectConditionalXrResponse(response('/spatial/ar-vr-fake', 200), 'https://urai.app/spatial/ar-vr', authority, disabledPreview), false)
  assert.equal(inspectConditionalXrResponse(response('/spatial/ar-vr', 404), 'https://urai.app/spatial/ar-vr', authority, disabledPreview), false)
})
test('deploy proof cannot put XR into ordinary public route list', () => {
  const p = proof(); p.publicRoutes.push('/xr')
  assert.equal(inspectXrDeployProof(p, authority), false)
})
test('deploy proof rejects unauthorized XR enabled claim', () => {
  const p = proof(); p.conditionalRoutes[0].enabled = true
  assert.equal(inspectXrDeployProof(p, authority), false)
})
test('deploy proof rejects forged headset capability claim', () => {
  const p = proof(); p.claimBoundaries.questBrowser = 'certified'
  assert.equal(inspectXrDeployProof(p, authority), false)
})
test('receipt includes explicit source authority, four XR results and failure propagation', () => {
  assert.match(postdeploy, /checkedXrVariants: xrResults\.length/)
  assert.match(postdeploy, /xrSourceAuthority: \{ enabled: xrAuthority\.enabled/)
  assert.match(postdeploy, /passed: false/)
})
