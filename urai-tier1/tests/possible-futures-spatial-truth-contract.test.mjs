import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/possible-futures/PossibleFuturesClient.tsx', import.meta.url), 'utf8')

test('Possible Futures renders an actual spatial branch world', () => {
  assert.match(source, /data-testid="possible-futures-spatial-world"/)
  assert.match(source, /new THREE\.TubeGeometry/)
  assert.match(source, /new THREE\.CatmullRomCurve3/)
  assert.match(source, /<PerspectiveCamera/)
})

test('Spatial branches remain equal and unranked', () => {
  assert.match(source, /data-branch-ordering="unranked"/)
  assert.match(source, /SCENARIO · UNRANKED/)
  assert.doesNotMatch(source, /best branch|winner|probability|recommended branch/i)
  assert.match(source, /They are not memories, observations, recommendations, predictions/)
})
