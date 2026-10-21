import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { resolvePinnedPnpm } from './pnpm-bootstrap-resolver.mjs'

const root = process.cwd()
const args = process.argv.slice(2)

const pnpm = resolvePinnedPnpm({ root, nodeExecutable: process.execPath, env: process.env })
if (!pnpm) {
  console.error('[URAI Spatial workspace] PINNED_PNPM_BOOTSTRAP_MISSING: pnpm@10.0.0 is unavailable through a local install, Corepack JS or npm JS.')
  console.error('[URAI Spatial workspace] A portable Node 22 binary may omit Corepack. Run using npm/npx with an accessible npm-cli.js, or install the pinned package manager.')
  process.exit(1)
}
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
