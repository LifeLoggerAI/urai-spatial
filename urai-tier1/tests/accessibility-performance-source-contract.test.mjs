import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => fs.readFileSync(path.resolve(testDirectory, '..', relativePath), 'utf8')

test('accessibility and performance evidence lane preserves required source contracts', () => {
  const reducedMotion = read('src/spatial/hooks/useReducedMotion.ts')
  const adaptiveQuality = read('src/spatial/performance/useAdaptiveSpatialQuality.ts')
  const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
  const companionCss = read('src/spatial/world/persistentWorldCompanion.css')
  const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
  const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const homeFallback = read('src/app/FinalHomeThreshold.tsx')
  const focus = read('src/app/focus/FocusChamberClient.tsx')

  assert.match(reducedMotion, /prefers-reduced-motion\s*:\s*reduce/)
  assert.match(reducedMotion, /addEventListener\?\.\(\s*['"`]change['"`]\s*,\s*update\s*\)/)
  assert.match(reducedMotion, /removeEventListener\?\.\(\s*['"`]change['"`]\s*,\s*update\s*\)/)

  assert.match(adaptiveQuality, /saveData/)
  assert.match(adaptiveQuality, /deviceMemory/)
  assert.match(adaptiveQuality, /effectiveType/)
  assert.match(adaptiveQuality, /visibilitychange/)
  assert.match(adaptiveQuality, /markFirstSpatialFrame/)

  assert.match(companion, /aria-label=\{open\s*\?\s*['"]Close Orb travel controls['"]\s*:\s*['"]Open Orb travel controls['"]\}/)
  assert.match