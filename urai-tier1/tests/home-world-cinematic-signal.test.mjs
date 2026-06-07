import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const derivationSource = read('src/spatial/home/signal/homeWorldSignalDerivation.ts')

test('cinematic HomeScene is wired into active SpatialHomeWorld', () => {
  const spatial = read('src/spatial/home/SpatialHomeWorld.tsx')
  const homeScene = read('src/spatial/home/visual/HomeScene.tsx')
  const layout = read('src/app/layout.tsx')

  assert.match(spatial, /HomeScene/)
  assert.match(spatial, /data-testid="urai-spatial-stage"/)
  assert.match(layout, /HomeScene\.css/)
  assert.match(homeScene, /data-testid="urai-home-scene"/)
  assert.match(homeScene, /data-testid="urai-orb-button"/)
  assert.match(homeScene, /data-testid="urai-command-ribbon"/)
  assert.match(homeScene, /aria-label="Enter Life Map"/)
})

test('cinematic HomeScene preserves tier data attributes and reduced-motion styles', () => {
  const homeScene = read('src/spatial/home/visual/HomeScene.tsx')
  const css = read('src/spatial/home/visual/HomeScene.css')

  for (const attr of ['data-ground-tier', 'data-orb-tier', 'data-sky-tier', 'data-mood', 'data-recovery', 'data-energy', 'data-narrator-speaking']) {
    assert.match(homeScene, new RegExp(attr))
  }

  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /orb-companion/)
  assert.match(css, /urai-horizon-system/)
  assert.match(css, /avatar-chest-glow/)
})

test('stable derivation has confidence-gated gradual upgrade rules', () => {
  assert.match(derivationSource, /minConfidenceForUpgrade:\s*0\.62/)
  assert.match(derivationSource, /maxTierStepPerRun:\s*1/)
  assert.match(derivationSource, /upgradeMargin:\s*6/)
  assert.match(derivationSource, /stabilizeTier\(groundScore, previous\.groundTier, confidence, opts\)/)
})

test('stable derivation holds tier when confidence is low', () => {
  assert.match(derivationSource, /confidence < options\.minConfidenceForUpgrade/)
  assert.match(derivationSource, /return previous/)
  assert.match(derivationSource, /shouldHoldTier/)
})

test('stable derivation avoids harsh downgrade from one isolated heavy day', () => {
  assert.match(derivationSource, /minConfidenceForDowngrade:\s*0\.78/)
  assert.match(derivationSource, /downgradeMargin:\s*14/)
  assert.match(derivationSource, /privacySafeSummary/)
  assert.match(derivationSource, /replace\(\/diagnosis\/gi, "label"\)/)
})
