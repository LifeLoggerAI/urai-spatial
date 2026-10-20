import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolvePython3 } from '../../scripts/python3-runtime.mjs'

const success = () => ({ status: 0, stdout: 'URAI_PYTHON3_OK\n', stderr: '' })

test('Windows selects the real Python launcher and verifies ZIP/plist capabilities', () => {
  const seen = []
  const actual = resolvePython3({ platform: 'win32', env: {}, probe: (command, args, options) => {
    seen.push({ command, args, options })
    return success()
  } })
  assert.deepEqual(actual, { command: 'py', prefix: ['-3'] })
  assert.equal(seen.length, 1)
  assert.deepEqual(seen[0].args.slice(0, 2), ['-3', '-c'])
  assert.match(seen[0].args[2], /zipfile, plistlib/)
  assert.match(seen[0].args[2], /sys\.version_info >= \(3, 10\)/)
  assert.equal(seen[0].options.shell, false)
  assert.equal(seen[0].options.timeout, 7000)
})

test('Windows rejects Microsoft Store alias exit 9009 before trying real fallback', () => {
  const visited = []
  const actual = resolvePython3({ platform: 'win32', env: {}, probe: command => {
    visited.push(command)
    return command === 'python' ? success() : { status: 9009, stderr: 'Python was not found' }
  } })
  assert.deepEqual(visited, ['py', 'python3', 'python'])
  assert.deepEqual(actual, { command: 'python', prefix: [] })
})

test('Required Python absence stays blocking; no skipping archive integrity tests', () => {
  assert.throws(() => resolvePython3({ platform: 'win32', env: {}, probe: () => ({ status: 9009 }) }), /URAI_PYTHON3_UNAVAILABLE/)
})

test('Reject fake interpreter success and unlaunchable executables', () => {
  assert.throws(() => resolvePython3({ platform: 'win32', env: {}, probe: () => ({ status: 0, stdout: 'fake-alias' }) }), /URAI_PYTHON3_UNAVAILABLE/)
  assert.throws(() => resolvePython3({ platform: 'win32', env: {}, probe: () => { throw new Error('ENOENT') } }), /URAI_PYTHON3_UNAVAILABLE/)
})

test('Explicit interpreter must be absolute and may not fall back to another executable', () => {
  assert.throws(() => resolvePython3({ env: { URAI_PYTHON3_EXE: 'python.exe' }, platform: 'win32' }), /URAI_PYTHON3_OVERRIDE_INVALID/)
  const visited = []
  const actual = resolvePython3({ env: { URAI_PYTHON3_EXE: process.execPath }, platform: 'win32', probe: (command, args) => {
    visited.push({command, args})
    return success()
  } })
  assert.equal(actual.command, process.execPath)
  assert.deepEqual(actual.prefix, [])
  assert.equal(visited.length, 1)
  assert.throws(() => resolvePython3({ env: { URAI_PYTHON3_EXE: process.execPath }, platform: 'win32', probe: command => {
    visited.push({command})
    return { status: 1, stderr: 'not Python' }
  } }), /URAI_PYTHON3_UNAVAILABLE/)
  assert.equal(visited.length, 2)
})

test('Real source archive and native plist checks invoke the verified Python resolver', () => {
  for (const path of ['ios-source-archive.test.mjs', 'ios-native-preparation.test.mjs']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /runPython3\(/)
    assert.doesNotMatch(source, /spawnSync\('python3'/)
  }
  const producer = readFileSync(new URL('../../scripts/prepare-ios-shell.mjs', import.meta.url), 'utf8')
  assert.match(producer, /runPython3\(/)
  assert.doesNotMatch(producer, /spawnSync\('python3'/)
  const actualArchive = readFileSync(new URL('../../scripts/prepare-ios-source-archive.py', import.meta.url), 'utf8')
  assert.match(actualArchive, /def verify_archive\(/)
  assert.match(actualArchive, /def reconstruct\(/)
  assert.match(actualArchive, /PART_HASH_MISMATCH/)
  assert.match(actualArchive, /ENTRY_UNSAFE/)
})

test('verified founder portable Windows Python is discovered after unusable Store aliases', () => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'urai-python-fallback-'))
  try {
    const directory = path.join(home, 'Downloads', 'UrAi-Python3', 'python-3.13.16-embeddable-amd64')
    mkdirSync(directory, { recursive: true })
    const executable = path.join(directory, 'python.exe')
    writeFileSync(executable, 'synthetic fixture, never executed')
    const seen = []
    const selected = resolvePython3({ platform: 'win32', env: { USERPROFILE: home }, probe: command => {
      seen.push(command)
      return command === executable ? success() : { status: 9009 }
    } })
    assert.deepEqual(seen, ['py', 'python3', 'python', executable])
    assert.deepEqual(selected, { command: executable, prefix: [] })
  } finally { rmSync(home, { recursive: true, force: true }) }
})
