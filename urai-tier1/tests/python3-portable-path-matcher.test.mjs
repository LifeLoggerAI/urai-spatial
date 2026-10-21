import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolvePython3 } from '../../scripts/python3-runtime.mjs'

function temporaryPythonHomes(run) {
  const home = mkdtempSync(path.join(os.tmpdir(), 'urai-python3-portable-path-'))
  const parent = path.join(home, 'Downloads', 'UrAi-Python3')
  const candidate = folder => {
    const executable = path.join(parent, folder, 'python.exe')
    mkdirSync(path.dirname(executable), { recursive: true })
    writeFileSync(executable, '')
    return executable
  }
  try { return run({ home, candidate }) }
  finally { rmSync(home, { recursive: true, force: true }) }
}

const unavailable = { status: 9009, stderr: 'Windows Store alias is not a Python interpreter' }
const verified = { status: 0, stdout: 'URAI_PYTHON3_OK\n', stderr: '' }

test('Windows portable 3.13.16 is recognized after real Python probe when launch aliases fail', () =>
  temporaryPythonHomes(({ home, candidate }) => {
    const good = candidate('python-3.13.16-embeddable-amd64')
    const seen = []
    const result = resolvePython3({ platform: 'win32', env: { USERPROFILE: home }, probe: (command, args, options) => {
      seen.push(command)
      assert.equal(options.shell, false)
      assert.ok(args.includes('-c') && args.some(arg => arg.includes('zipfile') && arg.includes('plistlib')))
      return command === good ? verified : unavailable
    } })
    assert.deepEqual(result, { command: good, prefix: [] })
    assert.deepEqual(seen, ['py', 'python3', 'python', good])
  }))

test('malformed portable directory cannot impersonate dotted Python version', () =>
  temporaryPythonHomes(({ home, candidate }) => {
    const bad = candidate('python-3x13x16-embeddable-amd64')
    const seen = []
    assert.throws(() => resolvePython3({ platform: 'win32', env: { USERPROFILE: home }, probe: command => {
      seen.push(command)
      return command === bad ? verified : unavailable
    } }), /URAI_PYTHON3_UNAVAILABLE/)
    assert.deepEqual(seen, ['py', 'python3', 'python'])
  }))

test('a directory without Python executable is never treated as a valid candidate', () =>
  temporaryPythonHomes(({ home }) => {
    mkdirSync(path.join(home, 'Downloads', 'UrAi-Python3', 'python-3.13.16-embeddable-amd64'), { recursive: true })
    const seen = []
    assert.throws(() => resolvePython3({ platform: 'win32', env: { USERPROFILE: home }, probe: command => {
      seen.push(command)
      return unavailable
    } }), /URAI_PYTHON3_UNAVAILABLE/)
    assert.deepEqual(seen, ['py', 'python3', 'python'])
  }))
