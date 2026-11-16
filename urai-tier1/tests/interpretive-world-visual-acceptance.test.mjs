import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const validator = new URL('../../scripts/validate-interpretive-world-visual-acceptance.mjs', import.meta.url)
const currentReceipt = new URL('../../operations/captured-reality/worlds/URAI-IW-001-QUIET-RESET/visual-acceptance.current.json', import.meta.url)

function run(receipt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-iw-visual-'))
  const file = path.join(dir, 'receipt.json')
  fs.writeFileSync(file, JSON.stringify(receipt))
  const result = spawnSync(process.execPath, [validator.pathname, file], { encoding: 'utf8' })
  fs.rmSync(dir, { recursive: true, force: true })
  return result
}

test('checked-in visual receipt retains the inspected motion rejection without granting acceptance', () => {
  const result = spawnSync(process.execPath, [validator.pathname, currentReceipt.pathname], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /REJECTED/)
  const receipt = JSON.parse(fs.readFileSync(currentReceipt, 'utf8'))
  assert.equal(receipt.review.overallAccepted, false)
  assert.equal(receipt.review.geometryConsistencyAccepted, false)
  assert.equal(receipt.items.filter(item => item.status === 'accepted').length, 0)
  assert.equal(receipt.items.find(item => item.id === 'S06_CCW_ARC').status, 'rejected')
  assert.match(receipt.items.find(item => item.id === 'S06_CCW_ARC').notes, /duplicated suns/)
})

test('visual acceptance requires every generated item to be accepted by a named reviewer', () => {
  const source = JSON.parse(fs.readFileSync(currentReceipt, 'utf8'))
  source.classification = 'ACCEPTED'
  source.review = {
    overallAccepted: true,
    geometryConsistencyAccepted: true,
    reviewer: 'independent-reviewer',
    reviewedAt: '2026-09-30T00:00:00Z',
    notes: 'Geometry and temporal consistency accepted.',
  }
  source.items = source.items.map((item) => ({ ...item, status: 'accepted' }))
  source.allowedClaim = 'Visual accepted for interpretive reconstruction input.'
  const result = run(source)
  assert.equal(result.status, 0, result.stderr || result.stdout)

  source.items[4].status = 'pending'
  const bad = run(source)
  assert.notEqual(bad.status, 0)
  assert.match(bad.stderr, /all 12 items accepted/)
})

test('non-accepted visual review cannot claim visual or reconstruction acceptance', () => {
  const source = JSON.parse(fs.readFileSync(currentReceipt, 'utf8'))
  source.allowedClaim = 'Visual accepted and reconstruction accepted.'
  const result = run(source)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /overstates readiness/)
})
