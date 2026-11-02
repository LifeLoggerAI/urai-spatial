/** Fail closed when private Genesis evidence could resolve through a symlink or into Git. */
import { lstat } from 'node:fs/promises'
import path from 'node:path'

export async function assertPrivateEvidenceDirectory(directory, { gitError, symlinkError }) {
  if (typeof directory !== 'string' || !path.isAbsolute(directory) ||
      typeof gitError !== 'string' || !gitError ||
      typeof symlinkError !== 'string' || !symlinkError) {
    throw Error('PRIVATE_EVIDENCE_PATH_GUARD_INVALID_INPUT')
  }
  for (let current = path.resolve(directory); ; current = path.dirname(current)) {
    const entry = await lstat(current).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error))
    if (entry?.isSymbolicLink()) throw Error(symlinkError)
    const marker = await lstat(path.join(current, '.git')).catch(error =>
      error.code === 'ENOENT' || error.code === 'ENOTDIR' ? null : Promise.reject(error))
    if (marker) throw Error(gitError)
    if (path.dirname(current) === current) return
  }
}
