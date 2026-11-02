import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  DISCLOSED_SAMPLE_STAR_SELECTOR,
  SELECTED_MEMORY_FOCUS_SELECTOR,
  disclosedSampleStar,
  selectedMemoryFocusAction,
} from './canonical-browser-selection-controls.mjs'

const browser = readFileSync(new URL('./spatial-tier-lock-hardening.mjs', import.meta.url), 'utf8')

function pageFixture() {
  const selectors = []
  const control = { observed: true }
  return { selectors, control, page: { locator(value) { selectors.push(value); return control } } }
}

test('the disclosed demo result is the specific semantic button, not an unscoped scene node', () => {
  const f = pageFixture()
  assert.equal(disclosedSampleStar(f.page), f.control)
  assert.deepEqual(f.selectors, [DISCLOSED_SAMPLE_STAR_SELECTOR])
  assert.match(DISCLOSED_SAMPLE_STAR_SELECTOR, /^#life-map-navigator button\[data-life-map-semantic-result\]/)
  assert.match(DISCLOSED_SAMPLE_STAR_SELECTOR, /\[data-life-map-node-id="quiet-reset"\]$/)
  assert.doesNotMatch(DISCLOSED_SAMPLE_STAR_SELECTOR, /:not\(|data-life-map-source="private"/)
})

test('Focus entry uses the selected-world threshold, regardless of optional inspector visibility', () => {
  const f = pageFixture()
  assert.equal(selectedMemoryFocusAction(f.page), f.control)
  assert.deepEqual(f.selectors, [SELECTED_MEMORY_FOCUS_SELECTOR])
  assert.match(SELECTED_MEMORY_FOCUS_SELECTOR, /\.life-map-thresholds\[aria-label="Selected memory actions"\] button\.focus-threshold$/)
  assert.doesNotMatch(SELECTED_MEMORY_FOCUS_SELECTOR, /semantic-inspector|replay-threshold/)
})

test('canonical browser suite uses those controls after disclosed selection and camera arrival', () => {
  assert.match(browser, /import \{ disclosedSampleStar, selectedMemoryFocusAction \} from '\.\/canonical-browser-selection-controls\.mjs'/)
  assert.match(browser, /const star = disclosedSampleStar\(page\)/)
  assert.match(browser, /await expectAttr\(scene, 'data-life-map-phase', 'arrival', 40000\)/)
  assert.match(browser, /const action = selectedMemoryFocusAction\(page\)/)
  assert.doesNotMatch(browser, /page\.locator\('\[data-life-map-node-id=/)
  assert.doesNotMatch(browser, /page\.locator\('\.life-map-semantic-inspector \.semantic-thresholds button'/)
})

test('browser still verifies exact demo manifest and private denial', () => {
  assert.match(browser, /selectedDemoIdentity\(page\)/)
  assert.match(browser, /expectAttr\(focus, 'data-manifest-id', DEMO_MANIFEST\)/)
  assert.match(browser, /expectAttr\(gate, 'data-private-memory-mounted', 'false'\)/)
})

test('browser suite receipts remain separate so later passes cannot overwrite camera failure evidence', () => {
  assert.match(browser, /function persistBrowserReport\(report\)/)
  assert.match(browser, /spatial-tier-lock-hardening-report-\$\{suiteName\}\.json/)
  assert.match(browser, /persistBrowserReport\(report\)/)
  const calls = browser.match(/persistBrowserReport\(report\);/g) || []
  assert.equal(calls.length, 2, 'success and error paths must both write distinct suite evidence')
})

test('painted sky pointer uses real browser mouse and retains physical camera proof', () => {
  assert.match(browser, /await page\.mouse\.click\(/)
  assert.doesNotMatch(browser, /await canvas\.click\(/)
  assert.match(browser, /const cameraMovement = cameraHeights\.length > 1/)
  assert.match(browser, /cameraMovement < 1/)
  assert.match(browser, /cameraCheckpoint/)
  assert.match(browser, /'home-sky-ascent-complete'/)
})
