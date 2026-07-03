import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8')
const css = fs.readFileSync(path.join(root, 'src/app/lifemap-proof-crops.css'), 'utf8')

test('Life Map proof fixes load after the visual authority stack', () => {
  assert.match(layout, /import '\.\/aaa-visual-authority-20260703\.css'\s+import '\.\/lifemap-proof-crops\.css'/)
})

test('Life Map headline cannot clip its supporting copy on desktop', () => {
  assert.match(css, /\.lifeGalaxy \.mapHud \{[^}]*max-height: none !important;[^}]*overflow: visible !important;/s)
  assert.match(css, /\.lifeGalaxy \.mapHud h1 \{[^}]*line-height: \.88 !important;/s)
})

test('mobile selected-star labels stay inside the viewport', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /width: min\(164px, 42vw\) !important/)
  assert.match(css, /overflow-wrap: anywhere !important/)
  assert.match(css, /white-space: normal !important/)
})

test('mobile selection controls and navigation retain safe lower spacing', () => {
  assert.match(css, /\.lifeGalaxy \.starDock \{[^}]*bottom: 4\.9rem !important;/s)
  assert.match(css, /\.lifeGalaxy \.portalRail \{[^}]*width: calc\(100vw - 1rem\) !important;/s)
})
