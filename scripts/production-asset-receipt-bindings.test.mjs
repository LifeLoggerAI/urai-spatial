import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { verifyProductionAssetReceiptBindings } from './lib/production-asset-receipt-bindings.mjs'

const bytes = Buffer.from('reviewed immutable model bytes')
const fixedPath = 'urai-tier1/public/assets/urai/generated/models/home.glb'
const receiptPath = 'operations/assets/production-receipts/home.json'
const digest = createHash('sha256').update(bytes).digest('hex')

function fixture(run) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'urai-production-receipt-'))
  const write = (relative, value) => {
    const absolute = path.join(root, relative)
    mkdirSync(path.dirname(absolute), { recursive: true })
    writeFileSync(absolute, Buffer.isBuffer(value) ? value : JSON.stringify(value))
  }
  const receipt = { id: 'home', fixedPath, bytes: bytes.length, sha256: digest, releaseState: 'production-ready', deploymentAuthorized: true }
  const manifest = { assets: [{ id: 'home', fixedPath, releaseState: 'production-ready' }] }
  const decision = { mode: 'promotion', assetId: 'home', canonicalPath: fixedPath, receiptPath, bytes: bytes.length, sha256: digest }
  write(fixedPath, bytes)
  write(receiptPath, receipt)
  write('operations/assets/launch-critical-assets.json', manifest)
  write('operations/assets/promotion-decisions/home.json', decision)
  const check = () => verifyProductionAssetReceiptBindings({ root })
  try { run({ root, write, receipt, manifest, decision, check }) }
  finally { rmSync(root, { recursive: true, force: true }) }
}

const codes = report => report.errors.map(error => error.code)

test('exact committed bytes pass identity without granting a current release or visual approval', () => fixture(({ check }) => {
  const report = check()
  assert.equal(report.technicalPass, true)
  assert.equal(report.records.length, 1)
  assert.equal(report.policy.currentReleaseAccepted, false)
  assert.equal(report.policy.promotionAuthorized, false)
}))

test('a larger replacement fails both byte and hash binding without rewriting the receipt', () => fixture(({ root, write, check }) => {
  const original = readFileSync(path.join(root, receiptPath))
  write(fixedPath, Buffer.from('larger unreviewed replacement geometry bytes'))
  const report = check()
  assert.equal(report.technicalPass, false)
  assert.ok(codes(report).includes('BYTE_MISMATCH'))
  assert.ok(codes(report).includes('HASH_MISMATCH'))
  assert.deepEqual(readFileSync(path.join(root, receiptPath)), original)
}))

test('same-length binary substitution still fails SHA-256 binding', () => fixture(({ write, check }) => {
  const replaced = Buffer.from(bytes); replaced[0] ^= 1; write(fixedPath, replaced)
  assert.deepEqual(codes(check()), ['HASH_MISMATCH'])
}))

test('pending-final-review manifest cannot inherit deployment authority from a historical production receipt', () => fixture(({ write, manifest, check }) => {
  manifest.assets[0].releaseState = 'pending-final-review'
  write('operations/assets/launch-critical-assets.json', manifest)
  assert.ok(codes(check()).includes('MANIFEST_NOT_PRODUCTION_READY'))
}))

test('deleted binary, receipt or promotion decision fails closed', () => {
  for (const relative of [fixedPath, receiptPath, 'operations/assets/promotion-decisions/home.json']) fixture(({ root, check }) => {
    rmSync(path.join(root, relative))
    assert.equal(check().technicalPass, false)
  })
})

test('path traversal and a symlinked asset directory cannot claim reviewed bytes', () => {
  fixture(({ write, receipt, check }) => {
    receipt.fixedPath = '../outside.glb'; write(receiptPath, receipt)
    assert.ok(codes(check()).includes('UNSAFE_PATH'))
  })
  fixture(({ root, check }) => {
    const directory = path.dirname(path.join(root, fixedPath))
    rmSync(directory, { recursive: true })
    symlinkSync(os.tmpdir(), directory, 'dir')
    assert.ok(codes(check()).includes('SYMLINK_PATH'))
  })
})

