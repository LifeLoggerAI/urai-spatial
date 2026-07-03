import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/mirror/page.tsx'), 'utf8')

test('Mirror uses the promoted world, glyph, orb, and guide assets', () => {
  assert.match(source, /mirrorAssets\.primary\.src/)
  assert.match(source, /mirrorAssets\.accents\.pattern\.src/)
  assert.match(source, /avatarAssets\.mirror\.src/)
  assert.match(source, /uiAssets\.orbActive\.src/)
  assert.match(source, /data-mirror-guide-art="provider-final"/)
})

test('Mirror remains a private non-judgmental realm with consent routes', () => {
  assert.match(source, /Mirror does not judge\./)
  assert.match(source, /does not diagnose,\s*rank, or judge/s)
  assert.match(source, /Review consent and ownership/)
  assert.match(source, /href="\/passport"/)
  assert.match(source, /href="\/focus\?memoryId=quiet-reset"/)
  assert.match(source, /replay-recovery-thread/)
})

test('Mirror is mobile-safe and reduced-motion safe', () => {
  assert.match(source, /mirrorAssets\.mobile\.src/)
  assert.match(source, /@media \(max-width: 760px\)/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(source, /aria-label="Orb reflection companion present in Mirror"/)
  assert.match(source, /aria-label="Mirror Guide private workforce presence"/)
})
