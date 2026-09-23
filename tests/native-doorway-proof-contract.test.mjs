import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')
const homeRuntime = await readFile(new URL('../urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')

test('semantic destinations are browser-native anchors', () => {
  assert.match(homeRuntime, /data-testid="home-semantic-ground" href=\{HOME_SEMANTIC_DESTINATIONS\.ground\.travelHref\}/)
  assert.match(homeRuntime, /data-testid="home-semantic-life-map" href=\{HOME_SEMANTIC_DESTINATIONS\.lifeMap\.travelHref\}/)
  assert.doesNotMatch(homeRuntime, /directHomeSemanticTravel/)
  assert.match(proof, /semantic target must own native href/)
  assert.match(proof, /semantic target must be a browser-native anchor/)
})

test('keyboard doorway activation proves native Tab focus followed by native Enter', () => {
  assert.match(proof, /async function focusTargetWithNativeKeyboard/)
  assert.match(proof, /await page\.keyboard\.press\('Tab'\)/)
  assert.match(proof, /const handle = await target\.elementHandle\(\)/)
  assert.match(proof, /document\.activeElement === element/)
  assert.match(proof, /browser-native Tab focus/)
  assert.match(proof, /await page\.keyboard\.press\('Enter'\)/)
  assert.match(proof, /inputDispatch: testCase\.method === 'keyboard' \? 'browser-tab-enter'/)
  assert.match(proof, /keyboardNavigationCoveredByBrowserTabAndEnter: true/)
  assert.doesNotMatch(proof, /await target\.focus\(\)/)
  assert.match(proof, /await page\.waitForURL/)
})

test('pointer and touch use page-context DOM geometry and real browser-coordinate input', () => {
  assert.match(proof, /const viewport = page\.viewportSize\(\)/)
  assert.match(proof, /if \(!fullyInsideViewport\) \{[\s\S]*scrollIntoView/)
  assert.match(proof, /const before = initial/)
  assert.match(proof, /const after = await measure\(\)/)
  assert.match(proof, /getBoundingClientRect\(\)/)
  assert.match(proof, /semantic target geometry is still moving/)
  assert.match(proof, /page\.mouse\.click\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /page\.touchscreen\.tap\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.doesNotMatch(proof, /target\.click\(\{ trial: true/)
  assert.doesNotMatch(proof, /target\.tap\(\{ trial: true/)
  assert.match(proof, /box\.width < 44 \|\| box\.height < 44/)
  assert.match(proof, /await page\.waitForURL[\s\S]*record\.targetOwnsHitPoint = true/)
})

test('native doorway activation stays browser-native while current rendered destination settlement is enforced', () => {
  assert.doesNotMatch(proof, /__reactProps|__reactFiber/)
  assert.doesNotMatch(proof, /dispatchEvent\(new MouseEvent|target\.evaluate\([\s\S]*\.click\(/)
  assert.match(proof, /nativeAnchorActivationDoesNotRequireReactClickHandler: true/)
  assert.match(proof, /tagName !== 'A'/)
  assert.match(proof, /async function settleRenderedDestination/)
  assert.match(proof, /data-testid="urai-ground-lived-world"/)
  assert.match(proof, /groundReady === 'true'/)
  assert.match(proof, /groundVisualOwner === 'atmospheric-living-environment'/)
  assert.match(proof, /groundRuntimeOwner === 'first-person-lived-world'/)
  assert.match(proof, /groundExploration === 'first-person-no-visible-body'/)
  assert.match(proof, /groundRenderedOwnerContract: 'atmospheric-living-environment-plus-first-person-runtime-plus-visible-canvas'/)
  assert.doesNotMatch(proof, /urai-ground-private-workforce-world|shared-continuity-architecture/)
})

test('proof suppresses first-run onboarding while preserving real browser-coordinate touch', () => {
  assert.match(proof, /urai:onboarding:v3:setup-complete/)
  assert.match(proof, /page\.touchscreen\.tap\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
})

test('mobile Ground proof keeps current movement, Home return, Places and Privacy controls usable', () => {
  assert.match(proof, /Ground analog movement/)
  assert.match(proof, /Return Home/)
  assert.match(proof, /Ground place and privacy tools/)
  assert.match(proof, /name: 'Places'/)
  assert.match(proof, /name: 'Privacy'/)
  assert.match(proof, /Ground analog movement target is below 44px/)
  assert.match(proof, /Ground Home return target is below 44px/)
  assert.match(proof, /Ground place\/privacy target is below 44px/)
  assert.match(proof, /async function domBox/)
  assert.match(proof, /getBoundingClientRect\(\)/)
  assert.doesNotMatch(proof, /movement\.boundingBox\(\)|home\.boundingBox\(\)|link\.boundingBox\(\)/)
})

test('semantic navigation stays statically opacity-bounded and runtime footprint-bounded', () => {
  assert.match(homeRuntime, /\.urai-home-spatial-runtime-layer>\.home-semantic-navigation\{[^}]*width:48px;[^}]*opacity:\.015\}/)
  assert.match(proof, /data-home-navigation-non-dominant/)
  assert.match(proof, /navBox\.width <= 64/)
  assert.match(proof, /navAreaRatio <= 0\.03/)
  assert.match(proof, /nonDominanceOpacitySourceContract: '\.015'/)
})
