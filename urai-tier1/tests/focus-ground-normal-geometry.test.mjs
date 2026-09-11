import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const start = source.indexOf('function FocusSanctuaryGround(')
const end = source.indexOf('  const maps =', start)
const body = source.slice(start, end) + '\nreturn geometry; }'
const compile = ts.transpile(body, { target: ts.ScriptTarget.ES2022 })
const geometry = new Function('THREE', 'useMemo', `${compile}; return FocusSanctuaryGround({accent:'#abc'});`)(THREE, fn => fn())
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
