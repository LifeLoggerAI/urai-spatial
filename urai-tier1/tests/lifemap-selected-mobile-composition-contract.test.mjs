import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const css = read('src/spatial/world/lifeMapSelectedActionHardening.css')
const invariant = read('src/spatial/world/lifeMapSelectedActionInvariant.css')
const runtimeInvariant = read('src/spatial/world/LifeMapSelectedActionRuntimeInvariant.tsx')
const shell = read('src/spatial/world/UraiWorldShell.tsx')

test('selected Life Map action ownership does not wait for outer world-state synchronization', () => {
  assert.match(invariant, /^\.life-map-independent-realm\[data-life-map-mode='selected'\]/m)
  assert.doesNotMatch(invariant, /data-world-destination='life-map'/)
  assert.match(invariant, /> \.life-map-memory-portals/)
  assert.match(invariant, /z-index: 2147483000 !important/)
  assert.match(invariant, /height: 52px !important/)
  assert.match(invariant, /min-height: 52px !important/)
  assert.match(invariant, /pointer-events: auto !important/)
  assert.match(invariant, /> \.life-map-accessibility-menu[\s\S]*pointer-events: none !important/)
  assert.match(shell, /import '\.\/lifeMapSelectedActionHardening\.css'[\s\S]*import '\.\/lifeMapSelectedActionInvariant\.css'/)
})

test('runtime invariant applies important geometry and pointer ownership when the rail appears', () => {
  assert.match(runtimeInvariant, /MutationObserver\(apply\)/)
  assert.match(runtimeInvariant, /requestAnimationFrame\(hardenSelectedActions\)/)
  assert.match(runtimeInvariant, /style\.setProperty\(property, value, 'important'\)/)
  assert.match(runtimeInvariant, /\['height', '52px'\]/)
  assert.match(runtimeInvariant, /\['min-height', '52px'\]/)
  assert.match(runtimeInvariant, /\['z-index', '2147483646'\]/)
  assert.match(runtimeInvariant, /nav\.querySelectorAll<HTMLElement>\('button'\)/)
  assert.match(runtimeInvariant, /pointer-events', 'none'/)
  assert.match(shell, /import \{ LifeMapSelectedActionRuntimeInvariant \}/)
  assert.match(shell, /<LifeMapSelectedActionRuntimeInvariant \/>/)
})

test('selected Life Map desktop composition keeps readable title and separated action bands', () => {
  assert.match(css, /@media \(min-width: 761px\)/)
  assert.match(css, /data-life-map-mode='selected'\]::after/)
  assert.match(css, /top: 48vh/)
  assert.match(css, /z-index: 2147482000/)
  assert.match(css, /> \.life-map-whisper\[data-selected='true'\]/)
  assert.match(css, /bottom: max\(168px, calc\(env\(safe-area-inset-bottom\) \+ 158px\)\) !important/)
  assert.match(css, /font-size: clamp\(30px, 3\.2vw, 46px\) !important/)
  assert.match(css, /text-transform: none !important/)
  assert.match(css, /max-width: 58ch !important/)
  assert.match(invariant, /@media \(min-width: 761px\)/)
  assert.match(invariant, /bottom: max\(96px, calc\(env\(safe-area-inset-bottom\) \+ 86px\)\) !important/)
  assert.match(invariant, /max-width: 960px !important/)
})

test('mobile Life Map keeps the sample-data disclosure below the top controls', () => {
  assert.match(css, /> \.life-map-sample-boundary/)
  assert.match(css, /position: fixed !important/)
  assert.match(css, /top: max\(124px, calc\(env\(safe-area-inset-top\) \+ 118px\)\) !important/)
  assert.match(css, /left: max\(12px, env\(safe-area-inset-left\)\) !important/)
  assert.match(css, /right: max\(12px, env\(safe-area-inset-right\)\) !important/)
  assert.match(css, /text-align: center !important/)
  assert.match(css, /pointer-events: none !important/)
})

test('selected Life Map mobile composition keeps readable title and stable action geometry', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /data-life-map-mode='selected'\]::after/)
  assert.match(css, /top: 50svh/)
  assert.match(css, /z-index: 2147482000/)
  assert.match(css, /> \.life-map-whisper\[data-selected='true'\]/)
  assert.match(css, /bottom: max\(196px, calc\(env\(safe-area-inset-bottom\) \+ 186px\)\) !important/)
  assert.match(css, /font-size: clamp\(21px, 6\.8vw, 29px\) !important/)
  assert.match(css, /text-transform: none !important/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.match(invariant, /@media \(max-width: 760px\)/)
  assert.match(invariant, /bottom: max\(126px, calc\(env\(safe-area-inset-bottom\) \+ 116px\)\) !important/)
  assert.match(invariant, /left: max\(12px, env\(safe-area-inset-left\)\) !important/)
  assert.match(invariant, /right: max\(12px, env\(safe-area-inset-right\)\) !important/)
})
