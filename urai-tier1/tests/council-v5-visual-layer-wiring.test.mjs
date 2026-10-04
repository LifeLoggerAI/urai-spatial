import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('canonical Council route retains promoted v5 visual-layer selectors', () => {
  const council = fs.readFileSync(new URL('../src/spatial/council/CouncilRealm.tsx', import.meta.url), 'utf8')
  const wiring = fs.readFileSync(new URL('../src/app/v5-asset-wiring.css', import.meta.url), 'utf8')

  assert.match(council, /className="urai-spatial-realm-experience\b/)
  assert.match(council, /data-spatial-realm="council"/)
  assert.match(council, /alpha: true/)
  assert.doesNotMatch(council, /<color attach="background"/)
  assert.match(wiring, /\.urai-spatial-realm-experience\[data-spatial-realm='council'\]/)
  assert.match(wiring, /\/assets\/urai\/v5\/council-chamber\.webp/)
  assert.match(wiring, /\/assets\/urai\/v5\/world-council\.webp/)
})
