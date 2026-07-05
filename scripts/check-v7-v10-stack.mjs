#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const commands = [
  ['node', ['scripts/check-v7-scene-continuity.mjs']],
  ['node', ['scripts/product-evolution/observe.mjs']],
  ['node', ['scripts/product-evolution/detect-gaps.mjs']],
  ['node', ['scripts/product-evolution/propose.mjs']],
  ['node', ['scripts/ecosystem/check-registry.mjs']],
  ['node', ['scripts/ecosystem/collect-evidence.mjs']],
  ['node', ['scripts/ecosystem/report.mjs']],
  ['node', ['scripts/simulation/run-v10-scenario.mjs', '--example']],
  ['node', ['scripts/simulation/check-safety-boundary.mjs']],
]

for (const [cmd, args] of commands) {
  console.log(`[v7-v10-stack] ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('[v7-v10-stack] V7-V10 scaffold gates passed')
