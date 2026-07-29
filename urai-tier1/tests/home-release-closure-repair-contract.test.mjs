import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => fs.readFileSync(path.resolve(directory, '..', relativePath), 'utf8')

const hostRunner = read('../scripts/run-continuous-spatial-proof-v18-host-stable.mjs')
const workflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const focusBridge = read('src/app/ground/GroundFocusContainment.tsx')
const focusCss = read('src/app/ground/ground-focus-containment.css')
const groundPage = read('src/app/ground/page.tsx')
const embodiedEvidence = read('tests/accessibility-performance-embodied-exploration.spec.ts')
const lifeMapEvidence = read('tests/accessibility-performance-lifemap-independent.spec.ts')
const visualEvidence = read('tests/accessibility-performance-spatial-visual.spec.ts')
const accessibilityEvidence = `${embodiedEvidence}\n${lifeMapEvidence}\n${visualEvidence}`

test('continuous Home proof uses a bounded host clock without weakening rendered-frame evidence', () => {
  assert.match(hostRunner, /Promise\.race\(\[renderedFrame, delay\(timeout\)\]\)/)
  assert.match(hostRunner, /requestAnimationFrame\(\(\) => resolve\('rendered-frame'\)\)/)
  assert.match(hostRunner, /portalOriginal\.replaceAll\(portalFrameWait, 'await waitForMovementFrame\(page\)'\)/)
  assert.doesNotMatch(hostRunner, /setTimeout\(finish, timeoutMs\)/)
  assert.match(workflow, /node scripts\/run-continuous-spatial-proof-v18-host-stable\.mjs/)
})

test('Ground focus expansion remains fully reachable at the required 390px viewport', () => {
  assert.match(groundPage, /GroundFocusContainment/)
  assert.match(groundPage, /ground-focus-containment\.css/)
  assert.match(focusBridge, /entry \?\? target\)\.scrollIntoView/)
  assert.match(focusBridge, /requestAnimationFrame[\s\S]*requestAnimationFrame/)
  assert.match(focusBridge, /target\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest' \}\)/)
  assert.match(focusBridge, /removeEventListener\('focusin', onFocusIn, true\)/)
  assert.match(focusCss, /@media \(max-width: 420px\)/)
  assert.match(focusCss, /max-width: min\(112px, calc\(100vw - 278px\)\)/)
  assert.match(focusCss, /\.ground-go-now[\s\S]*max-width: 72px/)
  assert.doesNotMatch(focusCss, /display:\s*none|overflow:\s*hidden/)
})

test('accessibility evidence is bound to the current Home and Life Map owners', () => {
  assert.match(embodiedEvidence, /urai-asset-home-world\[data-home-primary-owner=/)
  assert.match(embodiedEvidence, /Accessible Home destinations/)
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
