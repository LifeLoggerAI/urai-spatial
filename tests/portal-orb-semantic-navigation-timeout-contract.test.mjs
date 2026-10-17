import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proof = await readFile(new URL('../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')
const sampling = await readFile(new URL('../scripts/home-orb-canvas-sampling.mjs', import.meta.url), 'utf8')

test('painted Home semantic navigation inspection has a finite starvation budget', () => {
  assert.match(proof, /const semanticNavigationEvaluationTimeout = 90_000/)
  assert.match(proof, /semanticNav\.evaluate\(inspectVisibleHomeNavigation, undefined, \{ timeout: semanticNavigationEvaluationTimeout \}\)/)
})

test('the bounded inspection retains semantic geometry, ownership and hit gates', () => {
  for (const marker of [
    "page.getByRole('navigation', { name: 'Accessible Home destinations' })",
    'record.semanticButtons === 1',
    'record.semanticLinks === 2',
    'record.semanticVisibleActions === 3',
    "record.semanticOwner === 'runtime-boundary'",
    "record.semanticNonDominant === 'true'",
    'record.semanticOpacity >= .99',
    'record.semanticVisual?.passed === true',
  ]) assert.ok(proof.includes(marker), `missing retained semantic acceptance gate: ${marker}`)

  for (const marker of [
    'controls.length === 3',
    'new Set(controls.map(c => c.testId)).size === 3',
    'areaFraction > 0 && areaFraction <= .1',
    'bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight',
    'c.recognized && c.label && c.visible && c.enabled && c.inViewport && c.hitConfirmed && c.width >= 48 && c.height >= 48',
    'document.elementFromPoint',
  ]) assert.ok(sampling.includes(marker), `missing retained semantic geometry/hit gate: ${marker}`)
})
