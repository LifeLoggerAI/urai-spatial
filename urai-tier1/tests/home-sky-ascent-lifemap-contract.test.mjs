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

const platform = read('src/scene/RitualPlatform.tsx')
const ascentPortal = read('src/scene/AscentPortal.tsx')
const cameraPaths = read('src/spatial/cinematic/cameraPaths.ts')
const continuityCss = read('src/scene/moonlitSpatialContinuity.css')
const layout = read('src/app/layout.tsx')

test('Home platform uses moonlit black-stone sacred-tech material language', () => {
  assert.match(platform, /blackStone: '#05070d'/)
  assert.match(platform, /moonSilver: '#dbeafe'/)
  assert.match(platform, /paleCyan: '#9be8ff'/)
  assert.match(platform, /softGold: '#e7d59d'/)
  assert.match(platform, /function SealedProgressionMarks/)
  assert.match(platform, /function OrbReflection/)
  assert.match(platform, /metalness=\{0\.62\}/)
  assert.match(platform, /roughness=\{0\.18\}/)
  assert.match(platform, /<RuneRing radius=\{2\.14\}/)
})

test('Ascent uses orb-led sacred geometry instead of warp tunnel treatment', () => {
  assert.match(ascentPortal, /function AscentMist/)
  assert.match(ascentPortal, /function CrescentSeal/)
  assert.match(ascentPortal, /function OrbContinuityAnchor/)
  assert.match(ascentPortal, /function MoonbeamVeil/)
  assert.match(ascentPortal, /<AscentMist \/>/)
  assert.doesNotMatch(ascentPortal, /function AscentStars/)
  assert.doesNotMatch(ascentPortal, /function PortalRing/)
  assert.doesNotMatch(ascentPortal, /count = 720/)
})

test('camera presets include Home, lift, ascent passage, and Life Map arrival states', () => {
  assert.match(cameraPaths, /'ascentReveal'/)
  assert.match(cameraPaths, /'lifeMapArrival'/)
  assert.match(cameraPaths, /position: new Vector3\(0, 2\.2, 7\.5\)/)
  assert.match(cameraPaths, /target: new Vector3\(0, 1\.1, 0\)/)
  assert.match(cameraPaths, /position: new Vector3\(0, 5\.5, 5\.2\)/)
  assert.match(cameraPaths, /position: new Vector3\(0, 7, 4\.2\)/)
  assert.match(cameraPaths, /position: new Vector3\(0, 3\.8, 9\.5\)/)
  assert.match(cameraPaths, /if \(sceneMode === 'ascent'\) return 'ascentReveal'/)
  assert.match(cameraPaths, /if \(sceneMode === 'life-map' \|\| sceneMode === 'demo'\) return 'lifeMapArrival'/)
})

test('moonlit continuity stylesheet owns Home Ascent and Life Map visual language', () => {
  assert.match(layout, /@\/scene\/moonlitSpatialContinuity\.css/)
  assert.match(continuityCss, /--urai-deep-navy: #030816/)
  assert.match(continuityCss, /--urai-blue-violet: #161a46/)
  assert.match(continuityCss, /--urai-moon-silver: #dbeafe/)
  assert.match(continuityCss, /--urai-pale-cyan: #9be8ff/)
  assert.match(continuityCss, /--urai-soft-gold: #e7d59d/)
  assert.match(continuityCss, /--urai-black-stone: #05070d/)
  assert.match(continuityCss, /\.urai-visual-overlay--home/)
  assert.match(continuityCss, /\.urai-visual-overlay--ascent/)
  assert.match(continuityCss, /\.urai-life-map-nebula/)
  assert.match(continuityCss, /\.urai-ascent-rift,[\s\S]*\.urai-ascent-tunnel,[\s\S]*\.urai-ascent-portal-core,[\s\S]*\.urai-ascent-stream[\s\S]*display: none !important/)
})
