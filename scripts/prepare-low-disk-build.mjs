import fs from 'node:fs/promises'
import process from 'node:process'

const pathsToRemove = [
  'urai-tier1/.next/cache',
  'urai-tier1/.next/server/app-paths-manifest.json.tmp',
  'urai-tier1/.next/server/middleware-manifest.json.tmp',
  'urai-tier1/.next/server/pages-manifest.json.tmp',
  'urai-tier1/.next/static',
  'urai-tier1/.turbo',
  'urai-tier1/coverage',
  'urai-tier1/test-results',
  'urai-tier1/playwright-report',
  '.next/cache',
  '.turbo',
  'coverage',
  'test-results',
  'playwright-report',
]

async function rm(path) {
  await fs.rm(path, { recursive: true, force: true })
}

for (const path of pathsToRemove) {
  await rm(path)
}

if (process.env.URAI_LOW_DISK_BUILD_VERBOSE === 'true') {
  console.log('[URAI Spatial] Low-disk build cleanup complete.')
}
