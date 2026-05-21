#!/usr/bin/env node
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')

const child = spawn('pnpm', ['release:p1'], {
  stdio: 'inherit',
  shell: false,
  cwd: repoRoot,
  env: process.env,
})

child.on('error', (error) => {
  console.error('[URAI Spatial release:p1] Could not start root pnpm release:p1:', error.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[URAI Spatial release:p1] Exited with signal ${signal}`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})
