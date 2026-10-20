import process from 'node:process'
import { availableDiskKiB, assessInstallDiskBudget } from './install-disk-budget.mjs'

function fail(message) {
  console.error(`\n[URAI Spatial install] ${message}`)
  console.error('Free disk space or set URAI_MIN_INSTALL_FREE_MB to a lower value only if you know the install can fit.')
  console.error('Suggested cleanup: remove stale node_modules, .next, Playwright browser caches, and old package-manager caches before retrying.')
  console.error('')
  process.exit(1)
}

let budget
try {
  budget = assessInstallDiskBudget(
    availableDiskKiB({ location: process.cwd() }),
    process.env.URAI_MIN_INSTALL_FREE_MB ?? '4096',
  )
} catch (error) {
  const reason = error?.message || String(error)
  if (reason === 'INVALID_DISK_BUDGET') {
    fail(`Invalid URAI_MIN_INSTALL_FREE_MB value: ${process.env.URAI_MIN_INSTALL_FREE_MB}`)
  }
  fail(`Could not inspect free disk space reliably: ${reason}`)
}

if (!budget.sufficient) {
  fail(`Not enough free disk space for install. Required at least ${budget.minimumMb} MB; found ${budget.availableMb} MB.`)
}

console.log(`[URAI Spatial install] Free disk preflight passed: ${budget.availableMb} MB available.`)
