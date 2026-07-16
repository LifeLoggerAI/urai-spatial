import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

test('persistent world doorways preserve canonical navigation and separate hit targets', () => {
  const gateway = read('src/spatial/world/GroundGateway.tsx')
  const controller = read('src/spatial/world/WorldTransitionController.tsx')
  const home = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const finalCss = read('src/app/native-doorway-final-fix.css')
  const lifeMap = read('src/components/lifemap/AdaptiveLifeMapScene.tsx')

  assert.match(controller, /beginTravelRef\.current\(request\)/)
  assert.doesNotMatch(controller, /\[beginTravel, clearTimer, router\]/)
  assert.match(gateway, /requestUraiWorldTravel\(/)
  assert.match(gateway, /destination: 'infrastructure-hub'/)
  assert.doesNotMatch(gateway, /router\.push\(['"]\/ground/)
  assert.doesNotMatch(gateway, /fallbackTimer/)
  assert.match(home, /height: 56px/)
  assert.match(home, /bottom: max\(210px/)
  assert.match(finalCss, /\.urai-ground-gateway \{[\s\S]*z-index: 11 !important/)
  assert.match(finalCss, /\.urai-home-spatial-runtime-layer \{[\s\S]*z-index: 9/)
  assert.match(finalCss, /\.urai-home-spatial-runtime-orb a,[\s\S]*min-height: 48px !important/)
  assert.match(finalCss, /height: 96px !important/)
  assert.match(lifeMap, /data-urai-audit-action="life-map-focus"/)
  assert.match(lifeMap, /data-urai-audit-action="life-map-replay"/)
})
