import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../../', import.meta.url))
const run = args => spawnSync(process.execPath, ['scripts/validate-life-model-release-receipt.mjs', ...args], {
  cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_SHA: 'a'.repeat(40) },
})

test('strict default invocation reaches certification checks and rejects the pending real receipt', () => {
  const result = run(['--strict'])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /strict launch certification requires certified=true/)
  assert.match(result.stderr, /receipt candidate SHA does not match/)
  assert.doesNotMatch(result.stderr, /ENOENT/)
})

test('contract-only invocation validates structure without inventing certification', () => {
  const result = run([])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /LIFE_MODEL_RELEASE_RECEIPT_CONTRACT/)
  assert.doesNotMatch(result.stdout, /LIFE_MODEL_RELEASE_CERTIFIED/)
})

test('strict accepts explicit receipt paths before or after its flag and still enforces the SHA', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-life-receipt-cli-'))
  try {
    const receipt = JSON.parse(fs.readFileSync(path.join(root, 'operations/life-model/release-receipt-v1.json'), 'utf8'))
    receipt.candidateSha = 'b'.repeat(40)
    const file = path.join(directory, 'receipt.json')
    fs.writeFileSync(file, JSON.stringify(receipt))
    for (const args of [[file, '--strict'], ['--strict', file]]) {
      const result = run(args)
      assert.equal(result.status, 1)
      assert.match(result.stderr, /receipt candidate SHA does not match/)
      assert.match(result.stderr, /gate deployment is NOT_DEPLOYED/)
      assert.doesNotMatch(result.stderr, /ENOENT/)
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }) }
})

test('unknown flags and ambiguous receipt paths fail closed', () => {
  for (const args of [['--certify'], ['one.json', 'two.json']]) {
    const result = run(args)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Usage:/)
    assert.doesNotMatch(result.stdout, /CERTIFIED/)
  }
})
