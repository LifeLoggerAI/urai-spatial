import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => fs.readFileSync(path.resolve(directory, '..', relativePath), 'utf8')

const hostRunner = read('../scripts/run-continuous-spatial-proof-v18-host-stable.mjs')
const workflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const naturalRunner = read('../scripts/run-continuous-spatial-proof-v22-natural.mjs')
const groupedRunner = read('../scripts/run-continuous-spatial-proof-v21-grouped.mjs')
const portalLifecycleRunner = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')
const portalRunner = read('../scripts/run-continuous-spatial-proof-v18-portal-stable.mjs')
const stableRunner = read('../scripts/run-continuous-spatial-proof-v18-stable.mjs')
const focusBridge = read('src/app/ground/GroundFocusContainment.tsx')
const focusCss = read('src/app/ground/ground-focus-containment.css')
const groundPage = read('src/app/ground/page.tsx')
const embodiedEvidence = read('tests/accessibility-performance-embodied-exploration.spec.ts')
const lifeMapEvidence = read('tests/accessibility-performance-lifemap-independent.spec.ts')
const visualEvidence = read('tests/accessibility-performance-spatial-visual.spec.ts')
const accessibilityEvidence = `${embodiedEvidence}\n${lifeMapEvidence}\n${visualEvidence}`

test('continuous Home proof uses a bounded host clock without weakening rendered-frame evidence', async () => {
  const sharedWait = hostRunner.match(/const hostClockWait = `([\s\S]*?)`/)?.[1]
  assert.ok(sharedWait, 'the portal repair must bind the exact shared frame waiter')
  let renderedFrames = 0
  const deadlines = []
  const frameWaiter = vm.runInNewContext(`(${sharedWait})`, {
    requestAnimationFrame: (callback) => { renderedFrames += 1; callback() },
    delay: (timeout) => { deadlines.push(timeout); return new Promise(() => {}) },
  })
  await frameWaiter({ evaluate: (callback) => callback() })
  assert.equal(renderedFrames, 1, 'the actual waiter must request a rendered frame')
  assert.deepEqual(deadlines, [20_000], 'the existing bounded host envelope must remain')
  const hostWaiter = vm.runInNewContext(`(${sharedWait})`, {
    delay: (timeout) => { deadlines.push(timeout); return Promise.resolve('host-clock') },
  })
  await hostWaiter({ evaluate: () => new Promise(() => {}) }, 123)
  assert.deepEqual(deadlines, [20_000, 123], 'a stalled renderer must use the bounded host clock')
  assert.match(hostRunner, /Promise\.race\(\[frameWait, delay\(timeout\)\]\)/)
  assert.match(hostRunner, /stableOriginal\.split\(hostClockWait\)\.length - 1 !== 1/)
  assert.match(hostRunner, /portalOriginal\.split\(portalFrameWait\)\.length - 1 !== 2/)
  assert.match(hostRunner, /requestAnimationFrame\(\(\) => resolve\('rendered-frame'\)\)/)
  assert.match(hostRunner, /portalOriginal\s*\.replaceAll\(portalFrameWait, 'await waitForMovementFrame\(page\)'\)/)
  assert.doesNotMatch(hostRunner, /setTimeout\(finish, timeoutMs\)/)
  assert.ok(stableRunner.includes(sharedWait), 'the current native chain must use the same bounded rendered-frame waiter')
  assert.match(workflow, /node scripts\/run-with-ci-webgl\.mjs scripts\/run-continuous-spatial-proof-v22-natural\.mjs/)
  assert.match(naturalRunner, /run-continuous-spatial-proof-v21-grouped\.mjs/)
  assert.match(groupedRunner, /run-continuous-spatial-proof-v19-portal-stable\.mjs/)
  assert.match(portalLifecycleRunner, /run-continuous-spatial-proof-v18-portal-stable\.mjs/)
  assert.match(portalRunner, /run-continuous-spatial-proof-v18-stable\.mjs/)
})

test('Ground focus expansion remains fully reachable at the required 390px viewport', () => {
  assert.match(groundPage, /GroundFocusContainment/)
  assert.match(groundPage, /ground-focus-containment\.css/)
  assert.match(focusBridge, /const subject = entry \?\? target/)
  assert.match(focusBridge, /subject\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest' \}\)/)
  assert.match(focusBridge, /const leftBoundary = Math\.max\(railRect\.left, viewportLeft\)/)
  assert.match(focusBridge, /const rightBoundary = Math\.min\(railRect\.right, viewportRight\)/)
  assert.match(focusBridge, /const padding = 8/)
  assert.match(focusBridge, /rail\.scrollLeft \+= delta/)
  assert.match(focusBridge, /requestAnimationFrame[\s\S]*requestAnimationFrame/)
  assert.match(focusBridge, /target\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest' \}\)/)
  assert.match(focusBridge, /removeEventListener\('focusin', onFocusIn, true\)/)
  assert.match(focusCss, /@media \(max-width: 420px\)/)
  assert.match(focusCss, /max-width: min\(104px, calc\(100vw - 286px\)\)/)
  assert.match(focusCss, /\.ground-go-now[\s\S]*max-width: 72px/)
  assert.doesNotMatch(focusCss, /display:\s*none|overflow:\s*hidden/)
})

test('accessibility evidence is bound to the current Home and Life Map owners', () => {
  assert.match(embodiedEvidence, /urai-asset-home-world\[data-home-primary-owner=/)
  assert.match(embodiedEvidence, /Direct Home destinations/)
  for (const name of ['Open Orb directly', 'Open Ground directly', 'Open Life Map directly']) assert.ok(embodiedEvidence.includes(name), `current direct destination missing: ${name}`)
  assert.match(embodiedEvidence, /direct\.getByRole\('button'\)\)\.toHaveCount\(3\)/)
  assert.match(embodiedEvidence, /await waitForHomeWorld\(home\)/)
  assert.match(embodiedEvidence, /Math\.abs\(afterZ - beforeZ\)\)\.toBeGreaterThan\(1\.2\)/)
  const canonicalHomeOwnerBindings = embodiedEvidence.match(/page\.locator\(homeOwnerSelector\)\.first\(\)/g)?.length ?? 0
  assert.equal(canonicalHomeOwnerBindings, 4, 'all embodied Home movement evidence must bind to the canonical asset-driven owner')
  assert.equal(embodiedEvidence.includes("page.locator('.urai-final-home-world')"), false, 'legacy Home wrapper binding returned')
  assert.match(lifeMapEvidence, /urai-true-3d-life-map/)
  assert.match(visualEvidence, /details\.life-map-help/)
  for (const obsolete of [
    '.urai-home-embodied-shell',
    '.life-map-independent-realm',
    '.life-map-memory-portals',
    'details.life-map-accessibility-menu',
  ]) assert.equal(accessibilityEvidence.includes(obsolete), false, `obsolete selector returned: ${obsolete}`)
  assert.equal(embodiedEvidence.includes("getByRole('link', { name: /Privacy Sanctuary"), false)
})
