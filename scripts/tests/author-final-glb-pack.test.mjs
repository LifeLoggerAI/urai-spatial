import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const script = fs.readFileSync('scripts/author-final-glb-pack.mjs', 'utf8')

test('author final GLB verification uses governed production receipt for promoted assets', () => {
  assert.match(script, /production-receipts/)
  assert.match(script, /releaseState !== 'production-ready'/)
  assert.match(script, /fixedPath !== expectedPath/)
  assert.match(script, /receiptSource: 'governed-production'/)
})

test('current committed authored pack verifies without substitutes', () => {
  const result = spawnSync(process.execPath, ['scripts/author-final-glb-pack.mjs'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(result.stdout)
  assert.equal(receipt.ok, true)
  assert.deepEqual(receipt.governedProductionReceipts, ['home-entry-chamber-v1.glb'])
  assert.equal(receipt.generatedSubstitutes, 0)
})
