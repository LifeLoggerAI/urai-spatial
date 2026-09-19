import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const controller = read('src/spatial/world/WorldTransitionController.tsx')
const gateway = read('src/spatial/world/GroundGateway.tsx')
const home = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const groundPage = read('src/app/ground/page.tsx')
const semanticReturn = read('src/app/ground/GroundSemanticReturnBridge.tsx')
const css = read('src/spatial/world/worldNavigation.css')

test('Ground travel is visually owned by Home rather than the generic aperture stack', () => {
  assert.match(controller, /destination === 'infrastructure-hub'\) return 40/)
  assert.match(controller, /pendingTravel\?\.destination === 'infrastructure-hub'/)
  assert.match(controller, /data-ground-visual-owner=\{groundOwned \? 'home-authored-descent' : 'none'\}/)
  assert.match(controller, /!groundOwned \? <>/)
  assert.match(css, /\.urai-world-transition__aperture/)
})

test('Home terrain owns pointer and touch entry while GroundGateway is semantic access only', () => {
  assert.match(home, /data-home-ground-entry="physical-world-surface"/)
  assert.match(home, /onGround\(event\.point\.clone\(\)\)/)
  assert.match(gateway, /data-ground-gateway="semantic-access-only"/)
  assert.match(gateway, /Pointer and touch users enter through the visible Home terrain/)
  assert.match(gateway, /Enter Ground — explore your physical lived world in first person/)
  assert.doesNotMatch(gateway, /urai-ground-gateway__focus-ring|urai-ground-gateway__surface|Enter below/)
  assert.doesNotMatch(home, /Ground portal|ground portal|white dot|ground-portal/i)
})

test('Ground Home button and Escape both unwind through semantic world-return authority', () => {
  assert.match(groundPage, /import GroundSemanticReturnBridge from '\.\/GroundSemanticReturnBridge'/)
  assert.match(groundPage, /<GroundSemanticReturnBridge \/>/)
  assert.match(semanticReturn, /import \{ requestUraiWorldReturn \} from '@\/spatial\/world\/worldEvents'/)
  assert.match(semanticReturn, /target\.closest\('\.ground-home-return'\)/)
  assert.match(semanticReturn, /event\.key !== 'Escape'/)
  assert.match(semanticReturn, /pathname !== '\/ground'/)
  assert.match(semanticReturn, /isEditableTarget\(event\.target\)/)
  assert.match(semanticReturn, /event\.preventDefault\(\)/)
  assert.match(semanticReturn, /event\.stopImmediatePropagation\(\)/)
  assert.equal((semanticReturn.match(/requestUraiWorldReturn\(\)/g) ?? []).length, 2)
  assert.match(semanticReturn, /document\.addEventListener\('click', onClickCapture, true\)/)
  assert.match(semanticReturn, /window\.addEventListener\('keydown', onKeyDownCapture, true\)/)
})
