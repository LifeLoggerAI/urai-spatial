// Fail-closed recovery plan for Git's unstaged, missing tracked files in a
// disposable Windows sparse checkout. This module never alters a repository.
// The caller must separately verify HEAD, the index tree, checkout isolation,
// and that the post-restore status is completely clean.
import path from 'node:path'
import { lstatSync, realpathSync } from 'node:fs'

const HISTORICAL_EXCLUSION = /^(?:[^/]*audit|\.ai-backups|_quarantine)\//
const TIER_HISTORICAL_EXCLUSION = /^urai-tier1\/[^/]*audit\//
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

function safeTrackedPath(value) {
  if (!value || value.startsWith('/') || value.includes('\\')) return false
  const parts = value.split('/')
  return parts.every(part => part && part !== '.' && part !== '..' &&
    !/[<>:"\\|?*\x00-\x1f]/.test(part) && !/[. ]$/.test(part) &&
    !WINDOWS_RESERVED.test(part) && part.toLowerCase() !== '.git')
}

export function planMissingTrackedRepair(porcelain, maxFiles = 5000) {
  if (!Buffer.isBuffer(porcelain)) throw new Error('DIRTY_STATUS_EXPECTED_RAW_BUFFER')
  if (porcelain.length === 0) return Object.freeze({ count: 0, paths: [], pathspecBytes: Buffer.alloc(0) })
  if (porcelain[porcelain.length - 1] !== 0) throw new Error('DIRTY_STATUS_TRUNCATED')
  const entries = porcelain.toString('utf8').slice(0, -1).split('\0')
  if (!entries.length || entries.length > maxFiles) throw new Error('DIRTY_STATUS_TOO_MANY_ENTRIES')
  const seen = new Set()
  const paths = []
  for (const entry of entries) {
    // First status character is the index; second is the worktree.
    // An unstaged deletion is exactly " D path" in porcelain v1 -z.
    if (!entry.startsWith(' D ') || entry.length < 5) {
      throw new Error('DIRTY_SOURCE_NOT_MISSING_ONLY')
    }
    const file = entry.slice(3)
    if (!safeTrackedPath(file)) throw new Error('DIRTY_SOURCE_UNSAFE_PATH')
    if (HISTORICAL_EXCLUSION.test(file) || TIER_HISTORICAL_EXCLUSION.test(file)) {
      throw new Error('DIRTY_SOURCE_EXCLUDED_HISTORICAL_PATH')
    }
    const key = file.toLowerCase()
    if (seen.has(key)) throw new Error('DIRTY_SOURCE_DUPLICATE_OR_COLLIDING_PATH')
    seen.add(key)
    paths.push(file)
  }
  // Literal pathspecs prevent bracket or wildcard expansion; NUL handles spaces.
  const pathspecBytes = Buffer.from(paths.map(file => ':(literal)' + file + '\0').join(''), 'utf8')
  return Object.freeze({ count: paths.length, paths: Object.freeze(paths), pathspecBytes })
}

// Admit only a real, isolated clone. Matching a folder name alone can be
// spoofed by a directory junction or a symlink into the founder's worktree.
// Downloads itself may be redirected; compare canonical paths under its root.
export function isIsolatedRfinalSource(source, downloads) {
  const root = path.resolve(source)
  const home = path.resolve(downloads)
  const relative = path.relative(home, root).replace(/\\/g, '/')
  if (!/^URAI_RFINAL_(?:NATIVE_|V2_|V4_)[^/]*\/source$/.test(relative) ||
      relative === '..' || relative.startsWith('../')) return false
  try {
    const runDir = path.dirname(root)
    const gitDir = path.join(root, '.git')
    for (const dir of [runDir, root, gitDir]) {
      const stat = lstatSync(dir)
      if (!stat.isDirectory() || stat.isSymbolicLink()) return false
    }
    const canonicalHome = realpathSync(home)
    const canonicalRun = realpathSync(runDir)
    const canonicalRoot = realpathSync(root)
    const same = (a, b) => process.platform === 'win32'
      ? a.toLowerCase() === b.toLowerCase() : a === b
    // Reject junction/symlink hops inside the disposable run directory,
    // even if they happen to point at another similarly named checkout.
    return same(canonicalRun, path.join(canonicalHome, path.basename(runDir))) &&
      same(canonicalRoot, path.join(canonicalRun, 'source'))
  } catch { return false }
}
