import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../scripts/urai-release-control-smoke.mjs', import.meta.url), 'utf8')

test('strict release smoke targets an exact visible hydrated route instance', () => {
  assert.match(source, /const visibleSelector = `\$\{check\.selector\}:visible`/)
  assert.match(source, /await page\.waitForFunction\(/)
  assert.match(source, /const visible = style\.display !== 'none'/)
  assert.match(source, /const surface = page\.locator\(visibleSelector\)\.first\(\)/)
  assert.doesNotMatch(source, /surface\.waitFor\(\{ state: 'visible'/)
  assert.doesNotMatch(source, /const surface = page\.locator\(check\.selector\)/)
})

test('visible instance identity remains fully fail-closed', () => {
  for (const field of ['memoryId', 'manifestId', 'node']) {
    assert.match(source, new RegExp(`${field}: await surface\\.getAttribute`))
  }
  assert.match(source, /throw new Error\(`\$\{check\.name\} hydrated identity failed/)
  assert.match(source, /selector: visibleSelector/)
})
