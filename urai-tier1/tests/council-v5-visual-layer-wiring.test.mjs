import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('canonical Council retains its presences with one rendered chamber owner', () => {
  const council = fs.readFileSync(new URL('../src/spatial/council/CouncilRealm.tsx', import.meta.url), 'utf8')
  const wiring = fs.readFileSync(new URL('../src/app/v5-asset-wiring.css', import.meta.url), 'utf8')

  assert.match(council, /className="urai-spatial-realm-experience\b/)
  assert.match(council, /data-spatial-realm="council"/)
  // Audit V03 found duplicate seated people in the static room behind the
  // adopted humans. The actual navigable chamber owns these pixels now.
  assert.match(council, /alpha: false/)
  assert.match(council, /<color attach="background"/)
  assert.match(council, /<CouncilChamber\s*\/>/)
  assert.match(council, /\[data-council-embodied="true"\]::after\{display:none\}/)
  assert.match(council, /council-guide-human-makehuman-v4\.glb/)
  assert.match(council, /playCouncilBodyIdle\(actions, reducedMotion\)/)
  assert.match(council, /playCouncilListening\(actions, selected, reducedMotion\)/)
  assert.match(wiring, /\.urai-spatial-realm-experience\[data-spatial-realm='council'\]/)
  assert.match(wiring, /\/assets\/urai\/v5\/council-chamber\.webp/)
  assert.match(wiring, /\/assets\/urai\/v5\/world-council\.webp/)
})
