import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

if (!existsSync('package.json')) {
  console.log('No package.json found; nothing to verify.')
  process.exit(0)
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const requestedScripts = ['typecheck', 'test', 'build', 'urai:qa']
const scripts = requestedScripts.filter((name) => typeof pkg.scripts?.[name] === 'string')

let failed = false
for (const script of scripts) {
  const cmd = 'corepack'
  const args = ['pnpm', 'run', script]
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) failed = true
}

if (!scripts.length) console.log('No production verification scripts found.')
process.exit(failed ? 1 : 0)
