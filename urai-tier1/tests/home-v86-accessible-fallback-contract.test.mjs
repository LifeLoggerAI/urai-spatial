import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const component = readFileSync(new URL('../src/app/HomeSpatialWorldFinal.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/app/home-spatial-world-final.css', import.meta.url), 'utf8')
const continuousProof = readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')

test('V86 binds the no-WebGL Home to a coherent sanctuary art revision', () => {
  assert.match(component, /data-home-fallback-art-revision="v86-coherent-sanctuary"/)
  assert.match(styles, /url\('\/assets\/urai\/ground\/ground-world-main\.webp'\)/)
  assert.match(styles, /\.urai-genesis-home__world > :not\(\.urai-genesis-home__world-vignette\)/)
})

test('V86 removes the procedural pedestal composition without removing accessible Orb interaction', () => {
  assert.match(component, /type="button" className="urai-genesis-home__orb"/)
  assert.match(component, /aria-label="Open URAI orb companion"/)
  assert.match(styles, /\.urai-genesis-home__orb-aura,[\s\S]*\.urai-genesis-home__orb-shell,[\s\S]*\.urai-genesis-home__orb-ring[\s\S]*display: none/)
  assert.match(styles, /\.urai-genesis-home__orb-label[\s\S]*position: static/)
})

test('V86 retains exact timeout pixels and readiness telemetry instead of emitting an opaque failure', () => {
  assert.match(continuousProof, /home-readiness-timeout-/)
  assert.match(continuousProof, /Object\.fromEntries\(\[\.\.\.owner\.attributes\]/)
  assert.match(continuousProof, /receipt\.errors\.push\(\{ id: 'home-readiness-timeout'/)
})
