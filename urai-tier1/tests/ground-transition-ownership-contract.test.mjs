import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const controller = read('src/spatial/world/WorldTransitionController.tsx')
const home = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const css = read('src/spatial/world/worldNavigation.css')

test('Ground travel is visually owned by Home rather than the generic aperture stack', () => {
  assert.match(controller, /destination === 'infrastructure-hub'\) return 40/)
  assert.match(controller, /pendingTravel\?\.destination === 'infrastructure-hub'/)
  assert.match(controller, /data-ground-visual-owner=\{groundOwned \? 'home-authored-descent' : 'none'\}/)
  assert.match(controller, /!groundOwned \? <>/)
  assert.doesNotMatch(controller, /groundOwned[\s\S]{0,240}urai-world-transition__aperture/)
  assert.match(css, /\.urai-world-transition__aperture/)
})

test('Home still owns physical terrain selection and no localized Ground portal', () => {
  assert.match(home, /data-home-ground-entry="physical-world-surface"/)
  assert.match(home, /onGround\(event\.point\.clone\(\)\)/)
  assert.doesNotMatch(home, /Ground portal|ground portal|white dot|ground-portal/i)
})
