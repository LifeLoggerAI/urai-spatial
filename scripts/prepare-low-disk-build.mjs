import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const home = os.homedir()

const pathsToRemove = [
  // Next can leave hundreds of MB across server traces/static output. Remove the
  // whole build output before a fresh production build in small preview sandboxes.
  'urai-tier1/.next',
  '.next',
  'urai-tier1/.turbo',
  '.turbo',

  // Test and report artifacts.
  'urai-tier1/coverage',
  'urai-tier1/test-results',
  'urai-tier1/playwright-report',
  'coverage',
  'test-results',
  'playwright-report',

  // Repo-local no-sudo browser-library cache; E2E can recreate it after build.
  '.cache/urai-browser-libs',

  // Playwright browsers are large. Build does not need them, and lock:all runs
  // build before e2e, so free this space now and let e2e recreate only what it needs.
  path.join(home, '.cache', 'ms-playwright'),

  // Common transient browser/build caches in these constrained containers.
  path.join(home, '.cache', 'webpack'),
  path.join(home, '.cache', 'next'),
]

async function rm(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true })
}

async function dirSize(targetPath) {
  let total = 0
  async function walk(current) {
    let entries
    try {
      entries = await fs.readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    await Promise.all(entries.map(async (entry) => {
      const full = path.join(current, entry.name)
      try {
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile()) {
          const stat = await fs.stat(full)
          total += stat.size
        }
      } catch {
        // Ignore disappearing files during cleanup.
      }
    }))
  }
  await walk(targetPath)
  return total
}

function formatMiB(bytes) {
  return `${Math.round(bytes / 1024 / 1024)} MiB`
}

for (const targetPath of pathsToRemove) {
  if (process.env.URAI_LOW_DISK_BUILD_VERBOSE === 'true') {
    const size = await dirSize(targetPath)
    if (size > 0) console.log(`[URAI Spatial] Removing ${targetPath} (${formatMiB(size)})`)
  }
  await rm(targetPath)
}

if (process.env.URAI_LOW_DISK_BUILD_VERBOSE === 'true') {
  console.log('[URAI Spatial] Low-disk build cleanup complete.')
}
