import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const pathsToRemove = [
  'node_modules',
  'urai-tier1/node_modules',
  'apps/functions/node_modules',
  'packages/tier-locks/node_modules',
  'packages/release-tools/node_modules',
  '.next',
  'urai-tier1/.next',
  'test-results',
  'playwright-report',
  'coverage',
  'urai-tier1/coverage',
]

async function removePath(path) {
  try {
    await fs.rm(path, { recursive: true, force: true })
    console.log(`[URAI Spatial clean] Removed ${path}`)
  } catch (error) {
    console.warn(`[URAI Spatial clean] Could not remove ${path}: ${error.message}`)
  }
}

function runOptional(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })

  if (result.status === 0) {
    if (result.stdout.trim()) console.log(result.stdout.trim())
    return
  }

  const detail = result.stderr?.trim() || result.stdout?.trim() || `${command} exited with ${result.status}`
  console.warn(`[URAI Spatial clean] Optional cleanup skipped: ${detail}`)
}

console.log('[URAI Spatial clean] Removing generated install/build/test artifacts.')
for (const path of pathsToRemove) {
  await removePath(path)
}

console.log('[URAI Spatial clean] Attempting optional pnpm store prune.')
runOptional('pnpm', ['store', 'prune'])

console.log('[URAI Spatial clean] Complete. Re-run: corepack pnpm install')
