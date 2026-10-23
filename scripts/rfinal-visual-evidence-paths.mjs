import { lstatSync, realpathSync } from 'node:fs'
import path from 'node:path'

// The original evidence directory owns only its direct browser-artifacts
// directory and ordinary files inside it. Never follow links or junctions to
// arbitrary external files while certifying rendered screenshot bytes.
export function isOwnedVisualEvidencePath(evidenceDir, target, kind = 'file') {
  if (kind !== 'file' && kind !== 'directory') return false
  const root = path.resolve(evidenceDir)
  const candidate = path.resolve(target)
  const relative = path.relative(root, candidate)
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return false
  const parts = relative.split(path.sep)
  if (parts[0] !== 'browser-artifacts') return false
  if (kind === 'directory' ? parts.length !== 1 : parts.length !== 2) return false
  try {
    const rootStat = lstatSync(root)
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return false
    let cursor = root
    for (let i = 0; i < parts.length; i++) {
      cursor = path.join(cursor, parts[i])
      const stat = lstatSync(cursor)
      if (stat.isSymbolicLink()) return false
      if (i < parts.length - 1 || kind === 'directory') {
        if (!stat.isDirectory()) return false
      } else if (!stat.isFile()) return false
    }
    // Also disallow reparse-point aliases not surfaced as ordinary symlinks.
    const canonicalRoot = realpathSync(root)
    const canonicalTarget = realpathSync(candidate)
    const expected = path.join(canonicalRoot, ...parts)
    return process.platform === 'win32'
      ? canonicalTarget.toLowerCase() === expected.toLowerCase()
      : canonicalTarget === expected
  } catch { return false }
}
