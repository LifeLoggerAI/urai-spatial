import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const route = read('src/app/ground/page.tsx')
const world = read('src/app/GroundSpatialWorldClean.tsx')
const workforce = read('src/app/GroundWorkforcePresences.tsx')
const registry = read('src/spatial/assets/uraiAssets.ts')
const manifest = JSON.parse(read('public/assets/urai/final/manifests/asset-factory-spatial-handoff.json'))
const specialistIds = ['relationshipLiaison', 'operator', 'builder', 'protector', 'mirror', 'guide']
const helperIds = ['receptionist', 'privacySteward', 'scheduleSteward', 'wellnessGuide', 'archivist']
const providerAssets = new Map(manifest.assets.filter(asset => asset.canonicalPath?.startsWith('assets/urai/avatars/')).map(asset => [asset.canonicalPath, asset]))

test('Ground uses the provider-provenance avatar registry inside canonical 3D infrastructure', () => {
  assert.match(route, /<GroundSpatialWorldClean \/>/)
  assert.match(world, /<GroundWorkforcePresences world=\{world\} \/>/)
  assert.match(workforce, /avatarAssets, type ImageAsset/)
  assert.match(world, /data-ground-workforce-art="provider-reference-pending-acceptance"/)
  assert.match(workforce, /map=\{texture\} transparent alphaTest=\{0\.02\}/)
  assert.match(workforce, /THREE\.SRGBColorSpace/)
  assert.match(workforce, /visualStatus: 'provider-reference-pending-acceptance'/)
})

test('all six Council specialists have distinct provider-rendered portrait sources and references', () => {
  for (const id of specialistIds) {
    assert.match(workforce, new RegExp("id: '" + id + "'[^\\n]+destinationId: 'council'[^\\n]+asset: avatarAssets\\." + id))
    assert.match(registry, new RegExp(id + ": image\\(webp\\(\"/avatars/"))
  }
  const council = [...workforce.matchAll(/category: 'specialist' \}/g)]
  assert.equal(council.length, 6)
  assert.equal(new Set(specialistIds).size, 6)
})

test('active floor helpers use real source-tracked artwork rather than generic CSS body silhouettes', () => {
  for (const id of helperIds) {
    assert.match(workforce, new RegExp("id: '" + id + "'[^\\n]+asset: avatarAssets\\." + id))
    assert.match(registry, new RegExp(id + ": image\\(webp\\(\"/avatars/"))
  }
  const mapped = [...registry.matchAll(/([A-Za-z]+): image\(webp\("\/avatars\/([^"]+\.webp)"/g)]
  const needed = new Set([...specialistIds, ...helperIds])
  const artPaths = mapped.filter(entry => needed.has(entry[1])).map(entry => 'assets/urai/avatars/' + entry[2])
  assert.equal(artPaths.length, 11)
  assert.equal(new Set(artPaths).size, 11)
  for (const artPath of artPaths) {
    const asset = providerAssets.get(artPath)
    assert.ok(asset, 'missing provider handoff: ' + artPath)
    assert.equal(asset.status, 'ready')
    assert.equal(asset.renderer, 'provider')
    assert.equal(asset.alpha, true)
    assert.match(asset.sha256, /^[a-f0-9]{64}$/)
  }
  assert.doesNotMatch(world, /uraiGroundHelperHead|uraiGroundHelperBody/)
})

test('Ground workforce is keyboard-approachable, responsive and fail-closed during art failure', () => {
  assert.match(world, /aria-label="Ground workforce presences"/)
  assert.match(world, /aria-label=\{\x60Approach \$\{member\.label\} in Ground\x60\}/)
  assert.match(world, /min-height:48px/)
  assert.match(world, /@media\(max-width:760px\)/)
  assert.match(world, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(world, /focusDestination\(destination\)/)
  assert.match(workforce, /getDerivedStateFromError/)
  assert.match(workforce, /<GroundPortraitLoadBoundary key=\{member\.id\} roleId=\{member\.id\}>/)
  assert.match(workforce, /<Suspense fallback=\{null\}>/)
  assert.match(workforce, /actionAuthority: 'none'/)
})
