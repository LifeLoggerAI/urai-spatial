import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const runner = fs.readFileSync(path.join(root, '../scripts/run-continuous-spatial-proof-v18-stable.mjs'), 'utf8')

const yaw = 0.055
const coarseFrameDistance = 3.064
const spawn = { x: -0.85, z: 8.4 }
const ground = { x: -5.4, z: -10.8, radius: 2.8 }

function advance(position, direction) {
  const vectors = {
    forward: [-Math.sin(yaw), -Math.cos(yaw)],
    back: [Math.sin(yaw), Math.cos(yaw)],
    left: [-Math.cos(yaw), Math.sin(yaw)],
    right: [Math.cos(yaw), -Math.sin(yaw)],
  }
  const [x, z] = vectors[direction]
  return {
    x: position.x + x * coarseFrameDistance,
    z: position.z + z * coarseFrameDistance,
  }
}

function directionFor(position) {
  const dx = ground.x - position.x
  const dz = ground.z - position.z
  const lateralTolerance = Math.min(1.1, ground.radius * 0.45)
  const depthTolerance = Math.min(1.1, ground.radius * 0.45)
  if (Math.abs(dz) > depthTolerance && Math.abs(dz) >= Math.abs(dx)) return dz < 0 ? 'forward' : 'back'
  if (Math.abs(dx) > lateralTolerance) return dx < 0 ? 'left' : 'right'
  if (Math.abs(dz) > depthTolerance) return dz < 0 ? 'forward' : 'back'
  return Math.abs(dx) >= Math.abs(dz)
    ? (dx < 0 ? 'left' : 'right')
    : (dz < 0 ? 'forward' : 'back')
}

test('slow-renderer Ground steering closes depth before coarse lateral correction', () => {
  assert.match(runner, /Math\.abs\(dz\) > depthTolerance && Math\.abs\(dz\) >= Math\.abs\(dx\)/)
  assert.match(runner, /direction = dz < 0 \? 'forward' : 'back'/)
  assert.match(runner, /reached = after\.nearby === destination/)
  assert.match(runner, /end\.distanceToTarget > target\.radius/)

  let position = { ...spawn }
  const distances = []
  const directions = []
  for (let pulse = 0; pulse < 16; pulse += 1) {
    const distance = Math.hypot(ground.x - position.x, ground.z - position.z)
    distances.push(distance)
    if (distance <= ground.radius) break
    const direction = directionFor(position)
    directions.push(direction)
    position = advance(position, direction)
  }

  const finalDistance = Math.hypot(ground.x - position.x, ground.z - position.z)
  assert.equal(directions[0], 'forward')
  assert.ok(directions.includes('left'))
  assert.ok(finalDistance <= ground.radius, `coarse steering stopped ${finalDistance.toFixed(3)}m from Ground`)
  assert.ok(Math.min(...distances, finalDistance) <= ground.radius)
})

test('the rejected lateral-first sequence reproduces the retained oscillation', () => {
  let position = { ...spawn }
  const lateralPositions = []
  for (let pulse = 0; pulse < 8; pulse += 1) {
    const dx = ground.x - position.x
    position = advance(position, dx < 0 ? 'left' : 'right')
    lateralPositions.push({ ...position })
  }

  assert.ok(lateralPositions.every((position) => position.z > 8.5))
  assert.ok(Math.hypot(ground.x - position.x, ground.z - position.z) > ground.radius)
  assert.ok(lateralPositions.some((position) => position.x < ground.x))
  assert.ok(lateralPositions.some((position) => position.x > ground.x))
})
