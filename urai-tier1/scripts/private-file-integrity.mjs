import { createHash } from 'node:crypto'
import { createReadStream, openSync, closeSync, fstatSync, lstatSync } from 'node:fs'

function sameFile(a, b) {
  return a.isFile() && b.isFile() && a.dev === b.dev && a.ino === b.ino
    && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs
}

/** Hash the same regular source checked by preflight. Never follow a new
 * symlink, a replaced inode, or a file mutated while the digest is read. */
export async function verifiedPrivateFileHash(path, expected) {
  if (typeof path !== 'string' || !expected?.isFile?.() || !sameFile(expected, lstatSync(path))) {
    throw new Error('PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
  }
  const fd = openSync(path, 'r')
  try {
    if (!sameFile(expected, fstatSync(fd))) throw new Error('PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(path, { fd, autoClose: false })) hash.update(chunk)
    if (!sameFile(expected, fstatSync(fd)) || !sameFile(expected, lstatSync(path))) {
      throw new Error('PRIVATE_SOURCE_CHANGED_DURING_PREFLIGHT')
    }
    return hash.digest('hex')
  } finally { closeSync(fd) }
}
