#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8' })
}

function log(message) {
  console.log(`[URAI Doctor] ${message}`)
}

function warn(message) {
  console.warn(`[URAI Doctor] ${message}`)
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10)
if (nodeMajor < 22) {
  warn(`Node ${process.versions.node} detected. URAI Spatial requires Node >=22.`)
  warn('Run one of: nvm install 22 && nvm use 22 OR nix shell nixpkgs#nodejs_22 nixpkgs#pnpm nixpkgs#firebase-tools')
} else {
  log(`Node ${process.versions.node} OK.`)
}

const pkgPath = 'package.json'
if (!existsSync(pkgPath)) {
  warn('package.json not found. Run this from the urai-spatial repo root.')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const scripts = pkg.scripts ?? {}
if (!scripts['urai:guardian']) {
  warn('pnpm urai:guardian is missing. Your checkout is stale or not on the newest origin/main.')
  warn('Recommended sync: git fetch origin main && git branch backup-local-before-reset && git reset --hard origin/main')
} else {
  log('pnpm urai:guardian script exists.')
}

const branch = run('git', ['branch', '--show-current'])
if (branch.status === 0) log(`Git branch: ${branch.stdout.trim()}`)

const status = run('git', ['status', '--short'])
if (status.status === 0 && status.stdout.trim()) {
  warn('Working tree has local changes. Review before hard reset:')
  console.log(status.stdout.trim())
}

const upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])
if (upstream.status === 0) {
  const counts = run('git', ['rev-list', '--left-right', '--count', `${upstream.stdout.trim()}...HEAD`])
  if (counts.status === 0) {
    const [behind, ahead] = counts.stdout.trim().split(/\s+/).map(Number)
    if (behind > 0 || ahead > 0) {
      warn(`Branch diverged or is not synced: behind=${behind} ahead=${ahead}.`)
      warn('To take newest repo state: git fetch origin main && git branch backup-local-before-reset && git reset --hard origin/main')
    } else {
      log('Git branch is synced with upstream.')
    }
  }
} else {
  warn('No upstream configured or unable to inspect upstream branch.')
}

const libProbe = run('bash', ['-lc', 'ldconfig -p 2>/dev/null | grep -q libexpat.so.1'])
if (libProbe.status !== 0) {
  warn('libexpat.so.1 not found in system linker cache. Playwright Chromium may fail locally.')
  warn('With sudo: sudo apt-get update && sudo apt-get install -y libexpat1 libnss3 libatk-bridge2.0-0 libgtk-3-0 libxss1 libasound2t64')
  warn('Without sudo: use GitHub Actions for full browser E2E, or run inside a Nix/dev container with browser libs.')
} else {
  log('libexpat.so.1 appears available.')
}

log('Doctor complete.')
