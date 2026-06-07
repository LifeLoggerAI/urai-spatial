#!/usr/bin/env node
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const requiredMajor = 22
const major = Number(process.versions.node.split('.')[0])
const deployUrl = process.env.URAI_DEPLOY_URL || 'https://urai-4dc1d.web.app'
const projectId = process.env.FIREBASE_PROJECT_ID || 'urai-4dc1d'
const minInstallFreeMb = process.env.URAI_MIN_INSTALL_FREE_MB || '128'

function run(command, args, options = {}) {
  console.log(`\n[URAI Spatial Studio Release] $ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      FIREBASE_PROJECT_ID: projectId,
      URAI_DEPLOY_URL: deployUrl,
      URAI_MIN_INSTALL_FREE_MB: minInstallFreeMb,
      ...(options.env || {}),
    },
  })
  if (result.status !== 0) process.exit(result.status || 1)
}

function removePath(path) {
  if (!fs.existsSync(path)) return
  console.log(`[URAI Spatial Studio Release] removing ${path}`)
  fs.rmSync(path, { recursive: true, force: true })
}

if (Number.isNaN(major) || major < requiredMajor) {
  console.error(`[URAI Spatial Studio Release] Node ${requiredMajor}+ is required. Current: ${process.version}`)
  console.error('Run this from Firebase Studio/Nix with:')
  console.error("nix shell nixpkgs#nodejs_22 nixpkgs#pnpm nixpkgs#firebase-tools --command bash -lc 'cd /home/user/urai-spatial && pnpm studio:deploy:static'")
  process.exit(1)
}

console.log(`[URAI Spatial Studio Release] Node ${process.version}`)
console.log(`[URAI Spatial Studio Release] Firebase project: ${projectId}`)
console.log(`[URAI Spatial Studio Release] Live smoke URL: ${deployUrl}`)

for (const path of [
  'node_modules',
  'urai-tier1/node_modules',
  'apps/functions/node_modules',
  'packages/tier-locks/node_modules',
  'packages/release-tools/node_modules',
  'urai-tier1/.next',
  'urai-tier1/out',
  'firebase-hosting-static',
  'apps/functions/lib',
]) {
  removePath(path)
}

run('pnpm', ['store', 'prune'])
run('pnpm', ['install', '--frozen-lockfile'])
run('pnpm', ['lock:static'])
run('pnpm', ['lock:build'])
run('pnpm', ['xr:verify'])
run('pnpm', ['build:static'])
run('pnpm', ['deploy:xr:firebase:static'])
run('pnpm', ['smoke:live'])

console.log('\n[URAI Spatial Studio Release] Static Firebase release deployed and live smoke passed.')
