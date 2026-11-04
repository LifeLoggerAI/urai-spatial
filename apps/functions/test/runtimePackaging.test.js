import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stageRuntimeMjs } from '../scripts/stage-runtime-mjs.mjs'

function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), 'urai-r551-stage-'))
  const source = join(root, 'src')
  const output = join(root, 'out')
  mkdirSync(source)
  try { fn({ root, source, output }) } finally { rmSync(root, { recursive: true, force: true }) }
}

test('Functions build stages every source .mjs helper byte-for-byte with SHA receipts', () => fixture(({ source, output }) => {
  const nested = join(source, 'nested')
  mkdirSync(nested)
  const code = "export const voiceAuthority = Object.freeze({ ready: false })\n"
  writeFileSync(join(nested, 'authority.mjs'), code)
  const receipts = stageRuntimeMjs(source, output)
  assert.equal(receipts.length, 1)
  assert.equal(receipts[0].path, 'nested/authority.mjs')
  assert.equal(receipts[0].sha256, createHash('sha256').update(code).digest('hex'))
  assert.equal(readFileSync(join(output, 'nested', 'authority.mjs'), 'utf8'), code)
  assert.deepEqual(stageRuntimeMjs(source, output), receipts)
}))

test('compiled CJS runtime cannot silently require a missing original ESM module', () => fixture(({ source, output }) => {
  writeFileSync(join(source, 'safe.mjs'), 'export const safe = true\n')
  mkdirSync(output)
  writeFileSync(join(output, 'index.js'), 'const x = require("./missing.mjs")\n')
  assert.throws(() => stageRuntimeMjs(source, output), /compiled_runtime_mjs_import_missing/)
}))

test('build refuses symlinked runtime source inputs and empty ESM staging', () => fixture(({ root, source, output }) => {
  assert.throws(() => stageRuntimeMjs(source, output), /runtime_mjs_source_missing/)
  writeFileSync(join(root, 'outside.mjs'), 'export const outside = true\n')
  symlinkSync(join(root, 'outside.mjs'), join(source, 'escape.mjs'))
  assert.throws(() => stageRuntimeMjs(source, output), /runtime_stage_symlink_refused/)
}))