test('mismatching promotion decision cannot authorize a matching receipt and binary', () => fixture(({ write, decision, check }) => {
  decision.sha256 = 'a'.repeat(64)
  write('operations/assets/promotion-decisions/home.json', decision)
  assert.ok(codes(check()).includes('PROMOTION_DECISION_BINDING_MISMATCH'))
}))

test('unknown path owners and malformed authority fields are rejected', () => fixture(({ write, receipt, manifest, check }) => {
  receipt.bytes = '184160'; receipt.sha256 = 'not-a-sha256'
  manifest.assets = []
  write(receiptPath, receipt); write('operations/assets/launch-critical-assets.json', manifest)
  const report = check()
  for (const code of ['MANIFEST_OWNER_MISSING', 'INVALID_BYTES', 'INVALID_SHA256']) assert.ok(codes(report).includes(code))
}))

test('removing fixedPath from a production authority claim does not bypass binding', () => fixture(({ write, receipt, check }) => {
  delete receipt.fixedPath; write(receiptPath, receipt)
  assert.ok(codes(check()).includes('FIXED_PATH_REQUIRED'))
}))

test('aggregate candidate receipts explicitly retain separate sensory and audio validation', () => fixture(({ write, check }) => {
  write('operations/assets/production-receipts/audio.json', { status: 'production-integrated-candidate', assets: [] })
  const report = check()
  assert.equal(report.technicalPass, true)
  assert.equal(report.excluded.length, 1)
}))

test('a pending manifest and unrelated aggregate receipt cannot hide a deleted production receipt', () => fixture(({ root, write, manifest, check }) => {
  manifest.assets[0].releaseState = 'pending-final-review'
  write('operations/assets/launch-critical-assets.json', manifest)
  write('operations/assets/production-receipts/audio.json', { status: 'production-integrated-candidate', assets: [] })
  rmSync(path.join(root, receiptPath))
  assert.ok(codes(check()).includes('PROMOTION_RECEIPT_BINDING_MISSING'))
}))

test('malformed canonical manifests produce a retained rejection rather than an unhandled exception', () => fixture(({ write, check }) => {
  write('operations/assets/launch-critical-assets.json', { assets: null })
  assert.ok(codes(check()).includes('MANIFEST_INVALID'))
}))

test('malformed owner rows retain a manifest rejection instead of throwing', () => {
  for (const asset of [null, {}, { id: '', fixedPath }, { id: 'home', fixedPath: '../home.glb' }]) fixture(({ write, check }) => {
    write('operations/assets/launch-critical-assets.json', { assets: [asset] })
    const report = check()
    assert.equal(report.technicalPass, false)
    assert.ok(codes(report).includes('MANIFEST_INVALID'))
  })
})

test('a canonical asset id or path must identify exactly one owner', () => {
  fixture(({ write, manifest, check }) => {
    manifest.assets.push({ ...manifest.assets[0] })
    write('operations/assets/launch-critical-assets.json', manifest)
    assert.ok(codes(check()).includes('MANIFEST_INVALID'))
  })
  fixture(({ write, manifest, check }) => {
    manifest.assets.push({ id: 'other', fixedPath, releaseState: 'pending-final-review' })
    write('operations/assets/launch-critical-assets.json', manifest)
    assert.ok(codes(check()).includes('MANIFEST_INVALID'))
  })
  fixture(({ write, manifest, check }) => {
    manifest.assets.push({ id: 'home', fixedPath: 'urai-tier1/public/assets/other.glb', releaseState: 'pending-final-review' })
    write('operations/assets/launch-critical-assets.json', manifest)
    assert.ok(codes(check()).includes('MANIFEST_INVALID'))
  })
})
