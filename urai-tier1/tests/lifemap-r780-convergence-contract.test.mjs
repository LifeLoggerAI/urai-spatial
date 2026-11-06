import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { lifeMapRotateFlightAxes, advanceLifeMapViewOrientation } from '../src/components/lifemap/lifeMapFlightOrientation.mjs'

const scene = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('restored R124 world-relative flight is actually connected to current R777 camera ownership', () => {
  assert.match(scene, /function stepLifeMapFlight\(/)
  assert.match(scene, /lifeMapRotateFlightAxes\(/)
  assert.match(scene, /advanceLifeMapViewOrientation\(/)
  assert.match(scene, /lifeMapRotatedLookTarget\(/)
  assert.match(scene, /phase === "overview" \? 1 : 0/)
  assert.match(scene, /positionGoal\.current\.addScaledVector\(flightOffset\.current, flightWeight\)/)
})
test('the first selected-star departure uses the real explored camera position', () => {
  assert.match(scene, /departureOrigin\.current = camera\.position\.clone\(\)/)
  assert.match(scene, /goalForNode\(selected, phase, portrait, departureOrigin\.current\)/)
  assert.match(scene, /if \(phase === "departure"\) return \{ position: tuple\(overview\), target: tuple\(target\) \}/)
})
test('keyboard handlers yield to focused controls, modals, blur, and selection', () => {
  assert.match(scene, /if \(phase !== "overview"\) return/)
  assert.match(scene, /event\.altKey \|\| event\.ctrlKey \|\| event\.metaKey/)
  assert.match(scene, /input,textarea,select,button,a,\[role="textbox"\]/)
  assert.match(scene, /window\.addEventListener\('blur', release\)/)
  assert.match(scene, /heldFlightKeys\.current\.clear\(\)/)
})
test('owner-scoped selected memory, Focus/Replay and WebGL recovery remain in current scene', () => {
  for (const term of ['forwardPrivateMovieRouteSelection(next, params', 'withLifeMapSelectionIdentity(', 'WebGLRecoveryBridge', 'data-life-map-source={sourceMode}', 'router.replace(`/life-map?', 'lifeMapHomeHref(params.toString())']) {
    assert.ok(scene.includes(term), 'missing preserved authority: ' + term)
  }
  assert.doesNotMatch(scene, /from ['"]\.\/lifeMapStageContinuity\.mjs['"]/)
})
test('original bounded look turns flight and never changes the neutral source direction', () => {
  assert.deepEqual(lifeMapRotateFlightAxes({ x:0,y:0,z:-1 }, 0), { x:0,y:0,z:-1 })
  assert.ok(lifeMapRotateFlightAxes({ x:0,y:0,z:-1 }, Math.PI / 2).x > 0.999)
  const pose = advanceLifeMapViewOrientation({yaw:0,pitch:0},new Set(['ArrowRight']),1/60)
  assert.ok(pose.yaw > 0 && pose.yaw < 0.1)
})
