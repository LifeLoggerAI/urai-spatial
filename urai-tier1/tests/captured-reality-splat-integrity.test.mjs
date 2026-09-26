import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { inspectSplat } from '../../scripts/inspect-captured-reality-splat.mjs'

const cli = fileURLToPath(new URL('../../scripts/inspect-captured-reality-splat.mjs', import.meta.url))
function fixture(t, mutate = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-splat-integrity-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const record = Buffer.alloc(32)
  for (let axis = 0; axis < 3; axis++) { record.writeFloatLE(axis + 1, axis * 4); record.writeFloatLE(.02, 12 + axis * 4) }
  record.set([210, 180, 140, 255, 255, 128, 128, 128], 24)
  mutate(record)
  const file = path.join(dir, 'synthetic-unit-fixture.splat')
  fs.writeFileSync(file, record)
  return { file, dir, record }
}
const budgets = { maxBytes: 1024, maxPoints: 32 }

test('valid binary returns exact identity and bounds without claiming reconstruction or acceptance', t => {
  const { file, record } = fixture(t)
  const result = inspectSplat(file, budgets)
  assert.equal(result.pointCount, 1)
  assert.equal(result.sha256, crypto.createHash('sha256').update(record).digest('hex'))
  assert.deepEqual(result.centerBounds, { minimum: [1, 2, 3], maximum: [1, 2, 3] })
  for (const key of ['sourceAuthenticityVerified', 'visualAcceptanceEstablished', 'devicePerformanceCertified', 'launchReady']) assert.equal(result[key], false)
})

for (const [name, mutate, error] of [
  ['NaN position', b => b.writeFloatLE(NaN, 0), /position/],
  ['infinite position', b => b.writeFloatLE(Infinity, 4), /position/],
  ['zero scale', b => b.writeFloatLE(0, 12), /scale/],
  ['negative scale', b => b.writeFloatLE(-1, 16), /scale/],
  ['GPU covariance overflow', b => b.writeFloatLE(1e30, 20), /scale/],
  ['GPU covariance underflow', b => b.writeFloatLE(1e-30, 20), /scale/],
  ['zero quaternion', b => b.fill(128, 28, 32), /quaternion/],
  ['unnormalized quaternion', b => b.fill(255, 28, 32), /quaternion/],
  ['invisible scene', b => { b[27] = 0 }, /nontransparent/],
]) test(`rejects ${name}`, t => { const { file } = fixture(t, mutate); assert.throws(() => inspectSplat(file, budgets), error) })

test('rejects missing bytes and explicit device-budget violations', t => {
  const { file } = fixture(t)
  assert.throws(() => inspectSplat(file, { ...budgets, maxBytes: 31 }), /budget/)
  assert.throws(() => inspectSplat(file, { ...budgets, maxPoints: NaN }), /positive safe integer/)
  fs.appendFileSync(file, Buffer.from([1]))
  assert.throws(() => inspectSplat(file, budgets), /32-byte/)
  fs.writeFileSync(file, '')
  assert.throws(() => inspectSplat(file, budgets), /nonempty/)
})

test('CLI never replaces source or a previous receipt and reports corrupt input as failure', t => {
  const { file, dir, record } = fixture(t)
  const out = path.join(dir, 'technical-receipt.json')
  const run = target => spawnSync(process.execPath, [cli, file, '1024', '32', target], { encoding: 'utf8' })
  assert.notEqual(run(file).status, 0)
  assert.deepEqual(fs.readFileSync(file), record)
  assert.equal(run(out).status, 0)
  const originalReceipt = fs.readFileSync(out)
  assert.notEqual(run(out).status, 0)
  assert.deepEqual(fs.readFileSync(out), originalReceipt)
  fs.writeFileSync(file, Buffer.alloc(32))
  assert.notEqual(run(path.join(dir, 'invalid.json')).status, 0)
  assert.equal(fs.existsSync(path.join(dir, 'invalid.json')), false)
})
