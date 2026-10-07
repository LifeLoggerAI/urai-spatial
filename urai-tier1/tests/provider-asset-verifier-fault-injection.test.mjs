import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const verifierPath = 'scripts/verify-provider-asset-handoff.mjs'
const handoffPath = 'urai-tier1/public/assets/urai/final/manifests/asset-factory-spatial-handoff.json'
const baselineFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-asset-baseline-'))
const baselineEvidencePath = path.join(baselineFixture, 'provider-asset-verification.json')
const baseline = spawnSync(process.execPath, [verifierPath], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, URAI_PROVIDER_ASSET_EVIDENCE_PATH: baselineEvidencePath },
})
assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr)
const report = JSON.parse(fs.readFileSync(baselineEvidencePath, 'utf8'))
fs.rmSync(baselineFixture, { recursive: true, force: true })
assert.equal(fs.existsSync(path.join(root, 'release-control-evidence/provider-asset-verification.json')), false)

// Execute the real verifier against actual binaries and manifest in a temporary
// copy. Mutations never alter the committed runtime, source, or provider assets.
function inject(t, mutate) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-asset-verifier-'))
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }))
  const files = new Set([verifierPath, 'scripts/lib/home-navigation-source-authority.mjs', handoffPath, 'urai-tier1/src/spatial/assets/uraiAssets.ts', ...report.routeOwners.flatMap(owner => owner.files)])
  for (const record of report.records) files.add(`urai-tier1/public/assets/urai/${record.canonicalPath}`)
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true })
    fs.copyFileSync(path.join(root, file), path.join(fixture, file))
  }
  // The real pinned parser is a declared workspace dependency. Keep the isolated
  // verifier fixture complete without copying unrelated installed packages.
  const parserRoot = path.dirname(fileURLToPath(import.meta.resolve('typescript/package.json')))
  for (const file of ['package.json', 'lib/typescript.js']) {
    const target = path.join(fixture, 'node_modules/typescript', file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(parserRoot, file), target)
  }
  mutate(fixture)
  const result = spawnSync(process.execPath, [verifierPath], { cwd: fixture, encoding: 'utf8' })
  assert.equal(result.status, 1, result.stdout + result.stderr)
  const failed = JSON.parse(fs.readFileSync(path.join(fixture, 'release-control-evidence/provider-asset-verification.json'), 'utf8'))
  assert.equal(failed.ok, false)
  return failed
}

function replace(fixture, file, from, to) {
  const target = path.join(fixture, file)
  const original = fs.readFileSync(target, 'utf8')
  assert.ok(original.includes(from), `fault injection target absent: ${from}`)
  fs.writeFileSync(target, original.replace(from, to))
}

const homeOwner = 'urai-tier1/src/app/AssetDrivenHomeWorld.tsx'
const replayOwner = 'urai-tier1/src/app/replay/CinematicReplayClient.tsx'

test('current provider manifest bytes and all active owners verify', () => {
  assert.equal(report.coreVerified, 51)
  assert.equal(report.providerVerified, 53)
  assert.equal(report.routeOwnersVerified, 8)
})

test('missing Home route owner fails closed', t => {
  const failed = inject(t, fixture => fs.unlinkSync(path.join(fixture, homeOwner)))
  assert.ok(failed.failures.some(failure => failure.includes(`${homeOwner}: active owner file is missing`)))
})

test('unmounted Home world fails even with imported name and markers present', t => {
  const failed = inject(t, fixture => replace(fixture, homeOwner, '<HomeWorldProduction ', '<DisconnectedHomeWorld '))
  assert.ok(failed.failures.some(failure => failure.includes('missing active-owner binding: <HomeWorldProduction')))
})

test('retired Home producer cannot satisfy the current renderer mounting edge', t => {
  const failed = inject(t, fixture => replace(fixture, 'urai-tier1/src/spatial/layout/HomeWorldProduction.tsx',
    'HomeWorldProductionPolished as HomeWorldProduction', 'HomeWorldProductionFinal as HomeWorldProduction'))
  assert.ok(failed.failures.some(failure => failure.includes('missing active-owner binding: export { HomeWorldProductionPolished')))
})

test('unused source strings and a wrong localized key cannot satisfy the actual Ground control', t => {
  const failed = inject(t, fixture => {
    const file = 'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx'
    replace(fixture, file, "aria-label={locale.text('home.groundAction')}", "aria-label={locale.text('home.orbAction')}")
    fs.appendFileSync(path.join(fixture, file), '\n// aria-label="Open Ground directly"; locale.text(\'home.groundAction\')\n')
  })
  assert.ok(failed.failures.some(failure => failure.includes('Home navigation actual home-semantic-ground')))
})

test('the authoritative English name cannot silently drift behind a correct message key', t => {
  const failed = inject(t, fixture => replace(fixture, 'urai-tier1/src/lib/i18n/journeyMessages.ts',
    'source:"Open Ground directly"', 'source:"Open a different destination"'))
  assert.ok(failed.failures.some(failure => failure.includes('Home navigation actual home-semantic-ground')))
})

test('detached duplicate controls cannot stand in for the returned Home nav', t => {
  const failed = inject(t, fixture => replace(fixture, 'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx',
    'data-home-navigation-owner="runtime-boundary"', 'data-home-navigation-owner="detached"'))
  assert.ok(failed.failures.some(failure => failure.includes('actual returned, named runtime-boundary nav')))
})

test('Replay dome consumption cannot silently detach from provider registry', t => {
  const failed = inject(t, fixture => replace(fixture, replayOwner, '<MemoryMediaDome url={replayAssets.primary.src}', '<MemoryMediaDome url={"/unbound-demo.webp"}'))
  assert.ok(failed.failures.some(failure => failure.includes('missing active-owner marker: memory.demo ? <MemoryMediaDome')))
})

test('Replay texture loader cannot silently consume another URL', t => {
  const failed = inject(t, fixture => replace(fixture, replayOwner, 'new THREE.TextureLoader().load(url,', 'new THREE.TextureLoader().load("/unbound-demo.webp",'))
  assert.ok(failed.failures.some(failure => failure.includes('new THREE.TextureLoader().load(url,')))
})

test('Replay no-WebGL provider fallback cannot silently consume another asset', t => {
  const failed = inject(t, fixture => replace(fixture, replayOwner, "media={{ kind: 'image', url: replayAssets.primary.src, caption:", "media={{ kind: 'image', url: '/unbound-demo.webp', caption:"))
  assert.ok(failed.failures.some(failure => failure.includes("media={{ kind: 'image', url: replayAssets.primary.src")))
})

test('provider SHA, bytes and provenance checks remain fail closed', t => {
  const failed = inject(t, fixture => {
    const target = path.join(fixture, handoffPath)
    const manifest = JSON.parse(fs.readFileSync(target, 'utf8'))
    manifest.assets[0].sha256 = '0'.repeat(64)
    manifest.assets[0].bytes += 1
    manifest.assets[0].sourcePath = ''
    fs.writeFileSync(target, JSON.stringify(manifest))
  })
  for (const fault of ['SHA-256 mismatch', 'byte mismatch', 'missing provider source record']) {
    assert.ok(failed.failures.some(failure => failure.includes(fault)), fault)
  }
})
