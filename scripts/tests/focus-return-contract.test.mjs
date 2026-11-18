import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { auditFocusReturnContract } from '../check-focus-return-contract.mjs'

const source = readFileSync(new URL('../../urai-tier1/src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')

test('Focus Escape returns to Life Map with memory context', () => {
  assert.deepEqual(auditFocusReturnContract(source), [])
})

for (const [name, from, to] of [
  ['missing travel dispatch', 'requestUraiWorldTravel({\n      destination: \'life-map\'', 'requestUraiWorldReturn({\n      destination: \'life-map\''],
  ['wrong return destination', "destination: 'life-map'", "destination: 'replay'"],
  ['wrong entry portal', "entryPortal: 'focus-life-map-return'", "entryPortal: 'unverified-return'"],
  ['missing return checkpoint', "cameraCheckpoint: 'life-map-overview'", "cameraCheckpoint: 'unknown'"],
  ['lost memory identity', "query.set('memoryId', memory.demo ? memory.star.id : memory.id)", "query.set('memoryId', 'demo')"],
  ['lost manifest identity', "query.set('manifestId', memory.replayManifest.id)", "query.set('manifestId', 'demo')"],
  ['missing Escape listener', "window.addEventListener('keydown', onEscape)", "window.addEventListener('pointerdown', onEscape)"],
  ['Escape handler does not navigate', '      unwind()\n', '      // no navigation\n'],
]) {
  test('fail closed: ' + name, () => {
    const mutated = source.replace(from, to)
    assert.notEqual(mutated, source, 'source mutation must match')
    assert.notDeepEqual(auditFocusReturnContract(mutated), [])
  })
}
