import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const brand = readFileSync(new URL('../src/lib/brand-authority.ts', import.meta.url), 'utf8')

test('URAI Labs identity is explicit', () => {
  assert.ok(brand.includes('URAI Labs'))
  assert.ok(brand.includes('Adam Clamp'))
})
