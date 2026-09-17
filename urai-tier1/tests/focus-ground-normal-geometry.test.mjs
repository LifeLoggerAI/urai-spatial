import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const start = source.indexOf('function focusGroundHeight(')
const end = source.indexOf('  const maps =', start)
const body = source.slice(start, end) + '\nreturn geometry; }'
const seating = source.slice(source.indexOf('function seatFocusStoneGeometry('), source.indexOf('function FocusStoneBank('))
const compile = ts.transpile(`${body}\n${seating}`, { target: ts.ScriptTarget.ES2022 })
const { geometry, height, seat } = new Function('THREE', 'useMemo', `${compile}; return { geometry: FocusSanctuaryGround({accent:'#abc'}), height: focusGroundHeight, seat: seatFocusStoneGeometry };`)(THREE, fn => fn())
test('Focus walkable terrain faces the camera above the surface', () => {
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
  let checked = 0
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getX(i)) < 3) {
      assert.ok(normals.getY(i) > .8, 'walkable central terrain must have an upward facing normal')
      checked++
    }
  }
  assert.ok(checked > 100)
  assert.ok(geometry.index.count / 3 < 25000)
  geometry.dispose()
})

test('Focus rock crop edges meet the ground without mutating the cached asset', () => {
  const original = new THREE.PlaneGeometry(4, 4, 16, 16)
  const before = Array.from(original.getAttribute('position').array)
  const world = new THREE.Matrix4().compose(
    new THREE.Vector3(-5.8, -1.65, -6.8),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .4),
    new THREE.Vector3(1.18, 1.18, 1.18),
  )
  const seated = seat(original, world)
  const input = original.getAttribute('position'), output = seated.getAttribute('position')
  let edgeCount = 0, retainedCount = 0
  for (let i = 0; i < input.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(output, i).applyMatrix4(world)
    assert.ok(point.toArray().every(Number.isFinite))
    if (Math.abs(input.getX(i)) === 2 || Math.abs(input.getY(i)) === 2) {
      assert.ok(Math.abs(point.y - (height(point.x, point.z) - .08)) < .00001)
      edgeCount++
    } else if (Math.hypot(input.getX(i) / 2, input.getY(i) / 2) <= .48) {
      const expected = new THREE.Vector3().fromBufferAttribute(input, i).applyMatrix4(world)
      assert.ok(point.distanceTo(expected) < .00001, 'interior scan relief must be retained')
      retainedCount++
    }
  }
  assert.ok(edgeCount > 40 && retainedCount > 30)
  assert.deepEqual(Array.from(original.getAttribute('position').array), before)
  assert.deepEqual(Array.from(seated.getAttribute('uv').array), Array.from(original.getAttribute('uv').array))
  original.dispose(); seated.dispose()
})
