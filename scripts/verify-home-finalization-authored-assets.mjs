#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const forge = path.join(root, 'scripts', 'author-final-glb-pack.mjs')
const verify = path.join(root, 'scripts', 'verify-final-glb-pack.mjs')

for (const script of [forge, verify]) {
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(JSON.stringify({
  ok: true,
  sourceId: 'urai-final-glb-production-pack-v1',
  checked: [
    'home-entry-chamber-v1',
    'portal-ring-master-v1',
    'ground-world-terrain-v1',
    'life-map-memory-star-v1',
    'focus-memory-chamber-v1',
    'replay-memory-environment-v1',
    'urai-orb-avatar-v1',
    'passport-status-room-v1',
  ],
  runtimeOwner: 'final-glb-pack',
  visualApproval: false,
  visualApprovalBoundary: 'Exact-head rendered inspection remains required and is not inferred from binary validation.',
}, null, 2))
