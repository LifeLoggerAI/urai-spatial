import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

const defaultMinimumMb = 4096
const minimumMb = Number.parseInt(process.env.URAI_MIN_INSTALL_FREE_MB ?? String(defaultMinimumMb), 10)

function fail(message) {
  console.error(`\n[URAI Spatial install] ${message}`)
  console.error('Free disk space or set URAI_MIN_INSTALL_FREE_MB to a lower value only if you know the install can fit.')
  console.error('Suggested cleanup: remove stale node_modules, .next, Playwright browser caches, and old package-manager caches before retrying.')
  console.error('')
  process.exit(1)
}

function prepareGitHubPlaywrightApt() {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.platform !== 'linux') return

  // GitHub-hosted Ubuntu runners can carry a Google Chrome apt source that is
  // unrelated to Playwright's Chromium package. A transient repository metadata
  // mismatch can make apt fail before Playwright installs Chromium dependencies.
  // Disable only that Chrome source for this ephemeral runner job; governed
  // browser workflows still execute Playwright's mandatory --with-deps Chromium
  // install and all browser/pixel tests exactly as before.
  const candidates = [
    '/etc/apt/sources.list.d/google-chrome.list',
    '/etc/apt/sources.list.d/google-chrome.sources',
  ]

  for (const source of candidates) {
    if (!existsSync(source)) continue

    let contents = ''
    try {
      contents = readFileSync(source, 'utf8')
    } catch (error) {
      console.warn(`[URAI Spatial install] Could not inspect ${source}; leaving apt source unchanged.`)
      console.warn(String(error?.message || error))
      continue
    }

    if (!contents.includes('dl.google.com/linux/chrome-stable/deb')) continue

    const disabled = `${source}.urai-disabled`
    const result = spawnSync('sudo', ['mv', '-f', source, disabled], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (result.status === 0) {
      console.log(`[URAI Spatial install] Disabled transient Google Chrome apt source for this GitHub runner: ${source}`)
      continue
    }

    console.warn(`[URAI Spatial install] Could not disable transient Google Chrome apt source: ${source}`)
    if (result.stderr) console.warn(result.stderr.trim())
  }
}

if (!Number.isFinite(minimumMb) || minimumMb <= 0) {
  fail(`Invalid URAI_MIN_INSTALL_FREE_MB value: ${process.env.URAI_MIN_INSTALL_FREE_MB}`)
}

const result = spawnSync('df', ['-Pk', '.'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})

if (result.status !== 0) {
  console.warn('[URAI Spatial install] Could not inspect free disk space with df; continuing install preflight.')
  if (result.stderr) console.warn(result.stderr.trim())
  prepareGitHubPlaywrightApt()
  process.exit(0)
}

const lines = result.stdout.trim().split(/\r?\n/)
const data = lines.at(-1)?.trim().split(/\s+/)
const availableKb = Number.parseInt(data?.[3] ?? '0', 10)
const availableMb = Math.floor(availableKb / 1024)

if (!Number.isFinite(availableMb) || availableMb <= 0) {
  console.warn('[URAI Spatial install] Could not parse free disk space; continuing install preflight.')
  prepareGitHubPlaywrightApt()
  process.exit(0)
}

if (availableMb < minimumMb) {
  fail(`Not enough free disk space for install. Required at least ${minimumMb} MB; found ${availableMb} MB.`)
}

console.log(`[URAI Spatial install] Free disk preflight passed: ${availableMb} MB available.`)
prepareGitHubPlaywrightApt()
