import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const mustImportCanon = [
  '../src/spatial/scene/phaseMachine.ts',
  '../src/spatial/hooks/useSceneAuthority.ts',
  '../src/spatial/components/sceneState.ts',
  '../src/spatial/types.ts',
]

test('core tier1 phase surfaces import canonical Tier1Phase', () => {
  for (const rel of mustImportCanon) {
    const file = fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
    assert.match(file, /from ["']@\/canon\/tier1["']/, `${rel} must import @/canon/tier1`)
    assert.doesNotMatch(file, /"HOME" \| "ASCENT" \| "LIFEMAP" \| "FOCUS" \| "REPLAY"/, `${rel} must not redefine canonical phase union`)
  }
})
