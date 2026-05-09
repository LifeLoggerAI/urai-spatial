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

const tierOne = read('src/spatial/layout/TierOneExperience.tsx')
const cohesionRaw = read('src/spatial/layout/HomeCohesionLayer.tsx')
const cohesion = cohesionRaw.replace(/\s+/g, ' ')

test('home route mounts cohesion layer only on canonical home mode', () => {
  assert.match(tierOne, /import \{ HomeCohesionLayer \} from "\.\/HomeCohesionLayer"/)
  assert.match(tierOne, /<HomeCohesionLayer enabled=\{mode === "home"\} \/>/)
})

test('home cohesion layer preserves premium portals and default orb state', () => {
  assert.match(cohesion, /type HomePortal = "none" \| "orb" \| "avatar" \| "sky" \| "ground"/)
  assert.match(cohesion, /useState<HomePortal>\("orb"\)/)
  assert.match(cohesion, /Passive companion is awake\./)
  assert.match(cohesion, /Body map is ready\./)
  assert.match(cohesion, /Sky ascent is ready\./)
  assert.match(cohesion, /Place, objects, and anchors are available\./)
  assert.match(cohesion, /\["orb", "avatar", "sky", "ground"\]/)
  assert.match(cohesion, /data-urai-home-target=\{target\}/)
})

test('home cohesion layer preserves keyboard shortcuts and sky ascent routing', () => {
  assert.match(cohesion, /Press O for Orb, A for Avatar, S for Sky and Life Map ascent, G for Ground, or Escape to close the active portal\./)
  assert.match(cohesion, /if \(key === "o"\) setPortal\("orb"\)/)
  assert.match(cohesion, /if \(key === "a"\) setPortal\("avatar"\)/)
  assert.match(cohesion, /if \(key === "g"\) setPortal\("ground"\)/)
  assert.match(cohesion, /if \(key === "s"\) openSky\(\)/)
  assert.match(cohesion, /router\.push\("\/ascent", \{ scroll: false \}\)/)
  assert.match(cohesion, /router\.push\("\/life-map\?transition=sky", \{ scroll: false \}\)/)
  assert.match(cohesion, /window\.sessionStorage\.setItem\(SKY_PORTAL_KEY, "1"\)/)
  assert.match(cohesion, /className="home-sky-hit-zone" onClick=\{openSky\}/)
})

test('home cohesion layer includes avatar and ground sub-portals', () => {
  for (const region of ['head', 'heart', 'arms', 'legs']) {
    assert.match(cohesion, new RegExp(`${region}: \\{`))
  }

  for (const anchor of ['room', 'object', 'routine', 'place']) {
    assert.match(cohesion, new RegExp(`${anchor}: \\{`))
  }

  assert.match(cohesion, /data-urai-avatar-region=\{region\}/)
  assert.match(cohesion, /data-urai-ground-anchor=\{anchor\}/)
  assert.match(cohesion, /Send Signal to Sky/)
  assert.match(cohesion, /Map This Context/)
})

test('home cohesion visual shell includes cinematic fallback and reduced-motion support', () => {
  assert.match(cohesion, /home-cinematic-field/)
  assert.match(cohesion, /horizon-line/)
  assert.match(cohesion, /ground-curve/)
  assert.match(cohesion, /aura-column/)
  assert.match(cohesion, /center-orb/)
  assert.match(cohesion, /avatar-presence/)
  assert.match(cohesion, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(cohesion, /@media \(max-width: 760px\)/)
})
