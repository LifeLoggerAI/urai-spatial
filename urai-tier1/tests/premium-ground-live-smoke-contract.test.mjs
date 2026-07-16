import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const tier1Root = path.resolve(testDir, '..')
const repoRoot = path.resolve(tier1Root, '..')
const read = (root, file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n')
const verifier = read(repoRoot, 'scripts/urai-post-deploy-smoke.mjs')
const ground = read(tier1Root, 'src/app/GroundSpatialWorldClean.tsx')

test('premium Ground source exposes the stable private-workforce identity', () => {
  for (const marker of [
    'urai-ground-private-workforce-world',
    'Your private workforce.',
    'Six chambers active · private by default',
    'Reception · Sanctuary · Council · Logistics · Wellness · Archive',
  ]) {
    assert.ok(ground.includes(marker), `missing premium Ground marker: ${marker}`)
  }
})

test('live smoke binds premium Ground and rejects the obsolete city-world marker', () => {
  const expected = "['/ground', ['walkable-first-person-ground-layer', 'urai-ground-private-workforce-world', 'Your private workforce.', 'Six chambers active · private by default'], ['Street-level city world']]"
  assert.ok(verifier.includes(expected), 'live smoke must bind the premium six-chamber Ground owner')
  assert.ok(!verifier.includes("['/ground', ['walkable-first-person-ground-layer', 'Street-level city world'], []]"), 'obsolete Ground signature must not remain accepted')
})
