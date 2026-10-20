import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import process from 'node:process'

const root = process.cwd()
const args = process.argv.slice(2)

function isExecutableFile(candidate) {
  if (!candidate) {
    return false
  }

  try {
    const stat = fs.statSync(candidate)
    return stat.isFile()
  } catch {
    return false
  }
}

function candidatePnpmEntrypoints() {
  const candidates = []
  const npmExecPath = process.env.npm_execpath

  if (npmExecPath && /pnpm/i.test(npmExecPath) && isExecutableFile(npmExecPath)) {
    candidates.push(npmExecPath)
  }

  candidates.push(path.join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))
  candidates.push(path.join(root, 'node_modules', '.pnpm', 'pnpm@10.0.0', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'))

  // Portable Node 22 Windows distributions bundle Corepack as JavaScript.
  // Windows cannot spawn the corepack.cmd shim with shell:false; invoke its
  // pnpm entrypoint through this exact Node executable instead. Corepack
  // still honors the repository's pinned packageManager (pnpm@10.0.0).
  candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'corepack', 'dist', 'pnpm.js'))

  return candidates.filter(isExecutableFile)
}

function resolvePnpm() {
  for (const entrypoint of candidatePnpmEntrypoints()) {
    return { command: process.execPath, argsPrefix: [entrypoint], displayCommand: 'pnpm' }
  }

  return { command: 'corepack', argsPrefix: ['pnpm'], displayCommand: 'corepack pnpm' }
}

const pnpm = resolvePnpm()
console.log(`[URAI Spatial workspace] $ ${pnpm.displayCommand} ${args.join(' ')}`)

// pnpm's executable shims resolve `node` from PATH for Next/tsc and other
// grandchildren. Calling this wrapper with portable Node 22 must not silently
// hand those commands to an unrelated ambient Node installation.
const childEnv = { ...process.env }
const pathKey = Object.keys(childEnv).find(key => key.toLowerCase() === 'path') || 'PATH'
childEnv[pathKey] = path.dirname(process.execPath) + path.delimiter + (childEnv[pathKey] || '')

const child = spawn(pnpm.command, [...pnpm.argsPrefix, ...args], {
  stdio: 'inherit',
  shell: false,
  cwd: root,
  env: childEnv,
})

child.on('error', (error) => {
  console.error(`[URAI Spatial workspace] Could not run pnpm: ${error.message}`)
  console.error('[URAI Spatial workspace] Run through Corepack or make pnpm@10.0.0 available in this checkout.')
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[URAI Spatial workspace] pnpm terminated with signal ${signal}`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})
