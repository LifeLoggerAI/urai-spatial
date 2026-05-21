#!/usr/bin/env node
import { spawn } from 'node:child_process'

const child = spawn('pnpm', ['release:p1'], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
  cwd: process.cwd(),
})

child.on('error', (error) => {
  console.error('[URAI Spatial release:p1] Could not start pnpm release:p1:', error.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`[URAI Spatial release:p1] Exited with signal ${signal}`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})
