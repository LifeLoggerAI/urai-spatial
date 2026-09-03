import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')

test('V85 removes the rejected repeated silhouette field while retaining governed Home authority', () => {
  assert.match(art, /const SANCTUARY_BACKDROP = '\/assets\/urai\/ground\/ground-world-main\.webp'/)
  assert.match(art, /function SanctuaryBackdrop\(/)
  assert.match(art, /scene\.background = texture/)
  assert.match(art, /horizon-mountain\|sanctuary-waterfall\|inhabited-village\|living-growth/)
  assert.match(art, /<GovernedHomeEnvironment onWalk=\{onWalk\} \/>/)
  assert.match(art, /<primitive object=\{environment\} \/>/)
})

test('V85 removes cage-like Orb lines and oversized portal rocks without removing interaction', () => {
  assert.match(art, /object\.visible = !\/orb-orbit\|orb-filament\/i\.test\(object\.name\)/)
  assert.doesNotMatch(art, /filamentCurves/)
  assert.match(art, /<ringGeometry args=\{\[0\.66, 0\.76, 64\]\} \/>/)
  assert.match(art, /home-v82-\$\{destination\}-natural-fissure-markers/)
  assert.match(art, /onClick=\{\(event: ThreeEvent<MouseEvent>\) => \{ event\.stopPropagation\(\); onActivate\(\) \}\}/)
})
