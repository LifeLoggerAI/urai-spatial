import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const assetPath = 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json'
const decisionPath = 'operations/assets/promotion-rehearsal/global-cinematic-material-pack-v1.json'
const receiptPath = 'operations/assets/generated-receipts/global-cinematic-material-pack-v1.json'
const payload = fs.readFileSync(path.join(root, assetPath))
const decision = JSON.parse(fs.readFileSync(path.join(root, decisionPath), 'utf8'))
const receipt = JSON.parse(fs.readFileSync(path.join(root, receiptPath), 'utf8'))
const verifier = path.join(root, 'scripts/verify-governed-asset-promotion.mjs')

test('schema repair binds exact bytes without transferring promotion or exact-head approval', () => {
  assert.equal(JSON.parse(payload).schemaVersion, 1)
  for (const record of [decision, receipt]) {
    assert.equal(record.bytes, payload.length)
    assert.equal(record.sha256, createHash('sha256').update(payload).digest('hex'))
  }
  assert.equal(receipt.releaseState, 'candidate-not-production-ready')
  assert.equal(decision.mode, 'rehearsal')
  for (const flag of ['promote', 'humanReviewApproved', 'visualProofVerified', 'exactHeadChecksPassed']) assert.equal(decision[flag], false)
  const result = spawnSync(process.execPath, [verifier], { cwd: root, env: { ...process.env, URAI_ASSET_PROMOTION_DECISION: decisionPath }, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stdout + result.stderr)
})

test('existing governance verifier rejects bytes changed after the repair decision', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-material-governance-'))
  try {
    for (const file of [assetPath, decisionPath, 'operations/assets/launch-critical-assets.json']) {
      fs.mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true })
      fs.copyFileSync(path.join(root, file), path.join(fixture, file))
    }
    fs.appendFileSync(path.join(fixture, assetPath), '\n')
    const result = spawnSync(process.execPath, [verifier], { cwd: fixture, env: { ...process.env, URAI_ASSET_PROMOTION_DECISION: decisionPath }, encoding: 'utf8' })
    assert.equal(result.status, 1, result.stdout + result.stderr)
    assert.match(result.stderr, /byte mismatch/)
    assert.match(result.stderr, /decision SHA-256 does not match asset bytes/)
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})
