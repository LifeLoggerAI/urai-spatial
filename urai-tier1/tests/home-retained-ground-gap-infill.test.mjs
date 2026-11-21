import assert from 'node:assert/strict'
import { test } from 'node:test'
import {homeTerrainHeight,makeHomeTerrainGapInfillGeometry} from '../src/spatial/layout/HomeSanctuaryGeometry.ts'

test('visual infill covers entire 90m domain with a lower-density recessed grid',()=>{
  const g=makeHomeTerrainGapInfillGeometry(),p=g.getAttribute('position')
  assert.equal(p.count,91*91)
  assert.equal(g.index?.count,90*90*6)
  assert.equal(g.getAttribute('color').count,p.count)
  assert.equal(g.getAttribute('uv').count,p.count)
  for(const v of [0,90,4095,p.count-1]){
    const x=p.getX(v),z=p.getZ(v)
    assert.ok(x>=-45&&x<=45&&z>=-45&&z<=45)
    assert.ok(Math.abs(p.getY(v)-homeTerrainHeight(x,z)+.06)<.00001)
  }
  g.dispose()
})
