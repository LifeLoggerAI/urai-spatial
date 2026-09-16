import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const source = fs.readFileSync(path.join(root, 'src/spatial/home/HomeEmbodiedAvatar.tsx'), 'utf8')

test('embodied Avatar uses the governed skinned model and authored idle animation', () => {
  assert.match(source, /home-human-makehuman-v4\.glb/)
  assert.match(source, /cloneSkeleton/)
  assert.match(source, /useAnimations\(gltf\.animations, model\)/)
  assert.match(source, /const idle = actions\.idle_breath/)
  assert.match(source, /idle\.reset\(\)\.setLoop\(THREE\.LoopRepeat, Infinity\)\.fadeIn\(0\.3\)\.play\(\)/)
  assert.match(source, /reducedMotion \|\| !visible/)
  assert.match(source, /animation: reducedMotion \? 'still-reduced-motion' : 'idle_breath'/)
})

test('embodied Avatar preserves restrained targeting and hides the exterior body in first person', () => {
  assert.match(source, /state === 'hidden-first-person'/)
  assert.match(source, /if \(!visible\) return null/)
  assert.match(source, /urai-home-user-avatar-hit-volume/)
  assert.match(source, /urai-home-avatar-target-response/)
  assert.doesNotMatch(source, /ringGeometry|torusGeometry|selection-ring/i)
})
