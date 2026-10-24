import test from 'node:test'
import assert from 'node:assert/strict'
import { buildHomeGroundCoverPlacements, homeGroundCoverAllowed } from '../src/spatial/layout/HomeSanctuaryGroundCover.tsx'

const TIERS = [['low', 350], ['medium', 850], ['high', 1600]]
for (const [tier, count] of TIERS) {
  test(`Home ground cover ${tier}: bounded, deterministic, distributed and obstacle clear`, () => {
    const placements = buildHomeGroundCoverPlacements(tier)
    assert.equal(placements.length, count)
    assert.deepEqual(buildHomeGroundCoverPlacements(tier), placements)
    assert.equal(new Set(placements.map(([x, z]) => `${x}:${z}`)).size, count)
    const quadrants = new Set()
    for (const [x, z, height, yaw, tint] of placements) {
      assert.ok(homeGroundCoverAllowed(x, z), `Placement encroaches: ${x},${z}`)
      assert.ok(Number.isFinite(height) && height >= .68 && height <= 1.36)
      assert.ok(Number.isFinite(yaw) && yaw >= 0 && yaw <= 2 * Math.PI)
      assert.ok(tint >= 0 && tint < 1)
      quadrants.add(`${x >= 0 ? 'E' : 'W'}${z >= -3 ? 'N' : 'S'}`)
    }
    assert.equal(quadrants.size, 4)
  })
}
test('Home ground cover keeps canonical movement and sanctuary landmarks clear', () => {
  for (const [x, z] of [[-.85,8.4], [1.8,-9.5], [9.8,-7.8], [-4.45,-4.5], [4.45,-4.5], [-5.4,-10.8], [5.4,-10.8], [0,-5.4]]) {
    assert.equal(homeGroundCoverAllowed(x, z), false, `Expected a preserved clearing at ${x},${z}`)
  }
})
