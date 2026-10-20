import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { inspectHomeOrbCanvasSamples, inspectVisibleHomeNavigation } from '../scripts/home-orb-canvas-sampling.mjs'

const points = [[.12,.18],[.36,.18],[.64,.18],[.88,.18],[.12,.5],[.36,.5],[.64,.5],[.88,.5],[.12,.82],[.36,.82],[.64,.82],[.88,.82]]
function inspect({ cover = true, recognized = true, extraCover = false, href = '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent', width = 124, height = 48, pointerEvents = 'auto' } = {}) {
  const canvas = { getBoundingClientRect: () => ({ x: 0, y: 0, width: 390, height: 844 }) }
  const control = { tagName: 'A', contains: (hit) => hit === control,
    closest: (selector) => recognized && selector.includes('data-testid="home-semantic-ground"') ? control : null,
    getAttribute: () => href, getBoundingClientRect: () => ({ x: 253, y: 661, width, height }) }
  return vm.runInNewContext(`(${inspectHomeOrbCanvasSamples.toString()})(canvas, points)`, {
    canvas, points, URL,
    getComputedStyle: () => ({ display: 'flex', visibility: 'visible', pointerEvents, opacity: '1' }),
    document: { baseURI: 'http://127.0.0.1:4173/home/', elementFromPoint: (x, y) =>
      cover && x === 390 * .88 && y === 844 * .82 ? control : extraCover && x === 390 * .12 && y === 844 * .18 ? { tagName: 'DIV' } : canvas },
  })
}
test('all twelve unobstructed world samples remain strict', () => {
  const result = inspect({ cover: false }); assert.equal(result.accepted, true); assert.equal(result.samplePoints.length, 12); assert.equal(result.excludedHud.length, 0)
})
test('only exact bounded Ground HUD records one positive hit while preserving eleven world samples', () => {
  const result = inspect(); assert.equal(result.accepted, true); assert.equal(result.samplePoints.length, 11)
  assert.equal(result.unobstructedSampleFraction, 11 / 12); assert.equal(result.excludedHud[0].hitConfirmed, true)
  assert.equal(result.excludedHud[0].testId, 'home-semantic-ground'); assert.equal(result.excludedHud[0].bounds.width, 124)
})
for (const [label, options] of [
  ['unrecognized covering link', { recognized: false }], ['other world occlusion', { extraCover: true }],
  ['wrong destination', { href: '/life-map/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent' }],
  ['external destination', { href: 'https://example.invalid/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent' }],
  ['missing journey authority', { href: '/ground/' }], ['oversized HUD cover', { width: 390 }],
  ['noninteractive control', { pointerEvents: 'none' }],
]) test(`reject ${label}`, () => assert.equal(inspect(options).accepted, false))

function inspectNavigation({ count = 3, wrongId = false, hrefWrong = false, width = 124, height = 48,
  hidden = false, disabled = false, covered = false, offscreen = false, oversized = false, opacity = '1' } = {}) {
  const ids = ['home-semantic-orb', 'home-semantic-ground', 'home-semantic-life-map']
  const urls = ['', '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent', '/life-map/?entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete']
  const nav = { parentElement: null, getBoundingClientRect: () => ({ left: 253, right: oversized ? 643 : 377, top: 601, bottom: 763, width: oversized ? 390 : 124, height: 162 }) }
  const controls = ids.slice(0, count).map((id, i) => ({
    tagName: i ? 'A' : 'BUTTON', parentElement: nav, disabled,
    getAttribute: name => name === 'data-testid' ? wrongId && i === 1 ? 'unrecognized' : id : name === 'href' ? hrefWrong && i === 1 ? 'https://example.invalid/ground/' : urls[i] : name === 'aria-label' ? id : null,
    getBoundingClientRect: () => ({ left: offscreen ? -1 : 253, right: 253 + width, top: 601 + i * 56, bottom: 601 + i * 56 + height, width, height }),
    contains: hit => controls[i] === hit,
  }))
  nav.querySelectorAll = () => controls
  return vm.runInNewContext(`(${inspectVisibleHomeNavigation.toString()})(nav)`, {
    nav, URL, innerWidth: 390, innerHeight: 844,
    getComputedStyle: () => ({ display: hidden ? 'none' : 'flex', visibility: 'visible', opacity }),
    document: { baseURI: 'http://127.0.0.1:4173/home/', elementFromPoint: (x, y) => covered ? { tagName: 'DIV' } : controls.find((control, i) => y >= 601 + i * 56 && y <= 601 + i * 56 + height) },
  })
}
test('visible Home HUD proves all three exact actions, bounded area and positive hits', () => {
  const result = inspectNavigation(); assert.equal(result.passed, true); assert.equal(result.controls.length, 3)
  assert.ok(result.areaFraction < .1); assert.ok(result.controls.every(c => c.hitConfirmed && c.recognized && c.enabled))
})
for (const [label, options] of [
  ['missing action', { count: 2 }], ['unknown action identity', { wrongId: true }],
  ['wrong destination', { hrefWrong: true }], ['undersized target', { height: 32 }],
  ['hidden action', { hidden: true }], ['disabled action', { disabled: true }],
  ['covered action', { covered: true }], ['offscreen action', { offscreen: true }],
  ['dominant HUD', { oversized: true }], ['retired near-transparent HUD', { opacity: '.015' }],
]) test(`visible navigation rejects ${label}`, () => assert.equal(inspectNavigation(options).passed, false))
