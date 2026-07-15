import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const appRoot = path.join(process.cwd(), 'src/app')
const home = fs.readFileSync(path.join(appRoot, 'HomeSpatialCanvas.tsx'), 'utf8')
const defects = fs.readFileSync(path.join(appRoot, 'continuous-spatial-proof-defects.css'), 'utf8')
const override = fs.readFileSync(path.join(appRoot, 'premium-mobile-composition.css'), 'utf8')
const template = fs.readFileSync(path.join(appRoot, 'template.tsx'), 'utf8')

test('mobile Home composition is owned by a farther real camera and visible portal positions', () => {
  assert.match(home, /const mobile = size\.width < 720/)
  assert.match(home, /mobile \? 7\.2 : 5\.25/)
  assert.match(home, /mobile \? 24\.5 : 14\.6/)
  assert.match(home, /camera\.fov = mobile \? 64 : 50/)
  assert.match(home, /position: \[-2\.75, 0\.08, -2\.4\]/)
  assert.match(home, /position: \[2\.75, 0\.08, -2\.4\]/)
  assert.match(home, /position: \[-5\.2, 0\.08, 0\.75\]/)
  assert.match(home, /position: \[5\.2, 0\.08, 0\.75\]/)
  assert.match(home, /position: \[0, 0\.08, -5\.4\]/)
})

test('final mobile override defeats the obsolete oversized Home canvas crop', () => {
  assert.match(defects, /left: -20vw !important/)
  assert.match(defects, /width: 140vw !important/)
  assert.match(override, /@media \(max-width: 760px\)/)
  assert.match(override, /left: 0 !important/)
  assert.match(override, /width: 100% !important/)
  assert.match(override, /max-width: 100% !important/)
  assert.match(template, /continuous-spatial-proof-defects\.css[\s\S]*premium-mobile-composition\.css/)
})

test('mobile Ground retains its centered wide R3F wrapper so side chambers remain visible', () => {
  assert.match(defects, /\.ground-spatial-root > div:has\(> canvas\)/)
  assert.match(defects, /left: -18vw !important/)
  assert.match(defects, /width: 136vw !important/)
  assert.match(defects, /height: 100% !important/)
})

test('Life Map full-height guarantees remain intact', () => {
  assert.match(defects, /\[data-testid="urai-true-3d-life-map"\][\s\S]*height: 100dvh !important/)
})
