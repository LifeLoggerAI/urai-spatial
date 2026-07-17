import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')

test('accessibility and performance evidence lane preserves required source contracts', () => {
  const reducedMotion = read('src/spatial/hooks/useReducedMotion.ts')
  const adaptiveQuality = read('src/spatial/performance/useAdaptiveSpatialQuality.ts')
  const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
  const companionCss = read('src/spatial/world/persistentWorldCompanion.css')
  const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
  const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const focus = read('src/app/focus/FocusChamberClient.tsx')

  assert.match(reducedMotion, /prefers-reduced-motion: reduce/)
  assert.match(reducedMotion, /addEventListener\?\.\('change', update\)/)
  assert.match(reducedMotion, /removeEventListener\?\.\('change', update\)/)

  assert.match(adaptiveQuality, /saveData/)
  assert.match(adaptiveQuality, /deviceMemory/)
  assert.match(adaptiveQuality, /effectiveType/)
  assert.match(adaptiveQuality, /visibilitychange/)
  assert.match(adaptiveQuality, /markFirstSpatialFrame/)

  assert.match(companion, /aria-label=\{open \? 'Close Orb travel controls' : 'Open Orb travel controls'\}/)
  assert.match(companion, /aria-expanded=\{open\}/)
  assert.match(companion, /aria-current=\{destination\.id === world\.destination \? 'page' : undefined\}/)
  assert.match(companion, /aria-label="Return through the world"/)
  assert.match(companionCss, /\.urai-world-companion__orb \{[\s\S]*width: 64px;[\s\S]*height: 64px;/)
  assert.match(companionCss, /@media \(max-width: 560px\) \{[\s\S]*width: 56px; height: 56px;/)
  assert.match(companionCss, /env\(safe-area-inset-bottom\)/)
  assert.match(companionCss, /@media \(prefers-reduced-motion: reduce\)/)

  assert.match(homeCanvas, /canvas\.getContext\('webgl2'\) \?\? canvas\.getContext\('webgl'\)/)
  assert.match(homeCanvas, /if \(!webglAvailable\) return null/)
  assert.match(homeRuntime, /webglAvailable === true/)

  assert.match(focus, /aria-label=\{`Open Replay for \$\{memory\.title\}`\}/)
  assert.match(focus, /env\(safe-area-inset-left\)/)
  assert.match(focus, /env\(safe-area-inset-right\)/)
  assert.match(focus, /env\(safe-area-inset-bottom\)/)
  assert.match(focus, /@media\(prefers-reduced-motion:reduce\)/)
})

test('known serialized 48px and fallback gaps stay visible until issue 696 is closed', () => {
  const companionCss = read('src/spatial/world/persistentWorldCompanion.css')
  const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
  const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const focus = read('src/app/focus/FocusChamberClient.tsx')

  const knownGaps = {
    issue: 696,
    companionMenuUses44px: /\.urai-world-companion__menu button \{[\s\S]*min-height: 44px;/.test(companionCss),
    focusUses44px: /min-height:44px/.test(focus),
    homeCanvasReturnsNullWithoutWebGL: /if \(!webglAvailable\) return null/.test(homeCanvas),
    homeRuntimeRequiresWebGLTrue: /webglAvailable === true/.test(homeRuntime),
  }

  assert.equal(knownGaps.issue, 696)
  assert.equal(knownGaps.companionMenuUses44px, true, 'Issue #696 may be closed and this assertion removed only after serialized target-size proof')
  assert.equal(knownGaps.focusUses44px, true, 'Issue #696 may be closed and this assertion removed only after serialized target-size proof')
  assert.equal(knownGaps.homeCanvasReturnsNullWithoutWebGL, true, 'Replace this assertion with fallback behavior proof after the runtime owner adds the accessible fallback')
  assert.equal(knownGaps.homeRuntimeRequiresWebGLTrue, true, 'Replace this assertion with fallback behavior proof after the runtime owner adds the accessible fallback')
})
