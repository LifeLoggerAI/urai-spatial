import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import postcss from 'postcss'
import { CANVAS_EVIDENCE_SAMPLE_POINTS } from '../../scripts/capture-visible-canvas-png.mjs'

const read = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
const runtime = read('app/HomeSpatialRuntimeLayer.tsx')
const shared = read('spatial/navigation/EmbodiedNavigation.tsx')
const home = postcss.parse(read('spatial/layout/HomeWorldProduction.module.css'))
const navigation = postcss.parse(runtime.match(/const runtimeStyles = `([^`]+)`/)[1])
const movement = postcss.parse(shared.match(/\.urai-mobile-movement\{display:none;[^}]+\}/)[0])

function rule(root, selector, media = null) {
  const match = root.nodes.flatMap(node => node.type === 'atrule' && node.name === 'media' ? node.nodes : [node])
    .find(node => node.type === 'rule' && node.selector === selector
      && (media ? node.parent.params === media : node.parent.type === 'root'))
  assert.ok(match, `Missing production rule: ${selector} in ${media ?? 'base'}`)
  return Object.fromEntries(match.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]))
}
const nav = rule(navigation, '.urai-home-spatial-runtime-layer>.home-semantic-navigation')
const target = rule(navigation, '.urai-home-spatial-runtime-layer>.home-semantic-navigation button,.urai-home-spatial-runtime-layer>.home-semantic-navigation a')
const pad = rule(movement, '.urai-mobile-movement')
const homePad = rule(home, '.world :global(.urai-mobile-movement)')
const landscapePad = rule(home, '.world :global(.urai-mobile-movement)', '(max-height: 500px) and (orientation: landscape)')
const help = rule(home, '.world :global(.urai-movement-help:not([open]))')
const px = (value) => { assert.match(value, /^\d+px$/); return Number.parseFloat(value) }
function safeOffset(value, inset) {
  const minimum = Number(value.match(/max\((\d+)px/)[1])
  const addition = Number(value.match(/\+\s*(\d+)px/)?.[1] ?? 0)
  return Math.max(minimum, inset + addition)
}
function trackSize(value) {
  const repeated = value.match(/^repeat\((\d+),\s*(\d+)px\)$/)
  return repeated ? { count: Number(repeated[1]), size: Number(repeated[2]) } : { count: 1, size: px(value) }
}
function box(x, y, width, height) { return { x, y, width, height, right: x + width, bottom: y + height } }
function intersects(a, b) { return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y }
function contains(a, [x, y]) { return x >= a.x && x <= a.right && y >= a.y && y <= a.bottom }
function layout(width, height, safe = { left: 0, right: 0, top: 0, bottom: 0 }) {
  const compact = height <= 500 && width > height
  const columns = trackSize((compact ? landscapePad : pad)['grid-template-columns'])
  const rows = trackSize((compact ? landscapePad : pad)['grid-template-rows'])
  const navBox = box(safeOffset(nav.left, safe.left), safeOffset(nav.top, safe.top), px(target.width) * 3 + px(nav.gap) * 2, px(target.height))
  const padHeight = rows.count * rows.size + (rows.count - 1) * px(pad.gap)
  const padBox = box(safeOffset(pad.left, safe.left), height - safeOffset(homePad.bottom, safe.bottom) - padHeight, columns.count * columns.size + (columns.count - 1) * px(pad.gap), padHeight)
  // The closed Home help has a fixed CSS width; its shared summary is 48px + borders.
  const helpBox = box(width - Math.max(10, safe.right) - px(help.width), Math.max(10, safe.top), px(help.width), 50)
  const selfBox = box(width - Math.max(16, safe.right) - 72, height - Math.max(16, safe.bottom) - 48, 72, 48)
  return { navBox, padBox, helpBox, selfBox }
}
const cases = [[320,900],[390,844],[430,932],[768,1024],[1024,768],[568,320],[844,390]]
const captureScript = readFileSync(new URL('../../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')
const captureCases = [...captureScript.matchAll(/viewport: \{ width: (\d+), height: (\d+) \}/g)].map(match => [Number(match[1]), Number(match[2])])

test('production Home edge controls fit portrait, tablet, short landscape and safe insets without overlap', () => {
  assert.ok(px(target['min-width']) >= 48 && px(target['min-height']) >= 48)
  for (const [width, height] of cases) {
    for (const safe of [{ left:0, right:0, top:0, bottom:0 }, { left:44, right:44, top:0, bottom:21 }, { left:0, right:0, top:44, bottom:34 }]) {
      // Side notches apply in landscape, not to 320px portrait width.
      if (width < height && safe.left) continue
      const boxes = Object.values(layout(width, height, safe))
      for (const bounds of boxes) {
        assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.right <= width && bounds.bottom <= height, JSON.stringify({width,height,safe,bounds}))
      }
      for (let first = 0; first < boxes.length; first++) for (let second = first + 1; second < boxes.length; second++) {
        assert.equal(intersects(boxes[first], boxes[second]), false, JSON.stringify({width,height,safe,first,second}))
      }
    }
  }
})

test('current capture matrix remains unobstructed without altering its sample points', () => {
  assert.ok(captureCases.length >= 11)
  for (const [width, height] of captureCases) {
    const boxes = Object.values(layout(width, height))
    for (const point of CANVAS_EVIDENCE_SAMPLE_POINTS) {
      assert.equal(boxes.some(bounds => contains(bounds, [point[0] * width, point[1] * height])), false, JSON.stringify({width,height,point}))
    }
  }
})

test('destinations remain readable and native while empty control containers pass scene gestures through', () => {
  assert.equal(nav.opacity, '1')
  assert.equal(nav['pointer-events'], 'none')
  assert.equal(target['pointer-events'], 'auto')
  assert.match(target.font, /12px/)
  assert.equal(homePad['pointer-events'], 'none')
  assert.equal(rule(home, '.world :global(.urai-mobile-movement button)')['pointer-events'], 'auto')
  assert.match(runtime, /<button type="button" aria-label="Open UrAi Orb companion"/)
  assert.match(runtime, /<a aria-label="Open Ground directly"/)
  assert.match(runtime, /<a aria-label="Open Life Map directly"/)
  assert.match(shared, /<summary aria-label=\{`Move through \$\{realm\}`\}/)
  assert.doesNotMatch(runtime, /opacity:\.015|font:700 0\/1/)
})

test('destination text retains AA contrast even over the brightest scene', () => {
  const color = target.color.match(/^#([a-f\d]{6})$/i)[1]
  const foreground = [0,2,4].map(index => parseInt(color.slice(index,index+2),16))
  const [,r,g,b,alpha] = target.background.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/)
  const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum,value,index) => sum + value * [.2126,.7152,.0722][index],0)
  for (const scene of [0,255]) {
    const background = [r,g,b].map(value => Number(value) * Number(alpha) + scene * (1 - Number(alpha)))
    assert.ok((luminance(foreground) + .05) / (luminance(background) + .05) >= 4.5)
  }
})

test('Home companion ownership keeps an operable close action and focus fallback without a second closed trigger', () => {
  const companion = read('spatial/world/PersistentWorldCompanion.tsx')
  const ownershipCss = read('spatial/world/homePhysicalOrbOwnership.css')
  const routeCss = read('spatial/world/routeOwnerConvergence.css')
  const diagnostic = readFileSync(new URL('../../scripts/reconcile-home-orb-consent-proof.mjs', import.meta.url), 'utf8')
  assert.match(companion, /world\.destination !== 'home' \|\| open \? \(/)
  assert.match(companion, /world\.destination === 'home' \? 'Close' : <svg/)
  assert.match(companion, /aria-label=\{open \? 'Close UrAi Orb companion' : 'Open UrAi Orb companion'\}/)
  assert.match(companion, /data-hydrated=\{hydrated \? 'true' : 'false'\}/)
  assert.match(companion, /const focusTarget = activator\?\.isConnected \? activator : homeOrb \?\? orbRef\.current/)
  assert.match(companion, /querySelector<HTMLButtonElement>\('\[data-testid="home-semantic-orb"\]'\)/)
  assert.doesNotMatch(ownershipCss, /display:\s*none/)
  assert.doesNotMatch(routeCss, /width:\s*96px|top:\s*55%/)
  assert.match(diagnostic, /await companionOwner\.count\(\) === 1/)
  assert.match(diagnostic, /data-hydrated="true"/)
  assert.match(diagnostic, /await closeOrb\.count\(\) === 1/)
  assert.match(diagnostic, /await closeOrb\.isVisible\(\) && await closeOrb\.isEnabled\(\)/)
})
