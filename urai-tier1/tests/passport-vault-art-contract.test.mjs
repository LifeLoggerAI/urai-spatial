import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/FinalPassportVault.tsx'), 'utf8')

test('Passport uses the promoted vault, mobile crop, and ownership seal assets', () => {
  assert.match(source, /passportAssets\.primary\.src/)
  assert.match(source, /passportAssets\.mobile\.src/)
  assert.match(source, /passportAssets\.accents\.ownershipSeal\.src/)
  assert.match(source, /data-ownership-seal-art="provider-final"/)
})

test('Passport keeps ownership, consent, provenance, and portability visible', () => {
  for (const token of ['Owner key', 'Permission chamber', 'Source archive', 'Exit controls']) {
    assert.match(source, new RegExp(token))
  }
  assert.match(source, /Private by default · owned by you/)
  assert.match(source, /Review permissions/)
  assert.match(source, /href="\/privacy-controls#export"/)
  assert.match(source, /href="\/privacy-controls#delete"/)
})

test('Passport remains mobile-safe and reduced-motion safe', () => {
  assert.match(source, /@media \(max-width: 760px\)/)
  assert.match(source, /var\(--passport-mobile\)/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(source, /aria-label="URAI Passport private ownership vault"/)
  assert.match(source, /aria-label="Private identity vault chamber"/)
})
