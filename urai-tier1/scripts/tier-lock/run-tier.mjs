import { spawnSync } from 'node:child_process'

const tier = process.argv[2] ?? 'tier5'
const reportCommand = ['node', ['scripts/tier-lock/write-tier-report.mjs', tier]]

const commands = {
  tier1: [
    ['node', ['scripts/tier-lock/route-audit.mjs']],
    reportCommand,
  ],
  tier2: [
    ['node', ['scripts/tier-lock/route-audit.mjs']],
    ['node', ['scripts/tier-lock/console-warning-audit.mjs']],
    reportCommand,
  ],
  tier3: [
    ['node', ['scripts/tier-lock/route-audit.mjs']],
    ['node', ['scripts/tier-lock/console-warning-audit.mjs']],
    ['pnpm', ['run', 'typecheck']],
    ['pnpm', ['run', 'test:unit']],
    reportCommand,
  ],
  tier4: [
    ['node', ['scripts/tier-lock/route-audit.mjs']],
    ['node', ['scripts/tier-lock/console-warning-audit.mjs']],
    ['node', ['scripts/tier-lock/env-readiness-audit.mjs']],
    ['pnpm', ['run', 'build']],
    reportCommand,
  ],
  tier5: [
    ['node', ['scripts/tier-lock/route-audit.mjs']],
    ['node', ['scripts/tier-lock/console-warning-audit.mjs']],
    ['node', ['scripts/tier-lock/env-readiness-audit.mjs']],
    ['pnpm', ['run', 'typecheck']],
    ['pnpm', ['run', 'test:unit']],
    ['pnpm', ['run', 'build']],
    reportCommand,
  ],
}

const selected = commands[tier]
if (!selected) {
  console.error(`[tier-runner] unknown tier "${tier}". Use tier1, tier2, tier3, tier4, or tier5.`)
  process.exit(1)
}

console.log(`[tier-runner] running ${tier}`)
for (const [cmd, args] of selected) {
  console.log(`[tier-runner] $ ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.error(`[tier-runner] failed: ${cmd} ${args.join(' ')}`)
    process.exit(result.status ?? 1)
  }
}

console.log(`[tier-runner] ${tier} passed`)
