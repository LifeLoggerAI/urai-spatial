import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

test('static export contract inputs exist', () => {
  assert.equal(existsSync('../firebase.static.json'), true)
  assert.equal(existsSync('src/app/layout.tsx'), true)
})
