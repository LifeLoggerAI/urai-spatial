import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'

const probeProgram = 'import sys, zipfile, plistlib, json; assert sys.version_info >= (3, 10); print("URAI_PYTHON3_OK")'

function windowsPortableCandidates(env) {
  const home = env.USERPROFILE || os.homedir()
  const parent = path.join(home, 'Downloads', 'UrAi-Python3')
  try {
    return fs.readdirSync(parent, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && /^python-3\.[0-9]+\.[0-9]+-embeddable-amd64$/i.test(entry.name))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, 8)
      .map(entry => path.join(parent, entry.name, 'python.exe'))
      .filter(candidate => { try { return fs.statSync(candidate).isFile() } catch { return false } })
      .map(command => ({ command, prefix: [] }))
  } catch { return [] }
}

// A Windows Store execution alias may exist and still fail with code 9009.
// Require a real Python 3 interpreter with ZIP and plist support, never a
// successful shell command or a guessed executable name.
export function resolvePython3({ env = process.env, platform = process.platform, probe = spawnSync } = {}) {
  const explicit = env.URAI_PYTHON3_EXE?.trim()
  if (explicit) {
    let validFile = false
    try { validFile = path.isAbsolute(explicit) && fs.statSync(explicit).isFile() } catch {}
    if (!validFile) throw new Error('URAI_PYTHON3_OVERRIDE_INVALID: URAI_PYTHON3_EXE must identify an existing absolute executable file')
  }
  const candidates = explicit
    ? [{ command: explicit, prefix: [] }]
    : platform === 'win32'
      ? [{ command: 'py', prefix: ['-3'] }, { command: 'python3', prefix: [] }, { command: 'python', prefix: [] }, ...windowsPortableCandidates(env)]
      : [{ command: 'python3', prefix: [] }, { command: 'python', prefix: [] }]
  for (const candidate of candidates) {
    try {
      const result = probe(candidate.command, [...candidate.prefix, '-c', probeProgram], {
        encoding: 'utf8', shell: false, windowsHide: true, timeout: 7000,
        env: { ...env, PYTHONNOUSERSITE: '1', PYTHONDONTWRITEBYTECODE: '1' },
      })
      if (!result.error && result.status === 0 && result.stdout?.trim() === 'URAI_PYTHON3_OK') return candidate
    } catch { /* Refuse unusable runtimes and check the next candidate. */ }
  }
  throw new Error('URAI_PYTHON3_UNAVAILABLE: Install Python 3.10+ with zipfile/plistlib or set URAI_PYTHON3_EXE to an absolute python.exe path')
}

let verifiedRuntime
export function runPython3(args, options = {}) {
  verifiedRuntime ??= resolvePython3()
  return spawnSync(verifiedRuntime.command, [...verifiedRuntime.prefix, ...args], {
    ...options, shell: false, windowsHide: true,
  })
}
