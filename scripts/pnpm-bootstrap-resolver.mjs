import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const PINNED_PNPM = '10.0.0'

function isFile(candidate) {
  if (!candidate) return false
  try { return fs.statSync(candidate).isFile() } catch { return false }
}

function npmCliCandidates(nodeExecutable, env) {
  const candidates = []
  const npmExec = env.npm_execpath
  if (npmExec) {
    if (path.basename(npmExec).toLowerCase() === 'npm-cli.js') candidates.push(npmExec)
    if (path.basename(npmExec).toLowerCase() === 'npx-cli.js')
      candidates.push(path.join(path.dirname(npmExec), 'npm-cli.js'))
  }
  const nodeDir = path.dirname(nodeExecutable)
  candidates.push(path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  candidates.push(path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH'
  for (const entry of String(env[pathKey] || '').split(path.delimiter).filter(Boolean)) {
    candidates.push(path.join(entry, 'node_modules', 'npm', 'bin', 'npm-cli.js'))
    candidates.push(path.join(entry, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'))
  }
  return candidates
}

/** Execute pnpm@10.0.0 under one Node binary, including portable Windows
 * Node 22 distributions without Corepack. npm is used only to bootstrap the
 * exact pinned pnpm into the npm cache; lockfile installation stays in pnpm.
 */
export function resolvePinnedPnpm({ root = process.cwd(), nodeExecutable = process.execPath,
  env = process.env, fileExists = isFile } = {}) {
  const local = path.join(root, 'node_modules', '.pnpm', 'pnpm@' + PINNED_PNPM,
    'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
  if (fileExists(local)) return {
    command: nodeExecutable, argsPrefix: [local],
    displayCommand: 'pnpm@' + PINNED_PNPM, bootstrap: 'workspace',
  }
  const corepack = path.join(path.dirname(nodeExecutable), 'node_modules', 'corepack', 'dist', 'pnpm.js')
  if (fileExists(corepack)) return {
    command: nodeExecutable, argsPrefix: [corepack],
    displayCommand: 'corepack pnpm@' + PINNED_PNPM, bootstrap: 'corepack',
  }
  // Do not spawn npm.cmd or corepack.cmd with shell:false on Windows.
  for (const candidate of npmCliCandidates(nodeExecutable, env)) {
    if (fileExists(candidate)) return {
      command: nodeExecutable,
      argsPrefix: [candidate, 'exec', '--yes', '--package=pnpm@' + PINNED_PNPM, '--', 'pnpm'],
      displayCommand: 'npm exec pnpm@' + PINNED_PNPM, bootstrap: 'npm-cache',
    }
  }
  return null
}
