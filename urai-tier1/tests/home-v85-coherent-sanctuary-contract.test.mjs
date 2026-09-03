import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')

test('V95 removes the rejected repeated silhouette field at its nested GLB depth while retaining governed Home authority', () => {
  assert.match(art, /function SanctuaryBackdrop\(/)
  assert.match(art, /horizon-mountain-\|sanctuary-waterfall-\|inhabited-village-\|living-growth-/)
  assert.match(art, /root\.traverse\(\(object\) =>/)
  assert.match(art, /object\.parent\?\.remove\(object\)/)
  assert.match(art, /<GovernedHomeEnvironment onWalk=\{onWalk\} \/>/)
  assert.match(art, /<primitive object=\{environment\} \/>/)
})

test('V95 removes cage-like Orb lines and ring-marker portals without removing interaction', () => {
  assert.match(art, /object\.visible = !\/orb-aura\|orb-core\|orb-orbit\|orb-filament\/i\.test\(object\.name\)/)
  assert.doesNotMatch(art, /filamentCurves/)
  assert.doesNotMatch(art, /<ringGeometry/)
  assert.match(art, /v95-architectural-rock-cut-threshold-no-ring-marker/)
  assert.match(art, /home-v82-\$\{destination\}-natural-fissure-markers/)
  assert.match(art, /onClick=\{\(event: ThreeEvent<MouseEvent>\) => \{ event\.stopPropagation\(\); onActivate\(\) \}\}/)
})
