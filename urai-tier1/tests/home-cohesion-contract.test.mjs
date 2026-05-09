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

test('home cohesion layer exposes stable spatial selectors', () => {
  assert.match(cohesion, /data-testid="urai-home-scene"/)
  assert.match(cohesion, /data-testid="urai-home-sky-portal"/)
  assert.match(cohesion, /data-testid="urai-orb-companion"/)
  assert.match(cohesion, /data-testid="urai-avatar-body"/)
  assert.match(cohesion, /data-testid="urai-ground-plane"/)
})

test('home cohesion layer preserves passive portal semantics without visible dashboard chrome', () => {
  assert.match(cohesion, /type HomePortal = "none" \| "orb" \| "avatar" \| "sky" \| "ground"/)
  assert.match(cohesion, /useState<HomePortal>\("orb"\)/)
  assert.match(cohesion, /data-urai-home-target="sky"/)
  assert.match(cohesion, /data-urai-home-target="orb"/)
  assert.match(cohesion, /data-urai-avatar-region="head"/)
  assert.match(cohesion, /data-urai-avatar-region="heart"/)
  assert.match(cohesion, /data-urai-avatar-region="arms"/)
  assert.match(cohesion, /data-urai-avatar-region="legs"/)
  assert.doesNotMatch(cohesion, /className="home-targets"/)
  assert.doesNotMatch(cohesion, /className="home-portal-card"/)
  assert.doesNotMatch(cohesion, /className="home-passive-orb"/)
  assert.doesNotMatch(cohesion, /Press O for Orb, A for Avatar/)
  assert.doesNotMatch(cohesion, /Passive companion is awake\./)
})

test('home cohesion layer preserves keyboard shortcuts and sky ascent routing accessibly', () => {
  assert.match(cohesion, /Keyboard shortcuts: O focuses the orb, A focuses the avatar, S opens the sky ascent, G focuses the ground, and Escape settles the portal state\./)
  assert.match(cohesion, /if \(key === "o"\) setPortal\("orb"\)/)
  assert.match(cohesion, /if \(key === "a"\) setPortal\("avatar"\)/)
  assert.match(cohesion, /if \(key === "g"\) setPortal\("ground"\)/)
  assert.match(cohesion, /if \(key === "s"\) openSky\(\)/)
  assert.match(cohesion, /router\.push\("\/ascent", \{ scroll: false \}\)/)
  assert.match(cohesion, /router\.push\("\/life-map\?transition=sky", \{ scroll: false \}\)/)
  assert.match(cohesion, /window\.sessionStorage\.setItem\(SKY_PORTAL_KEY, "1"\)/)
  assert.match(cohesion, /className="home-sky-hit-zone"/)
  assert.match(cohesion, /event\.key === "Enter" \|\| event\.key === " "/)
})

test('home cohesion layer includes avatar and ground sub-portals', () => {
  for (const region of ['head', 'heart', 'arms', 'legs']) {
    assert.match(cohesion, new RegExp(`${region}:`))
  }

  for (const anchor of ['room', 'object', 'routine', 'place']) {
    assert.match(cohesion, new RegExp(`${anchor}:`))
  }

  assert.match(cohesion, /setAvatarRegion\("head"\)/)
  assert.match(cohesion, /setAvatarRegion\("heart"\)/)
  assert.match(cohesion, /setAvatarRegion\("arms"\)/)
  assert.match(cohesion, /setAvatarRegion\("legs"\)/)
  assert.match(cohesion, /data-urai-ground-anchor=\{anchor\}/)
})

test('home cohesion visual shell includes cinematic field and reduced-motion support', () => {
  assert.match(cohesion, /home-cinematic-field/)
  assert.match(cohesion, /horizon-line/)
  assert.match(cohesion, /ground-curve/)
  assert.match(cohesion, /ground-aura/)
  assert.match(cohesion, /aura-column/)
  assert.match(cohesion, /center-orb/)
  assert.match(cohesion, /orb-upward-reflection/)
  assert.match(cohesion, /sky-portal-bloom/)
  assert.match(cohesion, /avatar-presence/)
  assert.match(cohesion, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(cohesion, /@media \(max-width: 760px\)/)
})
