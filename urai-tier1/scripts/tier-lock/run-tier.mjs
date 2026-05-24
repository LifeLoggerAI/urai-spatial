import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const tier = process.argv[2] ?? 'tier5'
const repoRoot = path.resolve(process.cwd(), '..')

function nodeCommand(args) {
  return [process.execPath, args, 'node']
}

function pnpmCommand(args) {
  const candidates = [
    process.env.npm_execpath && /pnpm/i.test(process.env.npm_execpath) ? process.env.npm_execpath : null,
    path.join(repoRoot, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    path.join(repoRoot, 'node_modules', '.pnpm', 'pnpm@10.0.0', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  ].filter(Boolean)

  const entrypoint = candidates.find((candidate) => fs.existsSync(candidate))
  if (entrypoint) return [process.execPath, [entrypoint, ...args], 'pnpm']
  return ['pnpm', args, 'pnpm']
}

const reportCommand = nodeCommand(['scripts/tier-lock/write-tier-report.mjs', tier])

const commands = {
  tier1: [
    nodeCommand(['scripts/tier-lock/route-audit.mjs']),
    reportCommand,
  ],
  tier2: [
    nodeCommand(['scripts/tier-lock/route-audit.mjs']),
    nodeCommand(['scripts/tier-lock/console-warning-audit.mjs']),
    reportCommand,
  ],
  tier3: [
    nodeCommand(['scripts/tier-lock/route-audit.mjs']),
    nodeCommand(['scripts/tier-lock/console-warning-audit.mjs']),
    pnpmCommand(['run', 'typecheck']),
    pnpmCommand(['run', 'test:unit']),
    reportCommand,
  ],
  tier4: [
    nodeCommand(['scripts/tier-lock/route-audit.mjs']),
    nodeCommand(['scripts/tier-lock/console-warning-audit.mjs']),
    nodeCommand(['scripts/tier-lock/env-readiness-audit.mjs']),
    pnpmCommand(['run', 'build']),
    reportCommand,
  ],
  tier5: [
    nodeCommand(['scripts/tier-lock/route-audit.mjs']),
    nodeCommand(['scripts/tier-lock/console-warning-audit.mjs']),
    nodeCommand(['scripts/tier-lock/env-readiness-audit.mjs']),
    pnpmCommand(['run', 'typecheck']),
    pnpmCommand(['run', 'test:unit']),
    pnpmCommand(['run', 'build']),
    reportCommand,
  ],
}

const selected = commands[tier]
if (!selected) {
  console.error(`[tier-runner] unknown tier "${tier}". Use tier1, tier2, tier3, tier4, or tier5.`)
  process.exit(1)
}

console.log(`[tier-runner] running ${tier}`)
for (const [cmd, args, displayCommand = cmd] of selected) {
  console.log(`[tier-runner] $ ${displayCommand} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    console.error(`[tier-runner] failed: ${displayCommand} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

console.log(`[tier-runner] ${tier} passed`)
