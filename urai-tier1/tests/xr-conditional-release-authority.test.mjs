import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ts = createRequire(import.meta.url)('typescript')
const sourceRoot = fileURLToPath(new URL('../..', import.meta.url))
const root = process.env.URAI_REPAIR_SOURCE_ROOT || sourceRoot
const helpers = await import(pathToFileURL(path.join(sourceRoot, 'scripts/lib/xr-release-authority.mjs')))
const boundarySource = fs.readFileSync(path.join(root, 'urai-tier1/src/lib/spatial-launch-boundaries.ts'), 'utf8')
const authority = helpers.readXrReleaseAuthority(boundarySource)
function loadTs(relative, require) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(js, { exports, require, process: { env: { GITHUB_SHA: 'a'.repeat(40) } } })
  return exports
}
const boundary = loadTs('urai-tier1/src/lib/spatial-launch-boundaries.ts', () => { throw new Error('Unexpected boundary dependency') })
const route = loadTs('urai-tier1/src/app/api/system/deploy-proof/route.ts', (name) => {
  if (name === 'next/server') return { NextResponse: { json: (value) => value } }
  assert.equal(name, '@/lib/spatial-launch-boundaries'); return boundary
})
const proof = await route.GET()
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release/route-manifest.json'), 'utf8'))
test('actual disabled source boundary preserves no real-device acceptance', () => { assert.equal(authority.enabled, false); assert.equal(authority.expectedStatus, 404); assert.equal(authority.claim, 'governed-post-launch-gated') })
test('actual deployed-proof handler excludes conditional XR from required public routes', () => assert.equal(helpers.inspectXrDeployProof(proof, authority), true))
test('actual route manifest classifies both XR routes conditionally without public acceptance', () => {
  for (const value of helpers.conditionalXrRoutes) {
    assert.equal(manifest.criticalRoutes.includes(value), false)
    assert.equal(manifest.classification.publicExact.includes(value), false)
    assert.ok(manifest.classification.conditionalExact.includes(value))
    assert.ok(manifest.conditionalRoutes.some((entry) => entry.route === value && entry.disabledStatus === 404 && entry.deviceAcceptance === false))
  }
})
for (const source of ['liveArWebXrEnabled: config,', '// liveArWebXrEnabled: true,', 'liveArWebXrEnabled: false,\nliveArWebXrEnabled: true,', '']) {
  test('missing, nonliteral or ambiguous XR authority fails closed: ' + source.slice(0, 35), () => assert.throws(() => helpers.readXrReleaseAuthority(source)))
}
test('environment expectation cannot enable disabled governed source', () => { assert.throws(() => helpers.readXrReleaseAuthority(boundarySource, 'true')); assert.throws(() => helpers.readXrReleaseAuthority(boundarySource, 'yes')); assert.equal(helpers.readXrReleaseAuthority(boundarySource, 'false').enabled, false) })
test('source-enabled metadata still requires device and release proof', () => { const enabled = helpers.readXrReleaseAuthority('liveArWebXrEnabled: true,'); assert.equal(enabled.expectedStatus, 200); assert.equal(enabled.claim, 'source-enabled-pending-device-and-release-proof') })
for (const response of [{ status: 200, url: 'https://candidate.example/xr' }, { status: 404, url: 'https://foreign.example/xr' }, { status: 404, url: 'https://candidate.example/status' }, { status: 404, url: 'https://user:pass@candidate.example/xr' }, { status: 404, url: 'invalid' }]) {
  test('conditional gate rejects incorrect response status/origin/path', () => assert.equal(helpers.inspectConditionalXrResponse(response, 'https://candidate.example/xr', authority), false))
}
test('conditional gate accepts exact candidate 404 and slash parity', () => assert.equal(helpers.inspectConditionalXrResponse({ status: 404, url: 'https://candidate.example/xr/' }, 'https://candidate.example/xr', authority), true))
const publicBody = `<html><body>Own your life. Step inside yourself. Ground below · memory above Home threshold Sky route Orb companion memory life Ascent Life Map Portal URAI Life Map step inside your private constellation urai-final-focus-chamber Selected memory chamber. Replay thread film Unwind return See the pattern clearly. Mirror is the reflection realm Orb reflection passport-ownership-vault UrAi Passport Ownership key consent-sanctuary UrAi Consent Sanctuary Choose what the world may hold. Enforcement: premium-emotional-weather-atlas AR VR XR Quest spatial device browser fallback urai-final-status-control-room Launch locked. Proof before expansion. fingerprint-gated Production certification remains hidden until the protected fingerprint is validated. urai-r3f-canonical-lifemap</body><script src="/unit-candidate.js"></script></html>`
async function runActualScript(relative, proofValue = proof) {
    const seen = [], failures = []
    const fetch = async (value) => {
      const url = new URL(value), normalized = url.pathname.replace(/\/$/, '') || '/'
      seen.push(normalized)
      const conditional = helpers.conditionalXrRoutes.includes(normalized)
      const body = normalized === '/api/system/deploy-proof' ? JSON.stringify(proofValue) : normalized === '/privacy-controls' ? publicBody.replace('Home threshold', '') : publicBody
      return { ok: !conditional, status: conditional ? 404 : 200, url: url.href, text: async () => body }
    }
    const source = fs.readFileSync(path.join(root, relative), 'utf8').replace(/^#!.*\n/, '').replace(/^import .*$/gm, '')
    const context = { URL, Map, Set, fetch, currentXrReleaseAuthority: () => authority, inspectXrDeployProof: helpers.inspectXrDeployProof,
      verifyConditionalXrRoutes: (base, auth) => helpers.verifyConditionalXrRoutes(base, auth, fetch),
      process: { env: { URAI_DEPLOY_URL: 'https://candidate.example' }, exit: (code) => { throw new Error('Script exited ' + code + ': ' + failures.join('\n')) } },
      console: { log() {}, error: (...values) => failures.push(values.join(' ')) } }
    await vm.runInNewContext(`(async () => { ${source}\n })()`, context)
    return seen
}
for (const relative of ['scripts/urai-live-smoke.mjs', 'scripts/smoke-home-xr-live-url.mjs', 'scripts/check-home-xr-live-deploy-proof.mjs']) {
  test(`actual ${relative} accepts governed disabled XR 404 and checks both routes/slashes`, async () => {
    const seen = await runActualScript(relative)
    for (const value of helpers.conditionalXrRoutes) assert.equal(seen.filter((entry) => entry === value).length, 2)
  })
}
test('actual deploy checker validates forbidden-copy declaration instead of rejecting its own phrase list', async () => {
  await assert.rejects(runActualScript('scripts/check-home-xr-live-deploy-proof.mjs', { ...proof, forbiddenLiveCopy: [] }))
})
test('actual deploy checker still rejects forbidden phrases in live proof fields', async () => {
  await assert.rejects(runActualScript('scripts/check-home-xr-live-deploy-proof.mjs', { ...proof, sourceSurface: 'prototype' }))
})
test('all four conditional checks report failures; no partial successful acceptance', async () => {
  const failures = await helpers.verifyConditionalXrRoutes('https://candidate.example', authority, async (url) => ({ status: 200, url, text: async () => 'XR live' }))
  assert.equal(failures.length, 4)
})
