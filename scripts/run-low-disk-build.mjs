import { spawnSync } from 'node:child_process'
import process from 'node:process'

function run(command, args, env = {}) {
  console.log(`[URAI Spatial] ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('node', ['scripts/prepare-low-disk-build.mjs'], { URAI_LOW_DISK_BUILD_VERBOSE: 'true' })
run('corepack', ['pnpm', '--filter', 'urai-tier1', 'typecheck'])
run('corepack', ['pnpm', '--filter', 'urai-tier1', 'build'])
