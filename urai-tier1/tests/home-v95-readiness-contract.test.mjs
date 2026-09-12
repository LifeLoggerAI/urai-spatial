import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const playerRig = runtime.slice(runtime.indexOf('function PlayerRig('), runtime.indexOf('function ReadySignal('))

test('V95 readiness has one Canvas plus Scene lifecycle owner and frame count is diagnostic only', () => {
  assert.match(runtime, /const ready = canvasReady && sceneReady/)
  assert.match(runtime, /data-home-ready=\{ready \? 'true' : 'warming'\}/)
  assert.match(playerRig, /homeRenderedFrames = String\(renderedFrames\.current\)/)
  assert.doesNotMatch(playerRig, /homeReady\s*=/)
  assert.doesNotMatch(playerRig, /renderedFrames\.current\s*>=/)
})

test('V95 remains fail closed pending literal retained-pixel acceptance', () => {
  assert.match(runtime, /data-home-art-certification="v76-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(runtime, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
