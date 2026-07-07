#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const commands = [
  'node scripts/generate-spatial-asset-forge.mjs',
  'node scripts/check-spatial-asset-forge.mjs',
  'node scripts/check-spatial-assets.mjs'
]

for (const command of commands) {
  const result = spawnSync(command, { shell: true, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`command failed: ${command}`)
  }
}

console.log(JSON.stringify({ ok: true, service: 'urai-spatial-asset-pipeline', commands }, null, 2))
