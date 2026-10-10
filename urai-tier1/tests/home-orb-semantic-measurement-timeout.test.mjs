import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')

test('Portal and Orb proof gives visible navigation measurement one explicit bounded budget', () => {
  assert.match(source, /const SEMANTIC_NAVIGATION_MEASUREMENT_TIMEOUT_MS = 90_000/)
  assert.match(source, /semanticNav\.waitFor\(\{ state: 'visible', timeout: SEMANTIC_NAVIGATION_MEASUREMENT_TIMEOUT_MS \}\)/)
  assert.match(source, /semanticNav\.evaluate\(\s*inspectVisibleHomeNavigation,\s*undefined,\s*\{ timeout: SEMANTIC_NAVIGATION_MEASUREMENT_TIMEOUT_MS \},?\s*\)/)
})

test('bounded measurement retains the exact semantic and visual acceptance fences', () => {
  assert.match(source, /inspectVisibleHomeNavigation/)
  assert.match(source, /record\.semanticVisibleActions === 3/)
  assert.match(source, /record\.semanticOwner === 'runtime-boundary'/)
  assert.match(source, /record\.semanticNonDominant === 'true'/)
  assert.match(source, /Number\.isFinite\(record\.semanticOpacity\) && record\.semanticOpacity >= \.99/)
  assert.match(source, /record\.semanticVisual\?\.passed === true/)

  const measurement = source.indexOf('record.semanticVisual = await semanticNav.evaluate(')
  const failure = source.indexOf('  } catch (error) {', measurement)
  const failureEnd = source.indexOf('\n  diagnosticProbe.stop()', failure)
  assert.ok(measurement >= 0 && failure > measurement && failureEnd > failure)
  const failureBody = source.slice(failure, failureEnd)
  assert.match(failureBody, /record\.error = String\(error\)/)
  assert.doesNotMatch(failureBody, /record\.passed\s*=\s*true/)
})
