import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const stateSource = fs.readFileSync(new URL('../src/spatial/home/homeExperienceState.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(stateSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { DEFAULT_HOME_FIRST_PERSON_CAMERA: camera } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const architecture = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const boundaryNames = ['back-wall-left', 'back-wall-right', 'back-wall-header', 'beam-left', 'beam-right', 'beam-back']
const boxes = boundaryNames.map((name) => {
  const match = architecture.match(new RegExp(`name="home-current-${name}" position=\\{\\[([^\\]]+)\\]\\} scale=\\{\\[([^\\]]+)\\]\\}`))
  assert.ok(match, `Architecture must expose ${name} for arrival-clearance verification`)
  return { name, center: match[1].split(',').map(Number), size: match[2].split(',').map(Number) }
})

function intersectsForwardRay(origin, direction, box) {
  let near = 0
  let far = Infinity
  for (let axis = 0; axis < 3; axis++) {
    const lo = box.center[axis] - box.size[axis] / 2
    const hi = box.center[axis] + box.size[axis] / 2
    if (Math.abs(direction[axis]) < 1e-9) {
      if (origin[axis] < lo || origin[axis] > hi) return false
      continue
    }
    const ends = [(lo - origin[axis]) / direction[axis], (hi - origin[axis]) / direction[axis]].sort((a, b) => a - b)
    near = Math.max(near, ends[0])
    far = Math.min(far, ends[1])
    if (near > far) return false
  }
  return far >= 0
}

test('direct Home arrival clears the actual back wall, header, and overhead frame', () => {
  for (const box of boxes) {
    const inside = box.center.every((center, axis) => Math.abs(camera.position[axis] - center) <= box.size[axis] / 2 + .25)
    assert.equal(inside, false, `Arrival intersects ${box.name} with human clearance`)
  }
  // Central upper-sky rays over the ordinary 58-degree vertical field of view
  // must not hit the architectural frame. This rejects the old doorway spawn.
  for (const pitch of [.22, .36, .50]) {
    const direction = [0, Math.sin(pitch), -Math.cos(pitch)]
    for (const box of boxes) assert.equal(intersectsForwardRay(camera.position, direction, box), false, `Upper sky is occluded by ${box.name}`)
  }
  const oldCamera = [0, 1.012, 7.85]
  assert.ok(boxes.some((box) => intersectsForwardRay(oldCamera, [0, Math.sin(.36), -Math.cos(.36)], box)), 'Regression fixture must detect the former wall/header obstruction')
})
