#!/usr/bin/env node
/**
 * Read NUL-separated git ls-tree paths from standard input and evaluate the exact
 * Git sparse cone selection before asking Git for a Windows checkout.
 * Does not edit the repository, relax NTFS protection or touch the network.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SPARSE_DIRS = Object.freeze([
  'apps/functions', 'packages/tier-locks', 'packages/release-tools',
  'distribution/android-shell', 'distribution/ios-shell',
  'scripts', 'tests', 'tools', 'patches', 'src',
  'urai-tier1/src', 'urai-tier1/public', 'urai-tier1/scripts',
  'urai-tier1/tests', 'urai-tier1/tools', 'urai-tier1/brand',
  'urai-tier1/demo', 'urai-tier1/internal', 'urai-tier1/docs',
  'urai-tier1/launch-pack', 'urai-tier1/release-authority',
])
const RESERVED = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i
const FORBIDDEN = /[<>:"\\|?*\x00-\x1f]/
const MAX_PATH = 245 // Conservative with a short working directory, not a Windows API bypass.

export function selectedForCone(file, dirs = SPARSE_DIRS) {
  if (typeof file !== 'string' || !file || file.startsWith('/') || file.includes('\\')) return false
  const lastSlash = file.lastIndexOf('/')
  if (lastSlash < 0) return true // cone mode includes root files, not root directories
  const parent = file.slice(0, lastSlash)
  return dirs.some(dir => parent === dir || parent.startsWith(`${dir}/`) || dir.startsWith(`${parent}/`))
}
export function windowsPathProblem(file, checkoutRoot = 'C:\\ur\\g') {
  const parts = file.split('/')
  for (const part of parts) {
    if (!part || part === '.' || part === '..') return 'UNSAFE_EMPTY_OR_TRAVERSAL_COMPONENT'
    if (FORBIDDEN.test(part)) return 'WINDOWS_FORBIDDEN_FILENAME_CHARACTER'
    if (/[. ]$/.test(part)) return 'WINDOWS_TRAILING_DOT_OR_SPACE'
    if (RESERVED.test(part)) return 'WINDOWS_RESERVED_DEVICE_NAME'
  }
  if (path.win32.join(checkoutRoot, ...parts).length > MAX_PATH) return 'WINDOWS_CONSERVATIVE_PATH_LENGTH_EXCEEDED'
  return null
}
export function inspectTreePaths(paths, checkoutRoot, dirs = SPARSE_DIRS) {
  const included = []
  const rejected = []
  const excludedInvalid = []
  const caseMap = new Map()
  for (const entry of paths) {
    if (!entry) continue
    const selected = selectedForCone(entry, dirs)
    const issue = windowsPathProblem(entry, checkoutRoot)
    if (!selected) {
      if (issue) excludedInvalid.push({ path: entry, issue })
      continue
    }
    if (issue) { rejected.push({ path: entry, issue }); continue }
    const canonical = entry.normalize('NFC').toLowerCase()
    if (caseMap.has(canonical) && caseMap.get(canonical) !== entry) {
      rejected.push({ path: entry, issue: 'WINDOWS_CASE_INSENSITIVE_COLLISION', collidesWith: caseMap.get(canonical) })
    } else {
      caseMap.set(canonical, entry)
    }
    included.push(entry)
  }
  return { status: rejected.length ? 'WINDOWS_SPARSE_CHECKOUT_REFUSED' : 'WINDOWS_SPARSE_PATH_PREFLIGHT_PASSED',
    checkedFiles: included.length + rejected.length, invalidIncluded: rejected.length,
    invalidExcluded: excludedInvalid.length, includeDirectories: dirs, problems: rejected.slice(0, 35),
    excludedExamples: excludedInvalid.slice(0, 8), release: 'NO-GO/HOLD' }
}

function arg(name) { const idx = process.argv.indexOf(name); return idx < 0 ? null : process.argv[idx + 1] }
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const root = arg('--checkout-root')
  if (!root || process.argv.includes('--help')) {
    console.error('Usage: git ls-tree -rz --name-only SHA | node genesis-windows-path-preflight.mjs --checkout-root C:\\ur\\g')
    process.exitCode = 2
  } else {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    const paths = Buffer.concat(chunks).toString('utf8').split('\u0000').filter(Boolean)
    const report = inspectTreePaths(paths, root)
    process.stdout.write(JSON.stringify(report, null, 2) + '\n')
    if (report.invalidIncluded > 0) process.exitCode = 2
  }
}
