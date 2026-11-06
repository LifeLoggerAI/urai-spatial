import { createHash } from 'node:crypto'
import { createReadStream, openSync, closeSync, fstatSync, lstatSync } from 'node:fs'

/**
 * Node/Windows can report path-based st_dev = 0 while fstat on the same
 * handle reports the volume serial. Compare exact bigint file IDs instead
 * of lossy 64-bit Numbers; permit only that Windows-specific dev mismatch.
 * A pair of zero device IDs is ambiguous and must never authenticate a
 * file, even on Windows. Every unsupported ID fails closed and timestamps
 * and link count must remain identical across the same opened descriptor.
 */
export function samePrivateRegularFile(a, b, platform = process.platform) {
  const exact = [a, b].every(s => s?.isFile?.() === true
    && typeof s.dev === 'bigint' && typeof s.ino === 'bigint'
    && typeof s.size === 'bigint' && typeof s.mtimeNs === 'bigint'
    && typeof s.ctimeNs === 'bigint' && typeof s.birthtimeNs === 'bigint'
    && typeof s.nlink === 'bigint')
  if (!exact || a.ino <= 0n || b.ino <= 0n || a.ino !== b.ino) return false
  const sameDevice = (a.dev === b.dev && a.dev > 0n)
    || (platform === 'win32' && ((a.dev === 0n && b.dev > 0n) || (b.dev === 0n && a.dev > 0n)))
  return sameDevice && a.size === b.size && a.mtimeNs === b.mtimeNs
    && a.ctimeNs === b.ctimeNs && a.birthtimeNs === b.birthtimeNs
    && a.nlink === b.nlink
}

/** Hash the same regular source checked by preflight. Never follow a new
 * symlink, a replaced inode, or a file mutated while the digest is read. */
export async function verifiedPrivateFileHash(path, expected) {
  if (typeof path !== 'string' || !expected?.isFile?.() || !samePrivateRegularFile(expected, lstatSync(path, { bigint: true }))) {
    throw new Error('PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
  }
  const fd = openSync(path, 'r')
  try {
    if (!samePrivateRegularFile(expected, fstatSync(fd, { bigint: true }))) throw new Error('PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(path, { fd, autoClose: false })) hash.update(chunk)
    if (!samePrivateRegularFile(expected, fstatSync(fd, { bigint: true })) || !samePrivateRegularFile(expected, lstatSync(path, { bigint: true }))) {
      throw new Error('PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
    }
    return hash.digest('hex')
  } finally { closeSync(fd) }
}
