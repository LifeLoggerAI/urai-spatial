import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

test('persistent world doorways preserve navigation and separate hit targets', () => {
  const gateway = read('src/spatial/world/GroundGateway.tsx')
  const controller = read('src/spatial/world/WorldTransitionController.tsx')
  const home = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const finalCss = read('src/app/native-doorway-final-fix.css')
  const lifeMap = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')

  assert.match(controller, /beginTravelRef\.current\(request\)/)
  assert.match(gateway, /router\.push\('\/ground\?from=ground-gateway'\)/)
  assert.match(gateway, /1450/)
  assert.match(home, /height: 56px/)
  assert.match(home, /bottom: max\(210px/)
  assert.match(finalCss, /\.urai-ground-gateway \{[\s\S]*z-index: 8 !important/)
  assert.match(finalCss, /height: 96px !important/)
  assert.match(lifeMap, /data-urai-audit-action="life-map-focus"/)
  assert.match(lifeMap, /data-urai-audit-action="life-map-replay"/)
})
