import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolvePython3 } from '../scripts/python3-runtime.mjs'

const pass = { status: 0, stdout: 'URAI_PYTHON3_OK\n' }
const unusable = { status: 9009, stdout: 'Python was not found; run without arguments to install from the Microsoft Store' }

test('Windows python launcher py -3 is verified first and uses a shell-free 7s probe', () => {
  const calls = []
  const result = resolvePython3({ platform: 'win32', env: { PATH: 'fixture' }, probe(executable, args, options) {
    calls.push({ executable, args, options })
    return pass
  } })
  assert.deepEqual(result, { command: 'py', prefix: ['-3'] })
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].args.slice(0, 2), ['-3', '-c'])
  assert.match(calls[0].args[2], /sys\.version_info >= \(3, 10\)/)
  assert.match(calls[0].args[2], /zipfile, plistlib/)
  assert.equal(calls[0].options.shell, false)
  assert.equal(calls[0].options.timeout, 7000)
  assert.equal(calls[0].options.env.PYTHONNOUSERSITE, '1')
  assert.equal(calls[0].options.env.PYTHONDONTWRITEBYTECODE, '1')
})

test('Windows Store alias code 9009 never passes as real Python; verified fallback may pass', () => {
  const calls = []
  const result = resolvePython3({ platform: 'win32', env: {}, probe(executable, args) {
    calls.push(executable)
    if (executable === 'py') return { error: { code: 'ENOENT' }, status: null }
    if (executable === 'python3') return unusable
    return pass
  } })
  assert.deepEqual(calls, ['py', 'python3', 'python'])
  assert.deepEqual(result, { command: 'python', prefix: [] })
})

test('Windows refuses a Store alias when all Python commands are unusable', () => {
  assert.throws(() => resolvePython3({ platform: 'win32', env: {}, probe: () => unusable }), /URAI_PYTHON3_UNAVAILABLE/)
})

test('missing or spoofed module fingerprint cannot certify a Python executable', () => {
  for (const response of [
    { status: 0, stdout: 'Python 3.12' },
    { status: 0, stdout: 'URAI_PYTHON3_OK\nFAKE' },
    { status: 1, stdout: 'URAI_PYTHON3_OK' },
    { status: null, error: { code: 'EACCES' }, stdout: 'URAI_PYTHON3_OK' },
  ]) {
    assert.throws(() => resolvePython3({ platform: 'linux', env: {}, probe: () => response }), /URAI_PYTHON3_UNAVAILABLE/)
  }
})

test('invalid absolute override refuses before probing alternative commands', () => {
  let called = false
  assert.throws(() => resolvePython3({ platform: 'win32', env: { URAI_PYTHON3_EXE: 'python.exe' }, probe() { called = true; return pass } }), /URAI_PYTHON3_OVERRIDE_INVALID/)
  assert.equal(called, false)
})

test('explicit interpreter failure never downgrades to an ambient Python executable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-python3-specific-'))
  try {
    const name = path.join(dir, 'python.exe')
    fs.writeFileSync(name, '')
    const calls = []
    assert.throws(() => resolvePython3({ platform: 'win32', env: { URAI_PYTHON3_EXE: name }, probe(exe) { calls.push(exe); return unusable } }), /URAI_PYTHON3_UNAVAILABLE/)
    assert.deepEqual(calls, [name])
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})
