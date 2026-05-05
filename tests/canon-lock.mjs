#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const run = (cmd) => execSync(cmd, { stdio: 'pipe', encoding: 'utf8' })
run('pnpm canon:check')

const target = 'docs/canon/TIER_5_CANON_STANDARDS.md'
const backup = fs.readFileSync(target, 'utf8')
fs.unlinkSync(target)
let failed = false
try { run('pnpm canon:check') } catch { failed = true }
fs.writeFileSync(target, backup)
if (!failed) {
  console.error('Expected canon check to fail when required canon file is missing.')
  process.exit(1)
}
console.log('canon lock negative test passed')
